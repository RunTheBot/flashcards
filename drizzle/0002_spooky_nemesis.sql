ALTER TABLE "flashcards_cardReview" RENAME COLUMN "difficulty" TO "rating";--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "stability" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "difficulty" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "elapsed_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "scheduled_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "reps" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "lapses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "state" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "last_review" timestamp;--> statement-breakpoint
ALTER TABLE "flashcards_card" ADD COLUMN "due" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards_cardReview" DROP COLUMN "nextReviewAt";