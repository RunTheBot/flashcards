"use client";

import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function StudyClient() {
	const [isCardFlipped, setIsCardFlipped] = useState(false);
	const searchParams = useSearchParams();
	const deckId = searchParams.get("deckId");

	const utils = api.useUtils();

	// Get deck info if studying a specific deck
	const { data: deck } = api.flashcards.getDecks.useQuery(undefined, {
		select: (decks) => decks.find((d) => d.id === deckId),
		enabled: !!deckId,
	});

	// Get total cards in deck for progress tracking
	const { data: allCards } = api.flashcards.getCards.useQuery(
		{ deckId: deckId || "" },
		{ enabled: !!deckId },
	);

	const {
		data: queue,
		isLoading,
		refetch,
	} = api.flashcards.getDailyQueue.useQuery({
		limit: 20,
		deckId: deckId || undefined,
	});

	// Get the total count of due cards (not limited to 20)
	const { data: totalDueCount, isLoading: isCountLoading } = api.flashcards.getDueCardCount.useQuery({
		deckId: deckId || undefined,
	});

	const submit = api.flashcards.submitReview.useMutation({
		onMutate: async ({ cardId }) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await utils.flashcards.getDailyQueue.cancel({
				limit: 20,
				deckId: deckId || undefined,
			});
			await utils.flashcards.getDueCardCount.cancel({
				deckId: deckId || undefined,
			});

			// Snapshot the previous values
			const previousQueue = utils.flashcards.getDailyQueue.getData({
				limit: 20,
				deckId: deckId || undefined,
			});
			const previousCount = utils.flashcards.getDueCardCount.getData({
				deckId: deckId || undefined,
			});

			// Optimistically update by removing the current card from the queue
			utils.flashcards.getDailyQueue.setData(
				{
					limit: 20,
					deckId: deckId || undefined,
				},
				(old) => {
					if (!old) return old;
					return old.filter((card) => card.id !== cardId);
				},
			);

			// Optimistically decrease the due card count
			utils.flashcards.getDueCardCount.setData(
				{
					deckId: deckId || undefined,
				},
				(old) => {
					if (old === undefined) return old;
					return Math.max(0, old - 1);
				},
			);

			// Return a context object with the snapshotted values
			return { previousQueue, previousCount };
		},
		onError: (err, newData, context) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			if (context?.previousQueue) {
				utils.flashcards.getDailyQueue.setData(
					{
						limit: 20,
						deckId: deckId || undefined,
					},
					context.previousQueue,
				);
			}
			if (context?.previousCount !== undefined) {
				utils.flashcards.getDueCardCount.setData(
					{
						deckId: deckId || undefined,
					},
					context.previousCount,
				);
			}
		},
		onSettled: () => {
			// Always refetch after error or success to ensure we have the latest data
			utils.flashcards.getDailyQueue.invalidate({
				limit: 20,
				deckId: deckId || undefined,
			});
			utils.flashcards.getDueCardCount.invalidate({
				deckId: deckId || undefined,
			});
		},
	});

	const current = useMemo(() => (queue?.[0] ? queue[0] : undefined), [queue]);

	// Hold a pending review rating until flip animation ends
	const [pendingRating, setPendingRating] = useState<null | (1 | 2 | 3 | 4)>(null);

	// Reset card flip state and log the current card when it changes
	useEffect(() => {
		if (current) {
			setIsCardFlipped(false);
			console.log("Current card loaded:", {
				id: current.id,
				front: current.front,
				back: current.back,
				deckId: current.deckId,
				createdAt: current.createdAt,
				updatedAt: current.updatedAt,
			});
		}
	}, [current]);

	// Instead of submitting immediately, set a pending rating and flip
	const handleAnswer = useCallback(
		(rating: 1 | 2 | 3 | 4) => {
			if (!current) return;
			// Set pending rating; the actual submit will occur on flip end
			setPendingRating(rating);
			// Flip card back to front to trigger the transition
			setIsCardFlipped(false);
		},
		[current],
	);

	// Called when the flip transition ends on the Flashcard component
	const handleFlipEnd = useCallback(
		async (isFlipped: boolean) => {
			// We only act when the card finished flipping back to the front
			if (isFlipped) return;
			if (!pendingRating || !current) return;

			const rating = pendingRating;
			setPendingRating(null);
			try {
				await submit.mutateAsync({ cardId: current.id, rating });
			} catch (error) {
				console.error("Error submitting review after flip:", error);
			}
		},
		[pendingRating, current, submit],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// Only allow keyboard shortcuts when card is flipped
			if (!isCardFlipped) return;

			if (e.key === "1") handleAnswer(1);
			else if (e.key === "2") handleAnswer(2);
			else if (e.key === "3") handleAnswer(3);
			else if (e.key === "4") handleAnswer(4);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [handleAnswer, isCardFlipped]);

	// Determine the page title
	const pageTitle = deck ? `Study: ${deck.name}` : "Study Session";
	const emptyMessage = deck
		? `No cards due for review in "${deck.name}". Great job!`
		: "No cards due right now. Great job!";

	if (isLoading || isCountLoading) return <div className="p-6">Loading...</div>;

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h1 className="mb-2 font-bold text-2xl">{pageTitle}</h1>
				{deck?.description && (
					<p className="text-muted-foreground">{deck.description}</p>
				)}
			</div>

			{(!queue || queue.length === 0) && totalDueCount === 0 ? (
				<Card className="p-6 text-center">
					<p className="mb-4 text-muted-foreground">{emptyMessage}</p>
					<div className="flex justify-center gap-2">
						<Button onClick={() => refetch()}>Refresh</Button>
						{deck && (
							<Button variant="outline" asChild>
								<a href="/dashboard/decks">Back to Decks</a>
							</Button>
						)}
					</div>
				</Card>
			) : (
				<div className="grid gap-4">
					<Flashcard
						className="mx-auto max-w-xl"
						front={
							<div className="whitespace-pre-wrap font-medium text-xl">
								{current?.front}
							</div>
						}
						back={
							<div className="whitespace-pre-wrap text-lg">{current?.back}</div>
						}
						isFlipped={isCardFlipped}
						onFlip={setIsCardFlipped}
						onFlipEnd={handleFlipEnd}
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
								title="1 - Again"
							>
								Again
							</Button>
							<Button
								variant="secondary"
								onClick={() => handleAnswer(2)}
								title="2 - Hard"
							>
								Hard
							</Button>
							<Button
								onClick={() => handleAnswer(3)}
								title="3 - Good"
							>
								Good
							</Button>
							<Button
								variant="outline"
								onClick={() => handleAnswer(4)}
								title="4 - Easy"
							>
								Easy
							</Button>
						</div>
					)}

					{/* Show progress info */}
					<div className="text-center text-muted-foreground text-sm">
						<p>
							Cards remaining: {totalDueCount ?? 0}
							{totalDueCount !== undefined && totalDueCount > 20 && (
								<span className="text-xs"> (showing first 20)</span>
							)}
						</p>
						{deck && allCards && <p>Total cards in deck: {allCards.length}</p>}
						{deck && (
							<Button variant="link" size="sm" asChild>
								<a href="/dashboard/decks">Back to Decks</a>
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
