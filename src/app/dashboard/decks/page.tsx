import { DecksClient } from "@/app/dashboard/decks/decks-client";
import { HydrateClient } from "@/trpc/server";

export default function DecksPage() {
	return (
		<HydrateClient>
			<div className="container mx-auto px-4 py-8">
				<h1 className="mb-6 font-bold text-2xl">Your Decks</h1>
				<DecksClient />
			</div>
		</HydrateClient>
	);
}
