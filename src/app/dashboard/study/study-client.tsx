"use client";

import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function StudyClient() {
	const [isCardFlipped, setIsCardFlipped] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const searchParams = useSearchParams();
	const deckId = searchParams.get("deckId");
	
	const utils = api.useUtils();
	
	// Get deck info if studying a specific deck
	const { data: deck } = api.flashcards.getDecks.useQuery(undefined, {
		select: (decks) => decks.find(d => d.id === deckId),
		enabled: !!deckId
	});
	
	// Get total cards in deck for progress tracking
	const { data: allCards } = api.flashcards.getCards.useQuery(
		{ deckId: deckId || "" },
		{ enabled: !!deckId }
	);
	
	const {
		data: queue,
		isLoading,
		refetch,
	} = api.flashcards.getDailyQueue.useQuery({ 
		limit: 20,
		deckId: deckId || undefined
	});
	
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
		async (rating: 1 | 2 | 3 | 4) => {
			if (!current || isSubmitting) return;

			setIsSubmitting(true);

			// First flip back to front
			setIsCardFlipped(false);

			// Small delay to allow flip animation to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			try {
				// Submit review; queue refetch will remove current card
				await submit.mutateAsync({ cardId: current.id, rating });
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
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [handleAnswer, isCardFlipped]);

	// Determine the page title
	const pageTitle = deck ? `Study: ${deck.name}` : "Study Session";
	const emptyMessage = deck 
		? `No cards due for review in "${deck.name}". Great job!`
		: "No cards due right now. Great job!";

	if (isLoading) return <div className="p-6">Loading...</div>;

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h1 className="mb-2 font-bold text-2xl">{pageTitle}</h1>
				{deck?.description && (
					<p className="text-muted-foreground">{deck.description}</p>
				)}
			</div>

			{!queue || queue.length === 0 ? (
				<Card className="p-6 text-center">
					<p className="mb-4 text-muted-foreground">
						{emptyMessage}
					</p>
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
						front={<div className="whitespace-pre-wrap font-medium text-xl">{current?.front}</div>}
						back={<div className="whitespace-pre-wrap text-lg">{current?.back}</div>}
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
								title="1 - Again"
							>
								Again
							</Button>
							<Button 
								variant="secondary" 
								onClick={() => handleAnswer(2)} 
								title="2 - Hard" 
								disabled={isSubmitting}
							>
								Hard
							</Button>
							<Button 
								onClick={() => handleAnswer(3)} 
								title="3 - Good" 
								disabled={isSubmitting}
							>
								Good
							</Button>
							<Button 
								variant="outline" 
								onClick={() => handleAnswer(4)} 
								title="4 - Easy" 
								disabled={isSubmitting}
							>
								Easy
							</Button>
						</div>
					)}

					{/* Show progress info */}
					<div className="text-center text-muted-foreground text-sm">
						<p>Cards remaining: {queue.length}</p>
						{deck && allCards && (
							<p>Total cards in deck: {allCards.length}</p>
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
