import { env } from "@/env";
import { db } from "@/server/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg", // PostgreSQL
	}),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	emailAndPassword: {
		enabled: false,
		disableSignUp: true,
	},
	socialProviders: {
		...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
			? {
					github: {
						clientId: env.GITHUB_CLIENT_ID,
						clientSecret: env.GITHUB_CLIENT_SECRET,
						disableSignUp: true,
					},
				}
			: {}),
		...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
						disableSignUp: true,
					},
				}
			: {}),
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day (how often to update the session)
	},
	advanced: {
		database: {
			generateId: false, // Use database auto-generated IDs
		},
	},
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
