// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTableCreator,
	real,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `flashcards_${name}`);

// Better Auth Tables
export const user = createTable("user", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = createTable("session", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	expiresAt: timestamp("expiresAt").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = createTable("account", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = createTable(
	"verification",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expiresAt").notNull(),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => ({
		identifierIdx: index("verification_identifier_idx").on(table.identifier),
	}),
);

// Application Tables
export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
		userId: d.text("userId").references(() => user.id, { onDelete: "cascade" }),
	}),
	(t) => [index("name_idx").on(t.name)],
);

// Flashcard Tables
export const decks = createTable("deck", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	description: text("description"),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	// AI generation metadata
	generationPrompt: text("generation_prompt"), // Store the original prompt used for generation
	generationMode: text("generation_mode"), // "topic", "notes", or "converter"
	generationModel: text("generation_model"), // The AI model used for generation
	generationCardCount: integer("generation_card_count"), // The count setting used
	generationDifficulty: text("generation_difficulty"), // The difficulty setting used
	isAIGenerated: boolean("is_ai_generated").default(false), // Whether this deck was AI-generated
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	studying: boolean("studying").notNull().default(false),
});

export const cards = createTable("card", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	front: text("front").notNull(),
	back: text("back").notNull(),
	deckId: text("deckId")
		.notNull()
		.references(() => decks.id, { onDelete: "cascade" }),
	// FSRS fields
	stability: real("stability").default(0),
	difficulty: real("difficulty").default(0),
	elapsed_days: integer("elapsed_days").default(0),
	scheduled_days: integer("scheduled_days").default(0),
	learning_steps: integer("learning_steps").default(0),
	reps: integer("reps").default(0),
	lapses: integer("lapses").default(0),
	state: integer("state").default(0), // 0=New, 1=Learning, 2=Review, 3=Relearning
	last_review: timestamp("last_review"),
	due: timestamp("due").notNull().defaultNow(),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const cardReviews = createTable("cardReview", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	cardId: text("cardId")
		.notNull()
		.references(() => cards.id, { onDelete: "cascade" }),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	rating: integer("rating").notNull(), // FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy
	reviewedAt: timestamp("reviewedAt").notNull().defaultNow(),
});
