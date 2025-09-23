"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DecksClient() {
	const utils = api.useUtils();
	const { data: decks, isLoading } = api.flashcards.getDecks.useQuery();
	const createDeck = api.flashcards.createDeck.useMutation({
		onSuccess: async () => {
			await utils.flashcards.getDecks.invalidate();
			setName("");
			setDescription("");
			toast.success("Deck created successfully!");
		},
	});

	const deleteDeck = api.flashcards.deleteDeck.useMutation({
		onSuccess: async () => {
			await utils.flashcards.getDecks.invalidate();
			setSelectedDeckId(null);
			toast.success("Deck deleted successfully!");
		},
		onError: (error) => {
			toast.error(`Failed to delete deck: ${error.message}`);
		},
	});

	const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [deckToDelete, setDeckToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);



	const handleDeleteDeck = (
		deck: { id: string; name: string },
		event: React.MouseEvent,
	) => {
		// Check if Ctrl+Shift+Click for instant delete
		if (event.ctrlKey && event.shiftKey) {
			event.preventDefault();
			deleteDeck.mutate({ deckId: deck.id });
		} else {
			// Regular click - show confirmation dialog
			setDeckToDelete(deck);
		}
	};

	const confirmDeleteDeck = () => {
		if (deckToDelete) {
			deleteDeck.mutate({ deckId: deckToDelete.id });
			setDeckToDelete(null);
		}
	};

	const canCreate = name.trim().length > 0;

	return (
		<div className="grid gap-6">
			<div className="grid gap-6 lg:grid-cols-[400px,1fr]">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Create New Deck</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-3">
							<Input
								placeholder="Deck name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
							<Textarea
								placeholder="Description (optional)"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
							<Button
								onClick={() =>
									createDeck.mutate({
										name,
										description: description || undefined,
									})
								}
								disabled={!canCreate || createDeck.isPending}
							>
								Create Deck
							</Button>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Your Decks</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="text-muted-foreground">Loading...</div>
						) : !decks || decks.length === 0 ? (
							<div className="text-muted-foreground">
								No decks yet. Create your first deck.
							</div>
						) : (
							<ul className="grid gap-2">
								{decks.map((d) => (
									<li key={d.id}>
										<div
											className={`rounded-md border p-3 ${selectedDeckId === d.id ? "ring-2 ring-primary" : ""}`}
										>
											<button
												type="button"
												className="-m-2 w-full rounded-md p-2 text-left hover:bg-accent"
												onClick={() => setSelectedDeckId(d.id)}
											>
												<div className="font-medium">{d.name}</div>
												{d.description && (
													<div className="text-muted-foreground text-sm">
														{d.description}
													</div>
												)}
											</button>
											<div className="mt-2 flex justify-end">
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:text-destructive"
													onClick={(e) =>
														handleDeleteDeck({ id: d.id, name: d.name }, e)
													}
													title="Click to delete (Ctrl+Shift+Click for instant delete)"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			{selectedDeckId ? (
				<DeckDetail deckId={selectedDeckId} />
			) : (
				<Card>
					<CardContent className="p-6 text-center text-muted-foreground">
						Select a deck above to view and manage its cards.
					</CardContent>
				</Card>
			)}

			{/* Deck delete confirmation dialog */}
			<Dialog open={!!deckToDelete} onOpenChange={() => setDeckToDelete(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Deck</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{deckToDelete?.name}"? This
							action cannot be undone and will also delete all cards in this
							deck.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeckToDelete(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDeleteDeck}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function DeckDetail({ deckId }: { deckId: string }) {
	const utils = api.useUtils();
	const { data: cards, isLoading } = api.flashcards.getCards.useQuery({
		deckId,
	});
	const createCard = api.flashcards.createCard.useMutation({
		onSuccess: async () => {
			await utils.flashcards.getCards.invalidate({ deckId });
			setFront("");
			setBack("");
			toast.success("Card created successfully!");
		},
		onError: (error) => {
			toast.error(`Failed to create card: ${error.message}`);
		},
	});
	const updateCard = api.flashcards.updateCard.useMutation({
		onSuccess: async () => {
			await utils.flashcards.getCards.invalidate({ deckId });
			toast.success("Card updated successfully!");
		},
		onError: (error) => {
			toast.error(`Failed to update card: ${error.message}`);
		},
	});

	const deleteCard = api.flashcards.deleteCard.useMutation({
		onSuccess: async () => {
			await utils.flashcards.getCards.invalidate({ deckId });
			toast.success("Card deleted successfully!");
		},
		onError: (error) => {
			toast.error(`Failed to delete card: ${error.message}`);
		},
	});

	const [front, setFront] = useState("");
	const [back, setBack] = useState("");
	const [editingCard, setEditingCard] = useState<string | null>(null);
	const [editFront, setEditFront] = useState("");
	const [editBack, setEditBack] = useState("");
	const [cardToDelete, setCardToDelete] = useState<{
		id: string;
		front: string;
	} | null>(null);

	const canAdd = front.trim().length > 0 && back.trim().length > 0;
	const canUpdate = editFront.trim().length > 0 && editBack.trim().length > 0;

	const startEditing = (card: { id: string; front: string; back: string }) => {
		setEditingCard(card.id);
		setEditFront(card.front);
		setEditBack(card.back);
	};

	const cancelEditing = () => {
		setEditingCard(null);
		setEditFront("");
		setEditBack("");
	};

	const saveCard = () => {
		if (editingCard && canUpdate) {
			updateCard.mutate({
				cardId: editingCard,
				front: editFront,
				back: editBack,
			});
			setEditingCard(null);
			setEditFront("");
			setEditBack("");
		}
	};

	const handleDeleteCard = (
		card: { id: string; front: string },
		event: React.MouseEvent,
	) => {
		// Check if Ctrl+Shift+Click for instant delete
		if (event.ctrlKey && event.shiftKey) {
			event.preventDefault();
			deleteCard.mutate({ cardId: card.id });
		} else {
			// Regular click - show confirmation dialog
			setCardToDelete(card);
		}
	};

	const confirmDeleteCard = () => {
		if (cardToDelete) {
			deleteCard.mutate({ cardId: cardToDelete.id });
			setCardToDelete(null);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cards</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				{/* Side-by-side card creation form */}
				<div className="grid gap-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="card-front" className="font-medium text-sm">
								Front
							</label>
							<Textarea
								id="card-front"
								placeholder="Enter the front of the card..."
								value={front}
								onChange={(e) => setFront(e.target.value)}
								className="min-h-[100px]"
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="card-back" className="font-medium text-sm">
								Back
							</label>
							<Textarea
								id="card-back"
								placeholder="Enter the back of the card..."
								value={back}
								onChange={(e) => setBack(e.target.value)}
								className="min-h-[100px]"
							/>
						</div>
					</div>
					<Button
						onClick={() => createCard.mutate({ deckId, front, back })}
						disabled={!canAdd || createCard.isPending}
						className="w-fit"
					>
						Add Card
					</Button>
				</div>

				{isLoading ? (
					<div className="text-muted-foreground">Loading...</div>
				) : !cards || cards.length === 0 ? (
					<div className="text-muted-foreground">
						No cards yet. Add your first one.
					</div>
				) : (
					<ul className="grid gap-3">
						{cards.map((c) => (
							<li key={c.id} className="rounded-md border p-4">
								{editingCard === c.id ? (
									<div className="space-y-3">
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											<div className="space-y-2">
												<label
													htmlFor={`edit-front-${c.id}`}
													className="font-medium text-sm"
												>
													Front
												</label>
												<Textarea
													id={`edit-front-${c.id}`}
													value={editFront}
													onChange={(e) => setEditFront(e.target.value)}
													className="min-h-[80px]"
												/>
											</div>
											<div className="space-y-2">
												<label
													htmlFor={`edit-back-${c.id}`}
													className="font-medium text-sm"
												>
													Back
												</label>
												<Textarea
													id={`edit-back-${c.id}`}
													value={editBack}
													onChange={(e) => setEditBack(e.target.value)}
													className="min-h-[80px]"
												/>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												onClick={saveCard}
												disabled={!canUpdate || updateCard.isPending}
												size="sm"
											>
												Save
											</Button>
											<Button
												onClick={cancelEditing}
												variant="outline"
												size="sm"
											>
												Cancel
											</Button>
											<Button
												onClick={(e) =>
													handleDeleteCard({ id: c.id, front: c.front }, e)
												}
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive"
												title="Click to delete (Ctrl+Shift+Click for instant delete)"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								) : (
									<div className="space-y-2">
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											<div>
												<div className="mb-1 font-medium text-muted-foreground text-sm">
													Front
												</div>
												<div className="font-medium">{c.front}</div>
											</div>
											<div>
												<div className="mb-1 font-medium text-muted-foreground text-sm">
													Back
												</div>
												<div className="text-sm">{c.back}</div>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												onClick={() => startEditing(c)}
												variant="outline"
												size="sm"
												className="w-fit"
											>
												Edit
											</Button>
											<Button
												onClick={(e) =>
													handleDeleteCard({ id: c.id, front: c.front }, e)
												}
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive"
												title="Click to delete (Ctrl+Shift+Click for instant delete)"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								)}
							</li>
						))}
					</ul>
				)}
			</CardContent>

			{/* Delete confirmation dialog */}
			<Dialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Card</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this card? This action cannot be
							undone.
							<br />
							<br />
							<strong>Card:</strong> {cardToDelete?.front}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCardToDelete(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDeleteCard}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
