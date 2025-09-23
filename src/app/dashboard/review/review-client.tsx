"use client";

import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useCallback, useEffect, useMemo, useState } from "react";

export function ReviewClient() {
	const [isCardFlipped, setIsCardFlipped] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const utils = api.useUtils();
	const {
		data: queue,
		isLoading,
		refetch,
	} = api.flashcards.getDailyQueue.useQuery({ limit: 20 });
	const submit = api.flashcards.submitReview.useMutation({
		onSuccess: async () => {
			// Invalidate queue so next due card can appear
			await utils.flashcards.getDailyQueue.invalidate();
		},
	});

	const current = useMemo(() => (queue?.[0] ? queue[0] : undefined), [queue]);

	// Log the current card when it changes
	useEffect(() => {
		if (current) {
			console.log('Current card loaded:', {
				id: current.id,
				front: current.front,
				back: current.back,
				deckId: current.deckId,
				createdAt: current.createdAt,
				updatedAt: current.updatedAt
			});
		}
	}, [current]);

	const handleAnswer = useCallback(
		async (difficulty: 1 | 2 | 3 | 4 | 5) => {
			if (!current || isSubmitting) return;

			setIsSubmitting(true);

			// First flip back to front
			setIsCardFlipped(false);

			// Small delay to allow flip animation to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			try {
				// Submit review; queue refetch will remove current card
				await submit.mutateAsync({ cardId: current.id, difficulty });
			} catch (error) {
				console.error("Error submitting review:", error);
				// Optionally show an error message to the user
			} finally {
				setIsSubmitting(false);
			}
		},
		[current, isSubmitting, submit],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// Only allow keyboard shortcuts when card is flipped
			if (!isCardFlipped) return;

			if (e.key === "1") handleAnswer(1);
			else if (e.key === "2") handleAnswer(2);
			else if (e.key === "3") handleAnswer(3);
			else if (e.key === "4") handleAnswer(4);
			else if (e.key === "5") handleAnswer(5);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [handleAnswer, isCardFlipped]);

	if (isLoading) return <div className="p-6">Loading...</div>;

	if (!queue || queue.length === 0)
		return (
			<Card className="p-6 text-center">
				<p className="text-muted-foreground">
					No cards due right now. Great job!
				</p>
				<div className="mt-4 flex justify-center gap-2">
					<Button onClick={() => refetch()}>Refresh</Button>
				</div>
			</Card>
		);

	return (
		<div className="grid gap-4">
			<Flashcard
				className="mx-auto max-w-xl"
				front={<div className="font-medium text-xl">{current?.front}</div>}
				back={<div className="text-lg">{current?.back}</div>}
				isFlipped={isCardFlipped}
				onFlip={setIsCardFlipped}
			/>

			{!isCardFlipped && (
				<div className="text-center text-muted-foreground">
					<p>Click the card to reveal the answer</p>
				</div>
			)}

			{isCardFlipped && (
				<div className="flex flex-wrap justify-center gap-2">
					<Button
						variant="destructive"
						onClick={() => handleAnswer(1)}
						disabled={isSubmitting}
						title="1"
					>
						Again
					</Button>
					<Button variant="secondary" onClick={() => handleAnswer(2)} title="2" disabled={isSubmitting}>
						Hard
					</Button>
					<Button onClick={() => handleAnswer(3)} title="3" disabled={isSubmitting}>
						Good
					</Button>
					<Button variant="outline" onClick={() => handleAnswer(4)} title="4" disabled={isSubmitting}>
						Easy
					</Button>
				</div>
			)}
		</div>
	);
}
