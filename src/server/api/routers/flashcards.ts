import { and, count, desc, eq, isNull, lte, max, or } from "drizzle-orm";
import { FSRS, Rating, createEmptyCard, generatorParameters } from "ts-fsrs";
import type { Card, Grade, RecordLog, RecordLogItem } from "ts-fsrs";
import { z } from "zod";

import { hackclubLightModel, hackclubMainModel } from "@/lib/ai/hackclub";
import { auth } from "@/lib/auth";
import { processMarkdownImages } from "@/lib/cdn-upload";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
import {
	buildCardCountPrompt,
	buildDeckDescriptionPrompt,
	buildDeckNamePrompt,
	buildFlashcardConversionPrompt,
	buildFlashcardGenerationFromNotesPrompt,
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
		case 1:
			return Rating.Again as Grade;
		case 2:
			return Rating.Hard as Grade;
		case 3:
			return Rating.Good as Grade;
		case 4:
			return Rating.Easy as Grade;
		default:
			return Rating.Good as Grade;
	}
}

// Build Card state from card reviews by replaying them
async function buildCardFromReviews(
	ctx: { db: typeof import("@/server/db").db },
	cardId: string,
	userId: string,
	cardCreatedAt: Date,
): Promise<Card> {
	const reviews = await ctx.db.query.cardReviews.findMany({
		where: and(eq(cardReviews.cardId, cardId), eq(cardReviews.userId, userId)),
		orderBy: cardReviews.reviewedAt,
	});

	// Start with an empty card created at the card's creation date
	let card = createEmptyCard(cardCreatedAt);

	// Replay all reviews to get the current card state
	for (const review of reviews) {
		const grade = mapUIRatingToFSRS(review.rating);
		const schedulingCards: RecordLog = fsrsScheduler.repeat(
			card,
			review.reviewedAt,
		);
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
	getDecks: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.decks.findMany({
			where: eq(decks.userId, ctx.session.user.id),
			orderBy: (d, { asc }) => asc(d.createdAt),
		});
		return rows;
	}),

	getStudyingDecks: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.decks.findMany({
			where: and(
				eq(decks.userId, ctx.session.user.id),
				eq(decks.studying, true),
			),
			orderBy: (d, { asc }) => asc(d.createdAt),
		});
		return rows;
	}),

	createDeck: protectedProcedure
		.input(
			z.object({ name: z.string().min(1), description: z.string().optional() }),
		)
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.insert(decks)
				.values({
					name: input.name,
					description: input.description,
					userId: ctx.session.user.id,
				})
				.returning();
			return row;
		}),

	updateDeck: protectedProcedure
		.input(
			z.object({
				deckId: z.string().uuid(),
				name: z.string().min(1),
				description: z.string().optional(),
				studying: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure deck belongs to user
			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deckRow) throw new Error("Deck not found");

			const [row] = await ctx.db
				.update(decks)
				.set({
					name: input.name,
					description: input.description,
					studying: input.studying,
					updatedAt: new Date(),
				})
				.where(eq(decks.id, input.deckId))
				.returning();
			return row;
		}),

	deleteDeck: protectedProcedure
		.input(z.object({ deckId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Ensure deck belongs to user
			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deckRow) throw new Error("Deck not found");

			// Delete the deck (cards will be cascade deleted due to foreign key constraint)
			await ctx.db.delete(decks).where(eq(decks.id, input.deckId));
			return { success: true };
		}),

	// Cards
	getCards: protectedProcedure
		.input(z.object({ deckId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			// First verify the deck belongs to the user
			const deck = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deck) throw new Error("Deck not found");

			const rows = await ctx.db.query.cards.findMany({
				where: eq(cards.deckId, input.deckId),
				orderBy: (c, { asc }) => asc(c.createdAt),
			});
			return rows;
		}),

	createCard: protectedProcedure
		.input(
			z.object({
				deckId: z.string().uuid(),
				front: z.string().min(1),
				back: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure deck belongs to user
			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, input.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deckRow) throw new Error("Deck not found");

			// Process markdown images - upload to CDN and replace URLs
			const frontProcessed = await processMarkdownImages(input.front);
			const backProcessed = await processMarkdownImages(input.back);

			const [row] = await ctx.db
				.insert(cards)
				.values({
					deckId: input.deckId,
					front: frontProcessed,
					back: backProcessed,
				})
				.returning();
			return row;
		}),

	updateCard: protectedProcedure
		.input(
			z.object({
				cardId: z.string().uuid(),
				front: z.string().min(1),
				back: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure card belongs to a deck owned by the user
			const cardRow = await ctx.db.query.cards.findFirst({
				where: eq(cards.id, input.cardId),
			});
			if (!cardRow) throw new Error("Card not found");

			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, cardRow.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deckRow) throw new Error("Forbidden");

			// Process markdown images - upload to CDN and replace URLs
			const frontProcessed = await processMarkdownImages(input.front);
			const backProcessed = await processMarkdownImages(input.back);

			const [row] = await ctx.db
				.update(cards)
				.set({
					front: frontProcessed,
					back: backProcessed,
					updatedAt: new Date(),
				})
				.where(eq(cards.id, input.cardId))
				.returning();
			return row;
		}),

	deleteCard: protectedProcedure
		.input(z.object({ cardId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Ensure card belongs to a deck owned by the user
			const cardRow = await ctx.db.query.cards.findFirst({
				where: eq(cards.id, input.cardId),
			});
			if (!cardRow) throw new Error("Card not found");

			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, cardRow.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deckRow) throw new Error("Forbidden");

			// Delete the card (reviews will be cascade deleted due to foreign key constraint)
			await ctx.db.delete(cards).where(eq(cards.id, input.cardId));
			return { success: true };
		}),

	// Review queue: due cards for the user (from their decks)
	getDailyQueue: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(100).default(20),
					deckId: z.string().uuid().optional(),
				})
				.default({ limit: 20 }),
		)
		.query(async ({ ctx, input }) => {
			const now = new Date();

			// Build where conditions
			const whereConditions = [lte(cards.due, now)];

			// If deckId is provided, add it to the where conditions
			if (input.deckId) {
				whereConditions.push(eq(cards.deckId, input.deckId));
			} else {
				whereConditions.push(eq(decks.studying, true));
			}

			// Cards in user's decks that are due for review
			const rows = await ctx.db
				.select({
					card: cards,
				})
				.from(cards)
				.innerJoin(
					decks,
					and(
						eq(decks.id, cards.deckId),
						eq(decks.userId, ctx.session.user.id),
					),
				)
				.where(and(...whereConditions))
				.orderBy(cards.due)
				.limit(input.limit);

			return rows.map((r) => r.card);
		}),

	getDueCardCount: protectedProcedure
		.input(
			z
				.object({
					deckId: z.string().uuid().optional(),
				})
				.default({}),
		)
		.query(async ({ ctx, input }) => {
			const now = new Date();

			// Build where conditions
			const whereConditions = [lte(cards.due, now)];

			// If deckId is provided, add it to the where conditions
			if (input.deckId) {
				whereConditions.push(eq(cards.deckId, input.deckId));
			} else {
				whereConditions.push(eq(decks.studying, true));
			}

			// Count cards in user's decks that are due for review
			const result = await ctx.db
				.select({
					count: count(),
				})
				.from(cards)
				.innerJoin(
					decks,
					and(
						eq(decks.id, cards.deckId),
						eq(decks.userId, ctx.session.user.id),
					),
				)
				.where(and(...whereConditions));

			return result[0]?.count ?? 0;
		}),

	submitReview: protectedProcedure
		.input(
			z.object({
				cardId: z.string().uuid(),
				rating: z.number().min(1).max(4), // FSRS uses 1-4 rating
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify card belongs to a deck owned by the user
			const cardRow = await ctx.db.query.cards.findFirst({
				where: eq(cards.id, input.cardId),
			});
			if (!cardRow) throw new Error("Card not found");

			const deckRow = await ctx.db.query.decks.findFirst({
				where: and(
					eq(decks.id, cardRow.deckId),
					eq(decks.userId, ctx.session.user.id),
				),
			});
			if (!deckRow) throw new Error("Forbidden");

			// Build current card state from existing reviews
			const currentCard = await buildCardFromReviews(
				ctx,
				input.cardId,
				ctx.session.user.id,
				cardRow.createdAt,
			);

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
					userId: ctx.session.user.id,
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
	generateFlashcards: protectedProcedure
		.input(
			z.object({
				deckId: z.string().uuid().optional(),
				topic: z.string().min(1).max(getAISettings().generation.maxTopicLength),
				count: z
					.number()
					.min(getAISettings().flashcards.minCardCount)
					.max(getAISettings().flashcards.maxCardCount)
					.optional(),
				mode: z.enum(["topic", "notes", "converter"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
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
				console.log(
					`Generated deck description: "${deckDescriptionResult.object.description}"`,
				);

				// Create the deck with generated name and description
				const insertedDecks: { id: string; name: string }[] = await ctx.db
					.insert(decks)
					.values({
						name: deckNameResult.object.name,
						description: deckDescriptionResult.object.description,
						userId: ctx.session.user.id,
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
					where: and(
						eq(decks.id, deckId),
						eq(decks.userId, ctx.session.user.id),
					),
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
							`The optimal number of flashcards for this input (${aiSettings.flashcards.minCardCount}-${aiSettings.flashcards.maxCardCount})`,
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

			let prompt: string;
			switch (input.mode) {
				case "notes":
					prompt = buildFlashcardGenerationFromNotesPrompt(
						input.topic,
						cardCount,
					);
					break;
				case "converter":
					prompt = buildFlashcardConversionPrompt(input.topic, cardCount);
					break;
				default:
					prompt = buildFlashcardGenerationPrompt(input.topic, cardCount);
			}

			// Generate flashcards using GPT OSS 120B
			console.log("Generating flashcards with GPT OSS 120B...");

			const result = await generateObject({
				model: hackclubMainModel,
				schema: flashcardSchema,
				prompt,
			});

			console.log(
				"AI generation successful, randomizing and inserting cards...",
			);

			// Randomize the order of flashcards to reduce predictability
			const shuffledFlashcards = [...result.object.flashcards];
			for (let i = shuffledFlashcards.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = shuffledFlashcards[i];
				const swapItem = shuffledFlashcards[j];
				if (temp && swapItem) {
					shuffledFlashcards[i] = swapItem;
					shuffledFlashcards[j] = temp;
				}
			}

			// Insert generated flashcards into the database
			const generatedCards = [];
			if (deckId) {
				for (const flashcard of shuffledFlashcards) {
					// Process markdown images - upload to CDN and replace URLs
					const frontProcessed = await processMarkdownImages(flashcard.front);
					const backProcessed = await processMarkdownImages(flashcard.back);

					const [card] = await ctx.db
						.insert(cards)
						.values({
							deckId: deckId,
							front: frontProcessed,
							back: backProcessed,
						})
						.returning();
					generatedCards.push(card);
				}
			}

			// Update the deck with AI generation metadata
			await ctx.db
				.update(decks)
				.set({
					generationPrompt: input.topic,
					generationMode: input.mode,
					generationModel: "GPT OSS 120B",
					generationCardCount: cardCount,
					generationDifficulty: "intermediate", // Could be made dynamic in the future
					isAIGenerated: true,
					updatedAt: new Date(),
				})
				.where(eq(decks.id, deckId));

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
