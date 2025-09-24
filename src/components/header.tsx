"use client";

import { UserMenu } from "@/components/auth/user-menu";
import { NoSSR } from "@/components/no-ssr";

// Navigation items configuration
const navigationItems = [
	{
		label: "Home",
		href: "/",
		id: "home",
	},
	{
		label: "Dashboard",
		href: "/dashboard",
		id: "dashboard",
	},
	{
		label: "Decks",
		href: "/dashboard/decks",
		id: "decks",
	},
	{
		label: "Study",
		href: "/dashboard/study",
		id: "study",
	},
];

export function Header() {
	return (
		<nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="relative">
				<div className="container mx-auto max-w-7xl px-4">
					<div className="relative flex h-16 items-center justify-between">
						{/* Brand */}
						<div className="flex-shrink-0">
							<a href="/" className="group flex items-center gap-3">
								<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary font-semibold text-primary-foreground shadow-sm transition-transform group-hover:scale-[1.03]">
									F
								</span>
								<span className="inline-block font-semibold tracking-tight">
									Flashcards
								</span>
								<span className="hidden rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs md:inline-block">
									Beta
								</span>
							</a>
						</div>

						{/* Absolutely centered Desktop nav */}
						<div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2">
							<div className="hidden items-center gap-6 md:flex">
								{navigationItems.map((item) => (
									<a
										key={item.id}
										href={item.href}
										className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
									>
										{item.label}
									</a>
								))}
							</div>
						</div>

						{/* Right actions */}
						<div className="flex flex-shrink-0 items-center gap-2">
							<NoSSR
								fallback={
									<div className="animate-pulse">
										<div className="h-8 w-8 rounded-full bg-muted" />
									</div>
								}
							>
								<UserMenu />
							</NoSSR>
						</div>
					</div>
				</div>

				{/* Subtle gradient divider */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-muted to-transparent"
				/>
			</div>
		</nav>
	);
}
