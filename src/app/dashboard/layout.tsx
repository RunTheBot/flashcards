"use client";

import { Header } from "@/components/header";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	useEffect(() => {
		// If not loading and no session, redirect to sign-in
		if (!isPending && !session) {
			router.push("/auth/signin");
		}
	}, [session, isPending, router]);

	// Show loading state while checking authentication
	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="mt-2 text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// If no session, don't render anything (redirect will happen)
	if (!session) {
		return null;
	}

	// Render the dashboard with header
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="container mx-auto px-4 py-8">{children}</main>
		</div>
	);
}
