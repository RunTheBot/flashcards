import { HydrateClient } from "@/trpc/server";
import { ReviewClient } from "./review-client";

export default function ReviewPage() {
	return (
		<HydrateClient>
			<div className="container mx-auto px-4 py-8">
				<h1 className="mb-4 font-bold text-2xl">Today's Review</h1>
				<ReviewClient />
			</div>
		</HydrateClient>
	);
}
