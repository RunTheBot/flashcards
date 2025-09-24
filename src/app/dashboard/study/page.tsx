import { StudyClient } from "@/app/dashboard/study/study-client";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";

export default function StudyPage() {
	return (
		<HydrateClient>
			<div className="container mx-auto px-4 py-8">
				<Suspense
					fallback={<div className="p-6">Loading study session...</div>}
				>
					<StudyClient />
				</Suspense>
			</div>
		</HydrateClient>
	);
}
