import { and, desc, eq, isNull, lte, max, or } from "drizzle-orm";
import { z } from "zod";
import { FSRS, FSRSItem, FSRSReview, MemoryState } from "fsrs-rs-nodejs";

import { hackclubLightModel, hackclubMainModel } from "@/lib/ai/hackclub";
import { auth } from "@/lib/auth";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
	buildCardCountPrompt,
	buildDeckNamePrompt,
	buildFlashcardGenerationPrompt,
	getAISettings,
	getCardCountOptions,
	getDifficultyOptions,
} from "@/server/config/ai-settings";
import { cardReviews, cards, decks } from "@/server/db/schema";
import { generateObject } from "ai";

// FSRS scheduler instance with default parameters
const fsrs = new FSRS();

// Convert FSRS rating (1-4) from UI rating (1-5)
function mapUIRatingToFSRS(uiRating: number): number {
	// UI: 1=Again, 2=Hard, 3=Good, 4=Easy, 5=Easy
	// FSRS: 1=Again, 2=Hard, 3=Good, 4=Easy
	return Math.min(uiRating, 4);
}

// Build FSRSItem from card reviews
async function buildFSRSItem(ctx: any, cardId: string, userId: string): Promise<FSRSItem> {
	const reviews = await ctx.db.query.cardReviews.findMany({
		where: and(eq(cardReviews.cardId, cardId), eq(cardReviews.userId, userId)),
		orderBy: cardReviews.reviewedAt,
	});

	const fsrsReviews = reviews.map((review, index) => {
		const deltaT = index === 0 ? 0 : 
			Math.floor((review.reviewedAt.getTime() - reviews[index - 1].reviewedAt.getTime()) / (1000 * 60 * 60 * 24));
		return new FSRSReview(review.rating, deltaT);
	});

	return new FSRSItem(fsrsReviews);
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

			// Build FSRS item from existing reviews
			const fsrsItem = await buildFSRSItem(ctx, input.cardId, session.user.id);
			
			// Get current memory state (null if no reviews yet)
			const currentMemoryState = fsrsItem.reviews.length > 0 ? 
				fsrs.memoryState(fsrsItem) : null;

			// Calculate days elapsed since last review or card creation
			const lastReviewDate = fsrsItem.reviews.length > 0 ? 
				(await ctx.db.query.cardReviews.findFirst({
					where: and(eq(cardReviews.cardId, input.cardId), eq(cardReviews.userId, session.user.id)),
					orderBy: (r, { desc }) => desc(r.reviewedAt),
				}))?.reviewedAt : cardRow.createdAt;
			
			const daysElapsed = lastReviewDate ? 
				Math.floor((Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

			// Get next states from FSRS
			const nextStates = fsrs.nextStates(currentMemoryState, 0.9, daysElapsed);
			
			// Select the appropriate state based on rating
			const selectedState = input.rating === 1 ? nextStates.again :
				input.rating === 2 ? nextStates.hard :
				input.rating === 3 ? nextStates.good :
				nextStates.easy;

			// Calculate next due date
			const nextDue = new Date(Date.now() + selectedState.interval * 24 * 60 * 60 * 1000);

			// Insert the review record
			const [reviewRow] = await ctx.db
				.insert(cardReviews)
				.values({
					cardId: input.cardId,
					userId: session.user.id,
					rating: input.rating,
				})
				.returning();

			// Update the card's due date and FSRS state
			await ctx.db
				.update(cards)
				.set({
					due: nextDue,
					stability: selectedState.memory.stability,
					difficulty: selectedState.memory.difficulty,
					reps: (cardRow.reps || 0) + 1,
					lapses: input.rating === 1 ? (cardRow.lapses || 0) + 1 : cardRow.lapses,
					last_review: new Date(),
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

			// If no deckId provided, create a new deck with auto-generated name
			if (!deckId) {
				console.log("Generating deck name with light model...");

				// Generate deck name using light model
				const deckNameSchema = z.object({
					name: z
						.string()
						.describe(
							"A concise, descriptive name for the flashcard deck (2-6 words)",
						),
				});

				const deckNamePrompt = buildDeckNamePrompt(input.topic);

				const deckNameResult = await generateObject({
					model: hackclubLightModel,
					schema: deckNameSchema,
					prompt: deckNamePrompt,
				});

				console.log(`Generated deck name: "${deckNameResult.object.name}"`);

				// Create the deck with generated name
				const insertedDecks = await ctx.db
					.insert(decks)
					.values({
						name: deckNameResult.object.name,
						description: `AI-generated flashcards about: ${input.topic.substring(0, 100)}${input.topic.length > 100 ? "..." : ""}`,
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
