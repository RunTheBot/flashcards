import { z } from "zod";
import { and, desc, eq, lte, max, or, isNull } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { auth } from "@/lib/auth";
import { cards, cardReviews, decks } from "@/server/db/schema";
import { generateObject } from 'ai';
import { hackclubModel, HACKCLUB_MODELS, hackclub } from '@/lib/ai/hackclub';

// Simple scheduler: computes nextReviewAt based on difficulty and last due time
function computeNextReviewAt(difficulty: number, lastNext?: Date | null) {
  const now = new Date();
  const base = lastNext && lastNext > now ? lastNext : now;
  // Map difficulty to minutes/days
  // 1 = Again (10 min), 2 = Hard (1 day), 3 = Good (3 days), 4/5 = Easy (7 days)
  const minutes = difficulty <= 1 ? 10 : 0;
  const days = difficulty <= 1 ? 0 : difficulty === 2 ? 1 : difficulty === 3 ? 3 : 7;
  const next = new Date(base);
  if (minutes) next.setMinutes(next.getMinutes() + minutes);
  if (days) next.setDate(next.getDate() + days);
  return next;
}

export const flashcardsRouter = createTRPCRouter({
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
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session) throw new Error("Unauthorized");
      const [row] = await ctx.db
        .insert(decks)
        .values({ name: input.name, description: input.description, userId: session.user.id })
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
        where: and(eq(decks.id, input.deckId), eq(decks.userId, session.user.id)),
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
    .input(z.object({ deckId: z.string().uuid(), front: z.string().min(1), back: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session) throw new Error("Unauthorized");
      // Ensure deck belongs to user
      const deckRow = await ctx.db.query.decks.findFirst({
        where: and(eq(decks.id, input.deckId), eq(decks.userId, session.user.id)),
      });
      if (!deckRow) throw new Error("Deck not found");
      const [row] = await ctx.db
        .insert(cards)
        .values({ deckId: input.deckId, front: input.front, back: input.back })
        .returning();
      return row;
    }),

  updateCard: publicProcedure
    .input(z.object({ cardId: z.string().uuid(), front: z.string().min(1), back: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session) throw new Error("Unauthorized");
      // Ensure card belongs to a deck owned by the user
      const cardRow = await ctx.db.query.cards.findFirst({ where: eq(cards.id, input.cardId) });
      if (!cardRow) throw new Error("Card not found");
      
      const deckRow = await ctx.db.query.decks.findFirst({
        where: and(eq(decks.id, cardRow.deckId), eq(decks.userId, session.user.id)),
      });
      if (!deckRow) throw new Error("Forbidden");
      
      const [row] = await ctx.db
        .update(cards)
        .set({ front: input.front, back: input.back, updatedAt: new Date() })
        .where(eq(cards.id, input.cardId))
        .returning();
      return row;
    }),

  // Review queue: due cards for the user (from their decks)
  getDailyQueue: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).default({ limit: 20 }))
    .query(async ({ ctx, input }) => {
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session) return [];

      // latest review timestamp per card for this user
      const latest = ctx.db
        .select({ cardId: cardReviews.cardId, lastReviewed: max(cardReviews.reviewedAt).as("lastReviewed") })
        .from(cardReviews)
        .where(eq(cardReviews.userId, session.user.id))
        .groupBy(cardReviews.cardId)
        .as("latest");

      // next due per card (row matching the latest reviewedAt)
      const nextDue = ctx.db
        .select({ cardId: cardReviews.cardId, nextReviewAt: cardReviews.nextReviewAt })
        .from(cardReviews)
        .innerJoin(latest, and(eq(cardReviews.cardId, latest.cardId), eq(cardReviews.reviewedAt, latest.lastReviewed)))
        .as("nextDue");

      const now = new Date();

      // Cards in user's decks, due now (or never reviewed)
      const rows = await ctx.db
        .select({ c: cards })
        .from(cards)
        .innerJoin(decks, and(eq(decks.id, cards.deckId), eq(decks.userId, session.user.id)))
        .leftJoin(nextDue, eq(nextDue.cardId, cards.id))
        .where(or(isNull(nextDue.nextReviewAt), lte(nextDue.nextReviewAt, now)))
        .orderBy(desc(cards.createdAt))
        .limit(input.limit);

      return rows.map((r) => r.c);
    }),

  submitReview: publicProcedure
    .input(z.object({ cardId: z.string().uuid(), difficulty: z.number().min(1).max(5) }))
    .mutation(async ({ ctx, input }) => {
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session) throw new Error("Unauthorized");
      // Verify card belongs to a deck owned by the user
      const cardRow = await ctx.db.query.cards.findFirst({ where: eq(cards.id, input.cardId) });
      if (!cardRow) throw new Error("Card not found");

      const deckRow = await ctx.db.query.decks.findFirst({
        where: and(eq(decks.id, cardRow.deckId), eq(decks.userId, session.user.id)),
      });
      if (!deckRow) throw new Error("Forbidden");

      // Get last nextReviewAt for this user/card
      const last = await ctx.db.query.cardReviews.findFirst({
        where: and(eq(cardReviews.cardId, input.cardId), eq(cardReviews.userId, session.user.id)),
        orderBy: (r, { desc }) => desc(r.reviewedAt),
      });
      const next = computeNextReviewAt(input.difficulty, last?.nextReviewAt ?? null);

      const [row] = await ctx.db
        .insert(cardReviews)
        .values({ cardId: input.cardId, userId: session.user.id, difficulty: input.difficulty, nextReviewAt: next })
        .returning();
      return row;
    }),

  // AI Generation
  generateFlashcards: publicProcedure
    .input(z.object({ 
      deckId: z.string().uuid(), 
      topic: z.string().min(1), 
      count: z.number().min(1).max(20).default(10) 
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session) throw new Error("Unauthorized");
      
      // Ensure deck belongs to user
      const deckRow = await ctx.db.query.decks.findFirst({
        where: and(eq(decks.id, input.deckId), eq(decks.userId, session.user.id)),
      });
      if (!deckRow) throw new Error("Deck not found");

      const flashcardSchema = z.object({
        flashcards: z.array(
          z.object({
            front: z.string().describe('The question or prompt for the flashcard'),
            back: z.string().describe('The answer or explanation for the flashcard'),
          })
        ).describe('An array of flashcards generated from the topic'),
      });

      const prompt = `Generate ${input.count} flashcards about "${input.topic}". 
      
      Create educational flashcards that help someone learn about this topic effectively. 
      Each flashcard should have:
      - A clear, concise question or prompt on the front
      - A comprehensive but not overly long answer on the back
      
      Make sure the flashcards cover different aspects of the topic and progress from basic to more advanced concepts where appropriate.
      
      Focus on key facts, definitions, concepts, and important details that someone studying this topic should know.`;

      // Try multiple Groq models with fallback
      const modelsToTry = [
        { model: hackclubModel, name: 'Qwen 32B' },
        { model: hackclub(HACKCLUB_MODELS.LLAMA_4), name: 'Llama 4' },
        { model: hackclub(HACKCLUB_MODELS.GPT_OSS_20B), name: 'GPT OSS 20B' },
        { model: hackclub(HACKCLUB_MODELS.GPT_OSS_120B), name: 'GPT OSS 120B' },
      ];

      let lastError: Error | null = null;
      
      for (const { model, name } of modelsToTry) {
        try {
          console.log(`Trying to generate flashcards with ${name}...`);
          
          const result = await generateObject({
            model,
            schema: flashcardSchema,
            prompt,
          });

          console.log(`AI generation successful with ${name}, inserting cards...`);
          
          // Insert generated flashcards into the database
          const generatedCards = [];
          for (const flashcard of result.object.flashcards) {
            const [card] = await ctx.db
              .insert(cards)
              .values({ 
                deckId: input.deckId, 
                front: flashcard.front, 
                back: flashcard.back 
              })
              .returning();
            generatedCards.push(card);
          }

          console.log(`Successfully generated ${generatedCards.length} flashcards using ${name}`);
          return {
            success: true,
            cardsGenerated: generatedCards.length,
            cards: generatedCards,
            modelUsed: name,
          };
        } catch (error) {
          console.error(`Failed with ${name}:`, error);
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          // Continue to next model
          continue;
        }
      }

      // If all models failed, create some manual fallback flashcards
      console.error('All AI models failed. Creating fallback flashcards...');
      console.error('Last error:', lastError);
      
      // Create some basic flashcards based on the topic as a fallback
      const fallbackFlashcards = [
        {
          front: `What is the main concept of "${input.topic}"?`,
          back: `${input.topic} is an important topic that requires study and understanding. This is a fallback card created when AI generation failed.`
        },
        {
          front: `Why is "${input.topic}" important to learn?`,
          back: `Understanding ${input.topic} helps build knowledge and skills in this subject area.`
        },
        {
          front: `What are the key aspects of "${input.topic}"?`,
          back: `${input.topic} has multiple components that should be studied systematically.`
        }
      ];

      // Take only the requested number of cards
      const cardsToCreate = fallbackFlashcards.slice(0, Math.min(input.count, fallbackFlashcards.length));
      
      const generatedCards = [];
      for (const flashcard of cardsToCreate) {
        const [card] = await ctx.db
          .insert(cards)
          .values({ 
            deckId: input.deckId, 
            front: flashcard.front, 
            back: flashcard.back 
          })
          .returning();
        generatedCards.push(card);
      }

      console.log(`Created ${generatedCards.length} fallback flashcards`);
      return {
        success: true,
        cardsGenerated: generatedCards.length,
        cards: generatedCards,
        modelUsed: 'Fallback (AI generation failed)',
        warning: 'AI generation failed, created basic flashcards as fallback'
      };
      
    }),
});
