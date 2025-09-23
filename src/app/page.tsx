import Link from "next/link";

import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { Brain, CalendarCheck2, LineChart, Sparkles } from "lucide-react";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-gradient-to-b from-background to-background/80 flex flex-col">
        {/* Decorative background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-6rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-[-8rem] bottom-[-8rem] h-[28rem] w-[28rem] rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 py-8 md:py-12 flex flex-col items-center justify-center flex-1">
          <div className="grid max-w-4xl gap-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Boost your memory with spaced repetition
            </span>
            <h1 className="text-balance font-bold text-4xl tracking-tight sm:text-5xl md:text-6xl">
              The smartest way to learn with Flashcards
            </h1>
            <p className="text-pretty text-muted-foreground md:text-lg">
              Create decks, review with scientifically proven spaced repetition, and
              track your progress over time. Simple, fast, and distraction‑free.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/auth/signup">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
            <div className="grid max-w-5xl grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-4 backdrop-blur">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Spaced Repetition</div>
                  <div className="text-muted-foreground">Scientifically proven</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-4 backdrop-blur">
                <CalendarCheck2 className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Daily Reviews</div>
                  <div className="text-muted-foreground">Build consistency</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-4 backdrop-blur">
                <LineChart className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Progress Tracking</div>
                  <div className="text-muted-foreground">See your growth</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </HydrateClient>
  );
}

