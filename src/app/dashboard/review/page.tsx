import { redirect } from "next/navigation";

export default function ReviewPage() {
	// Redirect to the unified study page
	redirect("/dashboard/study");
}
