import { and, desc, eq, isNull, lte, max, or } from "drizzle-orm";
import { z } from "zod";
import { createEmptyCard, Rating, FSRS, generatorParameters } from "ts-fsrs";
import type { Card, RecordLogItem, RecordLog, Grade } from "ts-fsrs";

import { hackclubLightModel, hackclubMainModel } from "@/lib/ai/hackclub";
import { auth } from "@/lib/auth";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
	buildCardCountPrompt,
	buildDeckNamePrompt,
	buildDeckDescriptionPrompt,
	buildFlashcardGenerationPrompt,
	getAISettings,
	getCardCountOptions,
	getDifficultyOptions,
} from "@/server/config/ai-settings";
import { cardReviews, cards, decks } from "@/server/db/schema";
import { generateObject } from "ai";

// FSRS scheduler instance with default parameters
const fsrsParams = generatorParameters({ enable_fuzz: true });
const fsrsScheduler = new FSRS(fsrsParams);

// Convert UI rating (1-4) to ts-fsrs Grade type
function mapUIRatingToFSRS(uiRating: number): Grade {
	// UI: 1=Again, 2=Hard, 3=Good, 4=Easy
	// ts-fsrs: Rating.Again=1, Rating.Hard=2, Rating.Good=3, Rating.Easy=4
	// Grade excludes Rating.Manual (0)
	switch (uiRating) {
		case 1: return Rating.Again as Grade;
		case 2: return Rating.Hard as Grade;
		case 3: return Rating.Good as Grade;
		case 4: return Rating.Easy as Grade;
		default: return Rating.Good as Grade;
	}
}

// Build Card state from card reviews by replaying them
async function buildCardFromReviews(ctx: { db: typeof import("@/server/db").db }, cardId: string, userId: string, cardCreatedAt: Date): Promise<Card> {
	const reviews = await ctx.db.query.cardReviews.findMany({
		where: and(eq(cardReviews.cardId, cardId), eq(cardReviews.userId, userId)),
		orderBy: cardReviews.reviewedAt,
	});

	// Start with an empty card created at the card's creation date
	let card = createEmptyCard(cardCreatedAt);

	// Replay all reviews to get the current card state
	for (const review of reviews) {
		const grade = mapUIRatingToFSRS(review.rating);
		const schedulingCards: RecordLog = fsrsScheduler.repeat(card, review.reviewedAt);
		card = schedulingCards[grade].card;
	}

	return card;
}

