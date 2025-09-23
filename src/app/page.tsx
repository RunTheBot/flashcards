import Link from "next/link";

import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { Brain, CalendarCheck2, LineChart, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-gradient-to-b from-background to-background/80">
        {/* Decorative background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-6rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-[-8rem] bottom-[-8rem] h-[28rem] w-[28rem] rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 py-16 md:py-24 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="grid max-w-4xl gap-8 text-center">
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
            <div className="grid max-w-3xl grid-cols-3 gap-6 text-sm text-muted-foreground">
              <div className="rounded-md border bg-card p-3">No ads</div>
              <div className="rounded-md border bg-card p-3">Open source ready</div>
              <div className="rounded-md border bg-card p-3">Keyboard friendly</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Brain className="h-5 w-5" />}
              title="Spaced Repetition"
              desc="Review cards at optimal intervals to retain knowledge longer with less effort."
            />
            <FeatureCard
              icon={<CalendarCheck2 className="h-5 w-5" />}
              title="Daily Reviews"
              desc="Stay consistent with a focused daily queue and streak tracking."
            />
            <FeatureCard
              icon={<LineChart className="h-5 w-5" />}
              title="Progress Insights"
              desc="See what’s working with per‑deck stats, retention, and review heatmaps."
            />
          </div>
        </section>
      </main>
    </HydrateClient>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-colors hover:bg-card/80 flex flex-col gap-3">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
