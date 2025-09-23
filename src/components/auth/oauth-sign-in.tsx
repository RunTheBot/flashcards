"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signIn } from "@/lib/auth-client";
import type { IconType } from "react-icons";
import { FaGithub, FaGoogle } from "react-icons/fa";

type OAuthSignInProps = {
	onError?: (message: string) => void;
	callbackURL?: string;
	className?: string;
};

type ProviderId = "github" | "google";
type ProviderDef = { id: ProviderId; label: string; icon: IconType };

const DEFAULT_PROVIDERS: ProviderDef[] = [
	{ id: "github", label: "GitHub", icon: FaGithub },
	{ id: "google", label: "Google", icon: FaGoogle },
];

export function OAuthSignIn({
	onError,
	callbackURL = "/dashboard",
	className,
}: OAuthSignInProps) {
	const providers = DEFAULT_PROVIDERS;

	return (
		<div className={className}>
			<div className="grid grid-cols-2 gap-4">
				{providers.map((p) => {
					const Icon = p.icon;
					return (
						<Button
							key={p.id}
							variant="outline"
							onClick={async () => {
								try {
									await signIn.social({ provider: p.id, callbackURL });
								} catch (err) {
									onError?.(`${p.label} sign in failed`);
								}
							}}
						>
							<Icon className="mr-2 h-4 w-4" />
							{p.label}
						</Button>
					);
				})}
			</div>
		</div>
	);
}
