"use client";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function SignUpContent() {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

	useEffect(() => {
		// If user is already logged in, redirect to dashboard or callback URL
		if (!isPending && session) {
			router.push(callbackUrl);
		}
	}, [session, isPending, router, callbackUrl]);

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

	// If user is logged in, don't render the form (redirect will happen)
	if (session) {
		return null;
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
			<div className="flex w-full max-w-md flex-col gap-8">
				<div className="flex flex-col gap-2 text-center">
					<h1 className="font-bold text-2xl tracking-tight">
						Create an account
					</h1>
					<p className="text-muted-foreground text-sm">
						Already have an account?{" "}
						<Link
							href="/auth/signin"
							className="font-medium text-primary hover:underline"
						>
							Sign in
						</Link>
					</p>
				</div>
				<SignUpForm />
			</div>
		</div>
	);
}

export default function SignUpPage() {
	return (
		<Suspense fallback={
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="mt-2 text-muted-foreground">Loading...</p>
				</div>
			</div>
		}>
			<SignUpContent />
		</Suspense>
	);
}
