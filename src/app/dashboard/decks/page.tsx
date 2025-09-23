import { HydrateClient } from "@/trpc/server";
import { DecksClient } from "@/app/dashboard/decks/decks-client";

export default function DecksPage() {
  return (
    <HydrateClient>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Your Decks</h1>
        <DecksClient />
      </div>
    </HydrateClient>
  );
}