export const flashcardsRouter = createTRPCRouter({
	// AI Settings
	getAISettings: publicProcedure.query(async () => {
		const settings = getAISettings();
		return {
			models: settings.models,
			cardCountOptions: getCardCountOptions(),
			difficultyOptions: getDifficultyOptions(),
			defaultCardCount: settings.flashcards.defaultCardCount,
			defaultDifficulty: settings.flashcards.defaultDifficulty,
		};
	}),

	// Decks
	getDecks: publicProcedure.query(async ({ ctx }) => {
		const session = await auth.api.getSession({ headers: ctx.headers });
		if (!session) return [];
		const rows = await ctx.db.query.decks.findMany({
			where: eq(decks.userId, session.user.id),
			orderBy: (d, { asc }) => asc(d.createdAt),
		});
		return rows;
	}),

	createDeck: publicProcedure
		.input(
			z.object({ name: z.string().min(1), description: z.string().optional() }),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			const [row] = await ctx.db
				.insert(decks)
				.values({
					name: input.name,
					description: input.description,
					userId: session.user.id,
				})
				.returning();
			return row;
		}),

	updateDeck: publicProcedure
		.input(
			z.object({
				deckId: z.string().uuid(),
				name: z.string().min(1),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			// Ensure deck belongs to user
			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, session.user.id),
				),
			});
			if (!deckRow) throw new Error("Deck not found");

			const [row] = await ctx.db
				.update(decks)
				.set({
					name: input.name,
					description: input.description,
					updatedAt: new Date(),
				})
				.where(eq(decks.id, input.deckId))
				.returning();
			return row;
		}),

	deleteDeck: publicProcedure
		.input(z.object({ deckId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			// Ensure deck belongs to user
			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, session.user.id),
				),
			});
			if (!deckRow) throw new Error("Deck not found");

			// Delete the deck (cards will be cascade deleted due to foreign key constraint)
			await ctx.db.delete(decks).where(eq(decks.id, input.deckId));
			return { success: true };
		}),

	// Cards
	getCards: publicProcedure
		.input(z.object({ deckId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) return [];
			const rows = await ctx.db.query.cards.findMany({
				where: eq(cards.deckId, input.deckId),
				orderBy: (c, { asc }) => asc(c.createdAt),
			});
			return rows;
		}),

	createCard: publicProcedure
		.input(
			z.object({
				deckId: z.string().uuid(),
				front: z.string().min(1),
				back: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			// Ensure deck belongs to user
			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, session.user.id),
				),
			});
			if (!deckRow) throw new Error("Deck not found");
			const [row] = await ctx.db
				.insert(cards)
				.values({ deckId: input.deckId, front: input.front, back: input.back })
				.returning();
			return row;
		}),

	updateCard: publicProcedure
		.input(
			z.object({
				cardId: z.string().uuid(),
				front: z.string().min(1),
				back: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			// Ensure card belongs to a deck owned by the user
			const cardRow = await ctx.db.query.cards.findFirst({
				where: eq(cards.id, input.cardId),
			});
			if (!cardRow) throw new Error("Card not found");

			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, cardRow.deckId),
					eq(decks.userId, session.user.id),
				),
			});
			if (!deckRow) throw new Error("Forbidden");

			const [row] = await ctx.db
				.update(cards)
				.set({ front: input.front, back: input.back, updatedAt: new Date() })
				.where(eq(cards.id, input.cardId))
				.returning();
			return row;
		}),

	deleteCard: publicProcedure
		.input(z.object({ cardId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			// Ensure card belongs to a deck owned by the user
			const cardRow = await ctx.db.query.cards.findFirst({
				where: eq(cards.id, input.cardId),
			});
			if (!cardRow) throw new Error("Card not found");

			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, cardRow.deckId),
					eq(decks.userId, session.user.id),
				),
			});
			if (!deckRow) throw new Error("Forbidden");

			// Delete the card (reviews will be cascade deleted due to foreign key constraint)
			await ctx.db.delete(cards).where(eq(cards.id, input.cardId));
			return { success: true };
		}),

	// Review queue: due cards for the user (from their decks)
	getDailyQueue: publicProcedure
		.input(
			z
				.object({ 
					limit: z.number().min(1).max(100).default(20),
					deckId: z.string().uuid().optional()
				})
				.default({ limit: 20 }),
		)
		.query(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) return [];

			const now = new Date();

			// Build where conditions
			const whereConditions = [lte(cards.due, now)];
			
			// If deckId is provided, add it to the where conditions
			if (input.deckId) {
				whereConditions.push(eq(cards.deckId, input.deckId));
			}

			// Cards in user's decks that are due for review
			const rows = await ctx.db
				.select({
					card: cards,
				})
				.from(cards)
				.innerJoin(
					decks,
					and(eq(decks.id, cards.deckId), eq(decks.userId, session.user.id)),
				)
				.where(and(...whereConditions))
				.orderBy(cards.due)
				.limit(input.limit);

			return rows.map((r) => r.card);
		}),

	submitReview: publicProcedure
		.input(
			z.object({
				cardId: z.string().uuid(),
				rating: z.number().min(1).max(4), // FSRS uses 1-4 rating
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");
			
			// Verify card belongs to a deck owned by the user
			const cardRow = await ctx.db.query.cards.findFirst({
				where: eq(cards.id, input.cardId),
			});
			if (!cardRow) throw new Error("Card not found");

			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, cardRow.deckId),
					eq(decks.userId, session.user.id),
				),
			});
			if (!deckRow) throw new Error("Forbidden");

			// Build current card state from existing reviews
			const currentCard = await buildCardFromReviews(ctx, input.cardId, session.user.id, cardRow.createdAt);
			
			// Get the rating for this review
			const rating = mapUIRatingToFSRS(input.rating);
			
			// Get scheduling options for this review
			const now = new Date();
			const schedulingCards: RecordLog = fsrsScheduler.repeat(currentCard, now);
			
			// Get the updated card and log for the selected rating
			const selectedScheduling = schedulingCards[rating];
			const updatedCard = selectedScheduling.card;
			const reviewLog = selectedScheduling.log;

			// Insert the review record
			const [reviewRow] = await ctx.db
				.insert(cardReviews)
				.values({
					cardId: input.cardId,
					userId: session.user.id,
					rating: input.rating,
				})
				.returning();

			// Update the card's state with new FSRS values
			await ctx.db
				.update(cards)
				.set({
					due: updatedCard.due,
					stability: updatedCard.stability,
					difficulty: updatedCard.difficulty,
					elapsed_days: updatedCard.elapsed_days,
					scheduled_days: updatedCard.scheduled_days,
					learning_steps: updatedCard.learning_steps,
					reps: updatedCard.reps,
					lapses: updatedCard.lapses,
					state: updatedCard.state,
					last_review: updatedCard.last_review,
				})
				.where(eq(cards.id, input.cardId));

			return reviewRow;
		}),

	// AI Generation
	generateFlashcards: publicProcedure
		.input(
			z.object({
				deckId: z.string().uuid().optional(),
				topic: z.string().min(1).max(getAISettings().generation.maxTopicLength),
				count: z
					.number()
					.min(getAISettings().flashcards.minCardCount)
					.max(getAISettings().flashcards.maxCardCount)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) throw new Error("Unauthorized");

			let deckId = input.deckId;

			// If no deckId provided, create a new deck with auto-generated name and description
			if (!deckId) {
				console.log("Generating deck name and description with light model...");

				// Generate deck name and description using light model
				const deckMetadataSchema = z.object({
					name: z
						.string()
						.describe(
							"A concise, descriptive name for the flashcard deck (2-6 words)",
						),
					description: z
						.string()
						.describe(
							"A helpful, informative description explaining what the deck covers (1-2 sentences)",
						),
				});

				const deckNamePrompt = buildDeckNamePrompt(input.topic);
				const deckDescriptionPrompt = buildDeckDescriptionPrompt(input.topic);

				// Generate name and description in parallel for efficiency
				const [deckNameResult, deckDescriptionResult] = await Promise.all([
					generateObject({
						model: hackclubLightModel,
						schema: z.object({ name: z.string() }),
						prompt: deckNamePrompt,
					}),
					generateObject({
						model: hackclubLightModel,
						schema: z.object({ description: z.string() }),
						prompt: deckDescriptionPrompt,
					}),
				]);

				console.log(`Generated deck name: "${deckNameResult.object.name}"`);
				console.log(`Generated deck description: "${deckDescriptionResult.object.description}"`);

				// Create the deck with generated name and description
				const insertedDecks = await ctx.db
					.insert(decks)
					.values({
						name: deckNameResult.object.name,
						description: deckDescriptionResult.object.description,
						userId: session.user.id,
					})
					.returning();

				const deck = insertedDecks[0];
				if (!deck) {
					throw new Error("Failed to create deck");
				}

				deckId = deck.id;
				console.log(`Created new deck: "${deck.name}" (${deck.id})`);
			} else {
				// Ensure existing deck belongs to user
				const deckRow = await ctx.db.query.decks.findFirst({
					where: and(eq(decks.id, deckId), eq(decks.userId, session.user.id)),
				});
				if (!deckRow) throw new Error("Deck not found");
			}

			// Get AI settings and determine card count
			const aiSettings = getAISettings();
			let cardCount =
				input.count ||
				(aiSettings.flashcards.defaultCardCount === "auto"
					? 10
					: aiSettings.flashcards.defaultCardCount);

			if (!input.count) {
				console.log("Auto-determining optimal card count with light model...");

				const cardCountSchema = z.object({
					count: z
						.number()
						.min(aiSettings.flashcards.minCardCount)
						.max(aiSettings.flashcards.maxCardCount)
						.describe(
							`The optimal number of flashcards for this topic (${aiSettings.flashcards.minCardCount}-${aiSettings.flashcards.maxCardCount})`,
						),
					reasoning: z
						.string()
						.describe("Brief explanation of why this number is optimal"),
				});

				const cardCountPrompt = buildCardCountPrompt(input.topic);

				const cardCountResult = await generateObject({
					model: hackclubLightModel,
					schema: cardCountSchema,
					prompt: cardCountPrompt,
				});

				cardCount = cardCountResult.object.count;
				console.log(
					`Auto-determined card count: ${cardCount} (${cardCountResult.object.reasoning})`,
				);
			}

			const flashcardSchema = z.object({
				flashcards: z
					.array(
						z.object({
							front: z
								.string()
								.describe("The question or prompt for the flashcard"),
							back: z
								.string()
								.describe("The answer or explanation for the flashcard"),
						}),
					)
					.describe("An array of flashcards generated from the topic"),
			});

			const prompt = buildFlashcardGenerationPrompt(input.topic, cardCount);

			// Generate flashcards using GPT OSS 120B
			console.log("Generating flashcards with GPT OSS 120B...");

			const result = await generateObject({
				model: hackclubMainModel,
				schema: flashcardSchema,
				prompt,
			});

			console.log("AI generation successful, inserting cards...");

			// Insert generated flashcards into the database
			const generatedCards = [];
			for (const flashcard of result.object.flashcards) {
				const [card] = await ctx.db
					.insert(cards)
					.values({
						deckId: deckId,
						front: flashcard.front,
						back: flashcard.back,
					})
					.returning();
				generatedCards.push(card);
			}

			console.log(
				`Successfully generated ${generatedCards.length} flashcards using GPT OSS 120B`,
			);
			return {
				success: true,
				cardsGenerated: generatedCards.length,
				cards: generatedCards,
				modelUsed: "GPT OSS 120B",
				deckId: deckId,
			};
		}),
});
