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

	// Normalize common params and avoid magic numbers
	const LIMIT = 20 as const;
	const deckIdParam = deckId ?? undefined;

	const utils = api.useUtils();

	// Get deck info if studying a specific deck
	const { data: deck } = api.flashcards.getDecks.useQuery(undefined, {
		select: (decks) => decks.find((d) => d.id === deckId),
		enabled: !!deckId,
	});

	// Get total cards in deck for progress tracking
	// Only need the count for UI: map to length to reduce re-renders
	const { data: allCardsCount } = api.flashcards.getCards.useQuery(
		{ deckId: deckId || "" },
		{ enabled: !!deckId, select: (cards) => cards.length },
	);

	const {
		data: queue,
		isLoading,
		isRefetching,
		refetch,
	} = api.flashcards.getDailyQueue.useQuery({
		limit: LIMIT,
		deckId: deckIdParam,
	});

	// Get the total count of due cards (not limited to 20)
	const { data: totalDueCount, isLoading: isCountLoading } =
		api.flashcards.getDueCardCount.useQuery({
			deckId: deckIdParam,
		});

	const submit = api.flashcards.submitReview.useMutation({
		onMutate: async ({ cardId }) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await utils.flashcards.getDailyQueue.cancel({
				limit: LIMIT,
				deckId: deckIdParam,
			});
			await utils.flashcards.getDueCardCount.cancel({
				deckId: deckIdParam,
			});

			// Snapshot the previous values
			const previousQueue = utils.flashcards.getDailyQueue.getData({
				limit: LIMIT,
				deckId: deckIdParam,
			});
			const previousCount = utils.flashcards.getDueCardCount.getData({
				deckId: deckIdParam,
			});

			// Optimistically update by removing the current card from the queue
			utils.flashcards.getDailyQueue.setData(
				{
					limit: LIMIT,
					deckId: deckIdParam,
				},
				(old) => {
					if (!old) return old;
					return old.filter((card) => card.id !== cardId);
				},
			);

			// Optimistically decrease the due card count
			utils.flashcards.getDueCardCount.setData(
				{
					deckId: deckIdParam,
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
						limit: LIMIT,
						deckId: deckIdParam,
					},
					context.previousQueue,
				);
			}
			if (context?.previousCount !== undefined) {
				utils.flashcards.getDueCardCount.setData(
					{
						deckId: deckIdParam,
					},
					context.previousCount,
				);
			}
		},
		onSettled: () => {
			// Always refetch after error or success to ensure we have the latest data
			utils.flashcards.getDailyQueue.invalidate({
				limit: LIMIT,
				deckId: deckIdParam,
			});
			utils.flashcards.getDueCardCount.invalidate({
				deckId: deckIdParam,
			});
		},
	});

	const current = useMemo(() => (queue?.[0] ? queue[0] : undefined), [queue]);
	const currentId = current?.id ?? null;

	// Hold a pending review (cardId + rating) until flip animation ends
	const [pendingReview, setPendingReview] = useState<null | {
		cardId: string;
		rating: 1 | 2 | 3 | 4;
	}>(null);

	// Reset card flip state and log the current card when it changes
	useEffect(() => {
		if (currentId) {
			setIsCardFlipped(false);
			// Clear any pending review when the current card changes
			setPendingReview(null);
		}
	}, [currentId]);

	// Instead of submitting immediately, set a pending rating and flip
	const handleAnswer = useCallback(
		(rating: 1 | 2 | 3 | 4) => {
			if (!current) return;
			// Prevent double submission while a review is pending or submitting
			if (pendingReview || submit.isPending) return;
			// Capture the cardId now to avoid races if the queue updates before flip ends
			setPendingReview({ cardId: current.id, rating });
			// Flip card back to front to trigger the transition
			setIsCardFlipped(false);
		},
		[current, pendingReview, submit.isPending],
	);

	// Called when the flip transition ends on the Flashcard component
	const handleFlipEnd = useCallback(
		async (isFlipped: boolean) => {
			// We only act when the card finished flipping back to the front
			if (isFlipped) return;
			if (!pendingReview) return;

			const { cardId, rating } = pendingReview;
			setPendingReview(null);
			try {
				await submit.mutateAsync({ cardId, rating });
			} catch (error) {
				console.error("Error submitting review after flip:", error);
			}
		},
		[pendingReview, submit],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// Only allow keyboard shortcuts when card is flipped
			if (!isCardFlipped) return;
			// Also block if a submission is pending/in-flight
			if (pendingReview || submit.isPending) return;

			if (e.key === "1") handleAnswer(1);
			else if (e.key === "2") handleAnswer(2);
			else if (e.key === "3") handleAnswer(3);
			else if (e.key === "4") handleAnswer(4);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [handleAnswer, isCardFlipped, pendingReview, submit.isPending]);

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
						<Button onClick={() => refetch()} disabled={isRefetching}>
							Refresh
						</Button>
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
						front={current?.front ?? ""}
						back={current?.back ?? ""}
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
								disabled={pendingReview !== null || submit.isPending}
								title="1 - Again"
							>
								Again
							</Button>
							<Button
								variant="secondary"
								onClick={() => handleAnswer(2)}
								disabled={pendingReview !== null || submit.isPending}
								title="2 - Hard"
							>
								Hard
							</Button>
							<Button
								onClick={() => handleAnswer(3)}
								disabled={pendingReview !== null || submit.isPending}
								title="3 - Good"
							>
								Good
							</Button>
							<Button
								variant="outline"
								onClick={() => handleAnswer(4)}
								disabled={pendingReview !== null || submit.isPending}
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
							{totalDueCount !== undefined && totalDueCount > LIMIT && (
								<span className="text-xs"> (showing first {LIMIT})</span>
							)}
						</p>
						{deck && allCardsCount !== undefined && (
							<p>Total cards in deck: {allCardsCount}</p>
						)}
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
