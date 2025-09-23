"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReviewClient() {
  const [index, setIndex] = useState(0);
  const utils = api.useUtils();
  const { data: queue, isLoading, refetch } = api.flashcards.getDailyQueue.useQuery({ limit: 20 });
  const submit = api.flashcards.submitReview.useMutation({
    onSuccess: async () => {
      // Invalidate and refetch queue so next due card can appear
      await utils.flashcards.getDailyQueue.invalidate();
      await refetch();
    },
  });

  const current = useMemo(() => (queue?.[index] ? queue[index] : undefined), [queue, index]);

  const handleAnswer = useCallback(
    async (difficulty: 1 | 2 | 3 | 4 | 5) => {
      if (!current) return;
      await submit.mutateAsync({ cardId: current.id, difficulty });
      setIndex((i) => i + 1);
    },
    [current, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") handleAnswer(1);
      else if (e.key === "2") handleAnswer(2);
      else if (e.key === "3") handleAnswer(3);
      else if (e.key === "4") handleAnswer(4);
      else if (e.key === "5") handleAnswer(5);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAnswer]);

  if (isLoading) return <div className="p-6">Loading...</div>;

  if (!queue || queue.length === 0 || index >= queue.length)
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No cards due right now. Great job!</p>
        <div className="mt-4 flex gap-2 justify-center">
          <Button onClick={() => refetch()}>Refresh</Button>
        </div>
      </Card>
    );

  return (
    <div className="grid gap-4">
      <Flashcard
        className="mx-auto max-w-xl"
        front={<div className="text-xl font-medium">{current.front}</div>}
        back={<div className="text-lg">{current.back}</div>}
      />
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="destructive" onClick={() => handleAnswer(1)} title="1">
          Again
        </Button>
        <Button variant="secondary" onClick={() => handleAnswer(2)} title="2">
          Hard
        </Button>
        <Button onClick={() => handleAnswer(3)} title="3">
          Good
        </Button>
        <Button variant="outline" onClick={() => handleAnswer(4)} title="4">
          Easy
        </Button>
      </div>
    </div>
  );
}
