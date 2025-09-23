import { and, desc, eq, isNull, lte, max, or } from "drizzle-orm";
import { z } from "zod";

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

// Simple scheduler: computes nextReviewAt based on difficulty and last due time
function computeNextReviewAt(difficulty: number, lastNext?: Date | null) {
	const now = new Date();
	const base = lastNext && lastNext > now ? lastNext : now;
	// Map difficulty to minutes/days
	// 1 = Again (10 min), 2 = Hard (1 day), 3 = Good (3 days), 4/5 = Easy (7 days)
	const minutes = difficulty <= 1 ? 10 : 0;
	const days =
		difficulty <= 1 ? 0 : difficulty === 2 ? 1 : difficulty === 3 ? 3 : 7;
	const next = new Date(base);
	if (minutes) next.setMinutes(next.getMinutes() + minutes);
	if (days) next.setDate(next.getDate() + days);
	return next;
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
				.object({ limit: z.number().min(1).max(100).default(20) })
				.default({ limit: 20 }),
		)
		.query(async ({ ctx, input }) => {
			const session = await auth.api.getSession({ headers: ctx.headers });
			if (!session) return [];

			// latest review timestamp per card for this user
			const latest = ctx.db
				.select({
					cardId: cardReviews.cardId,
					lastReviewed: max(cardReviews.reviewedAt).as("lastReviewed"),
				})
				.from(cardReviews)
				.where(eq(cardReviews.userId, session.user.id))
				.groupBy(cardReviews.cardId)
				.as("latest");

			// next due per card (row matching the latest reviewedAt)
			const nextDue = ctx.db
				.select({
					cardId: cardReviews.cardId,
					nextReviewAt: cardReviews.nextReviewAt,
				})
				.from(cardReviews)
				.innerJoin(
					latest,
					and(
						eq(cardReviews.cardId, latest.cardId),
						eq(cardReviews.reviewedAt, latest.lastReviewed),
					),
				)
				.as("nextDue");

			const now = new Date();

			// Cards in user's decks, due now (or never reviewed)
			const rows = await ctx.db
				.select({ c: cards })
				.from(cards)
				.innerJoin(
					decks,
					and(eq(decks.id, cards.deckId), eq(decks.userId, session.user.id)),
				)
				.leftJoin(nextDue, eq(nextDue.cardId, cards.id))
				.where(or(isNull(nextDue.nextReviewAt), lte(nextDue.nextReviewAt, now)))
				.orderBy(desc(cards.createdAt))
				.limit(input.limit);

			return rows.map((r) => r.c);
		}),

	submitReview: publicProcedure
		.input(
			z.object({
				cardId: z.string().uuid(),
				difficulty: z.number().min(1).max(5),
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

			// Get last nextReviewAt for this user/card
			const last = await ctx.db.query.cardReviews.findFirst({
				where: and(
					eq(cardReviews.cardId, input.cardId),
					eq(cardReviews.userId, session.user.id),
				),
				orderBy: (r, { desc }) => desc(r.reviewedAt),
			});
			const next = computeNextReviewAt(
				input.difficulty,
				last?.nextReviewAt ?? null,
			);

			const [row] = await ctx.db
				.insert(cardReviews)
				.values({
					cardId: input.cardId,
					userId: session.user.id,
					difficulty: input.difficulty,
					nextReviewAt: next,
				})
				.returning();
			return row;
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
				const [deck] = await ctx.db
					.insert(decks)
					.values({
						name: deckNameResult.object.name,
						description: `AI-generated flashcards about: ${input.topic.substring(0, 100)}${input.topic.length > 100 ? "..." : ""}`,
						userId: session.user.id,
					})
					.returning();

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
