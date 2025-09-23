import { HydrateClient } from "@/trpc/server";
import { StudyClient } from "@/app/dashboard/study/study-client";

export default function StudyPage() {
	return (
		<HydrateClient>
			<div className="container mx-auto px-4 py-8">
				<StudyClient />
			</div>
		</HydrateClient>
	);
}
