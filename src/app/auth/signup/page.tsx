import { SignUpForm } from "@/components/auth/sign-up-form";
import Link from "next/link";

export default function SignUpPage() {
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
