"use client";

import { UserMenu } from "@/components/auth/user-menu";

export function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <a href="/" className="group flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary text-primary-foreground font-semibold shadow-sm transition-transform group-hover:scale-[1.03]">
                F
              </span>
              <span className="inline-block font-semibold tracking-tight">Flashcards</span>
              <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground md:inline-block">
                Beta
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden items-center gap-6 md:flex">
              <a
                href="/"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </a>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <UserMenu />
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
