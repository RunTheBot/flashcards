import { HydrateClient } from "@/trpc/server";
import { ReviewClient } from "./review-client";

export default function ReviewPage() {
  return (
    <HydrateClient>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Today's Review</h1>
        <ReviewClient />
      </div>
    </HydrateClient>
  );
}
