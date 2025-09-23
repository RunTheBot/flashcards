import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AIFlashcardsClient } from "./ai-flashcards-client";

export default async function AIFlashcardsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/auth/signin");
	}

	return <AIFlashcardsClient />;
}
