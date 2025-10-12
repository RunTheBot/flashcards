"use client";

import { ImagePasteTextarea } from "@/components/image-paste-textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BookOpen, Edit, Info, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function DecksClient() {
	const utils = api.useUtils();
	const { data: decks, isLoading } = api.flashcards.getDecks.useQuery();
	const createDeck = api.flashcards.createDeck.useMutation({
		onMutate: async (newDeck) => {
			// Cancel any outgoing refetches
			await utils.flashcards.getDecks.cancel();
			// Snapshot the previous value
			const previousDecks = utils.flashcards.getDecks.getData();
			// Optimistically update to the new value
			utils.flashcards.getDecks.setData(undefined, (old) => [
				...(old ?? []),
				{
					...newDeck,
					id: `optimistic-${Date.now()}`,
					studying: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					userId: "",
					description: newDeck.description ?? null,
					generationPrompt: null,
					generationMode: null,
					generationModel: null,
					generationCardCount: null,
					generationDifficulty: null,
					isAIGenerated: false,
				},
			]);
			// Return a context object with the snapshotted value
			return { previousDecks };
		},
		onError: (err, newDeck, context) => {
			// Rollback to the previous value if mutation fails
			if (context?.previousDecks) {
				utils.flashcards.getDecks.setData(undefined, context.previousDecks);
			}
			toast.error(`Failed to create deck: ${err.message}`);
		},
		onSettled: async () => {
			await utils.flashcards.getDecks.invalidate();
			setName("");
			setDescription("");
		},
		onSuccess: () => {
			toast.success("Deck created successfully!");
		},
	});

	const deleteDeck = api.flashcards.deleteDeck.useMutation({
		onMutate: async ({ deckId }) => {
			await utils.flashcards.getDecks.cancel();
			const previousDecks = utils.flashcards.getDecks.getData();
			utils.flashcards.getDecks.setData(undefined, (old) =>
				old?.filter((deck) => deck.id !== deckId),
			);
			return { previousDecks };
		},
		onError: (err, newDeck, context) => {
			if (context?.previousDecks) {
				utils.flashcards.getDecks.setData(undefined, context.previousDecks);
			}
			toast.error(`Failed to delete deck: ${err.message}`);
		},
		onSettled: async () => {
			await utils.flashcards.getDecks.invalidate();
			setSelectedDeckId(null);
		},
		onSuccess: () => {
			toast.success("Deck deleted successfully!");
		},
	});

	const updateDeck = api.flashcards.updateDeck.useMutation({
		onMutate: async (updatedDeck) => {
			await utils.flashcards.getDecks.cancel();
			const previousDecks = utils.flashcards.getDecks.getData();
			utils.flashcards.getDecks.setData(undefined, (old) =>
				old?.map((deck) =>
					deck.id === updatedDeck.deckId ? { ...deck, ...updatedDeck } : deck,
				),
			);
			return { previousDecks };
		},
		onError: (err, newDeck, context) => {
			if (context?.previousDecks) {
				utils.flashcards.getDecks.setData(undefined, context.previousDecks);
			}
			toast.error(`Failed to update deck: ${err.message}`);
		},
		onSettled: async () => {
			await utils.flashcards.getDecks.invalidate();
			setEditingDeck(null);
		},
		onSuccess: () => {
			toast.success("Deck updated successfully!");
		},
	});

	const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [deckToDelete, setDeckToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [editingDeck, setEditingDeck] = useState<{
		id: string;
		name: string;
		description?: string;
		studying: boolean;
	} | null>(null);
	const [editDeckName, setEditDeckName] = useState("");
	const [editDeckDescription, setEditDeckDescription] = useState("");
	const [aiMetadataDialogOpen, setAiMetadataDialogOpen] = useState(false);
	const [selectedAIMetadata, setSelectedAIMetadata] = useState<{
		id: string;
		name: string;
		generationPrompt?: string | null;
		generationMode?: string | null;
		generationModel?: string | null;
		generationCardCount?: number | null;
		generationDifficulty?: string | null;
		isAIGenerated?: boolean | null;
		createdAt: Date;
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

	const startEditingDeck = (deck: {
		id: string;
		name: string;
		description?: string | null;
		studying: boolean;
	}) => {
		setEditingDeck({
			id: deck.id,
			name: deck.name,
			description: deck.description || undefined,
			studying: deck.studying,
		});
		setEditDeckName(deck.name);
		setEditDeckDescription(deck.description || "");
	};

	const cancelEditingDeck = () => {
		setEditingDeck(null);
		setEditDeckName("");
		setEditDeckDescription("");
	};

	const saveEditedDeck = () => {
		if (editingDeck && editDeckName.trim().length > 0) {
			updateDeck.mutate({
				deckId: editingDeck.id,
				name: editDeckName,
				description: editDeckDescription || undefined,
				studying: editingDeck.studying,
			});
		}
	};

	const showAIMetadata = (deck: {
		id: string;
		name: string;
		generationPrompt?: string | null;
		generationMode?: string | null;
		generationModel?: string | null;
		generationCardCount?: number | null;
		generationDifficulty?: string | null;
		isAIGenerated?: boolean | null;
		createdAt: Date;
	}) => {
		setSelectedAIMetadata(deck);
		setAiMetadataDialogOpen(true);
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
						<CardTitle className="flex items-center justify-between">
							Your Decks
							<Button variant="outline" size="sm" asChild>
								<Link href="/dashboard/study">
									<BookOpen className="mr-2 h-4 w-4" />
									Study All
								</Link>
							</Button>
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3">
						{isLoading ? (
							<div className="text-muted-foreground">Loading...</div>
						) : !decks || decks.length === 0 ? (
							<div className="py-8 text-center text-muted-foreground">
								No decks yet. Create your first deck.
							</div>
						) : (
							<ul className="grid gap-3">
								{decks.map((d) => (
									<li key={d.id} className="group relative">
										<div
											className={`relative flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:shadow-md ${
												selectedDeckId === d.id
													? "ring-2 ring-primary"
													: "hover:border-primary/50"
											}`}
										>
											<div className="flex-1 pr-4">
												<div className="font-medium text-foreground">
													{d.name}
												</div>
												{d.description && (
													<div className="line-clamp-1 text-muted-foreground text-sm">
														{d.description}
													</div>
												)}
											</div>
											<div className="relative z-20 flex items-center gap-2">
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`studying-${d.id}`}
														checked={d.studying}
														onCheckedChange={() => {
															updateDeck.mutate({
																deckId: d.id,
																name: d.name,
																description: d.description ?? undefined,
																studying: !d.studying,
															});
														}}
													/>
													<label
														htmlFor={`studying-${d.id}`}
														className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
													>
														Studying
													</label>
												</div>
												<Button
													variant="outline"
													size="sm"
													asChild
													onClick={(e) => e.stopPropagation()}
												>
													<Link
														href={`/dashboard/study?deckId=${d.id}`}
														className="flex items-center"
													>
														<BookOpen className="mr-2 h-4 w-4" />
														Study
													</Link>
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-muted-foreground hover:text-foreground"
													onClick={(e) => {
														e.stopPropagation();
														startEditingDeck(d);
													}}
													title="Edit deck"
												>
													<Edit className="h-4 w-4" />
												</Button>
												{d.isAIGenerated && (
													<Button
														variant="ghost"
														size="icon"
														className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
														onClick={(e) => {
															e.stopPropagation();
															showAIMetadata(d);
														}}
														title="View AI generation info"
													>
														<Info className="h-4 w-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:bg-destructive/10 hover:text-destructive"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteDeck({ id: d.id, name: d.name }, e);
													}}
													title="Delete deck"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
										<button
											type="button"
											onClick={() => setSelectedDeckId(d.id)}
											className="absolute inset-0 z-10 h-full w-full rounded-lg"
											aria-label={`Select deck: ${d.name}`}
										/>
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

			{/* Deck edit dialog */}
			<Dialog open={!!editingDeck} onOpenChange={() => cancelEditingDeck()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Deck</DialogTitle>
						<DialogDescription>
							Update the name and description for "{editingDeck?.name}"
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<label htmlFor="edit-deck-name" className="font-medium text-sm">
								Deck Name
							</label>
							<Input
								id="edit-deck-name"
								value={editDeckName}
								onChange={(e) => setEditDeckName(e.target.value)}
								placeholder="Enter deck name..."
							/>
						</div>
						<div className="grid gap-2">
							<label
								htmlFor="edit-deck-description"
								className="font-medium text-sm"
							>
								Description (optional)
							</label>
							<Textarea
								id="edit-deck-description"
								value={editDeckDescription}
								onChange={(e) => setEditDeckDescription(e.target.value)}
								placeholder="Enter deck description..."
								className="min-h-[80px]"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={cancelEditingDeck}>
							Cancel
						</Button>
						<Button
							onClick={saveEditedDeck}
							disabled={!editDeckName.trim() || updateDeck.isPending}
						>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* AI Metadata dialog */}
			<Dialog
				open={aiMetadataDialogOpen}
				onOpenChange={setAiMetadataDialogOpen}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Info className="h-5 w-5 text-blue-600" />
							AI Generation Information
						</DialogTitle>
						<DialogDescription>
							Details about how "{selectedAIMetadata?.name}" was generated using
							AI
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-6 py-4">
						<div className="grid gap-4">
							<div className="grid gap-2">
								<span className="font-medium text-sm">Generation Mode</span>
								<div className="rounded-md bg-muted p-3 text-sm">
									{selectedAIMetadata?.generationMode === "topic"
										? "Topic-based Generation"
										: selectedAIMetadata?.generationMode === "notes"
											? "Notes Conversion"
											: selectedAIMetadata?.generationMode === "converter"
												? "Format Converter"
												: "Unknown"}
								</div>
							</div>

							{selectedAIMetadata?.generationModel && (
								<div className="grid gap-2">
									<span className="font-medium text-sm">AI Model</span>
									<div className="rounded-md bg-muted p-3 text-sm">
										{selectedAIMetadata.generationModel}
									</div>
								</div>
							)}

							{selectedAIMetadata?.generationCardCount && (
								<div className="grid gap-2">
									<span className="font-medium text-sm">Target Card Count</span>
									<div className="rounded-md bg-muted p-3 text-sm">
										{selectedAIMetadata.generationCardCount} cards
									</div>
								</div>
							)}

							{selectedAIMetadata?.generationDifficulty && (
								<div className="grid gap-2">
									<span className="font-medium text-sm">Difficulty Level</span>
									<div className="rounded-md bg-muted p-3 text-sm capitalize">
										{selectedAIMetadata.generationDifficulty}
									</div>
								</div>
							)}

							{selectedAIMetadata?.generationPrompt && (
								<div className="grid gap-2">
									<span className="font-medium text-sm">Original Prompt</span>
									<div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
										{selectedAIMetadata.generationPrompt}
									</div>
								</div>
							)}

							<div className="grid gap-2">
								<span className="font-medium text-sm">Generated On</span>
								<div className="rounded-md bg-muted p-3 text-sm">
									{selectedAIMetadata?.createdAt?.toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button onClick={() => setAiMetadataDialogOpen(false)}>
							Close
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
		onMutate: async (newCard) => {
			await utils.flashcards.getCards.cancel({ deckId });
			const previousCards = utils.flashcards.getCards.getData({ deckId });
			utils.flashcards.getCards.setData({ deckId }, (old) => [
				...(old ?? []),
				{
					...newCard,
					id: `optimistic-${Date.now()}`,
					createdAt: new Date(),
					updatedAt: new Date(),
					deckId: deckId,
					userId: "",
					reviewedAt: new Date(),
					ivl: 0,
					reps: 0,
					lapses: 0,
					ease: 0,
					state: 0,
					stability: 0,
					difficulty: 0,
					elapsed_days: 0,
					scheduled_days: 0,
					due: new Date(),
					learning_steps: 0,
					last_review: new Date(),
				},
			]);
			setFront("");
			setBack("");
			return { previousCards };
		},
		onError: (err, newCard, context) => {
			if (context?.previousCards) {
				utils.flashcards.getCards.setData({ deckId }, context.previousCards);
			}
			toast.error(`Failed to create card: ${err.message}`);
		},
		onSettled: async () => {
			await utils.flashcards.getCards.invalidate({ deckId });
		},
		onSuccess: () => {
			toast.success("Card created successfully!");
		},
	});
	const updateCard = api.flashcards.updateCard.useMutation({
		onMutate: async (updatedCard) => {
			await utils.flashcards.getCards.cancel({ deckId });
			const previousCards = utils.flashcards.getCards.getData({ deckId });
			utils.flashcards.getCards.setData({ deckId }, (old) =>
				old?.map((card) =>
					card.id === updatedCard.cardId ? { ...card, ...updatedCard } : card,
				),
			);
			setEditingCard(null);
			setEditFront("");
			setEditBack("");
			return { previousCards };
		},
		onError: (err, newCard, context) => {
			if (context?.previousCards) {
				utils.flashcards.getCards.setData({ deckId }, context.previousCards);
			}
			toast.error(`Failed to update card: ${err.message}`);
		},
		onSettled: async () => {
			await utils.flashcards.getCards.invalidate({ deckId });
		},
		onSuccess: () => {
			toast.success("Card updated successfully!");
		},
	});

	const deleteCard = api.flashcards.deleteCard.useMutation({
		onMutate: async ({ cardId }) => {
			await utils.flashcards.getCards.cancel({ deckId });
			const previousCards = utils.flashcards.getCards.getData({ deckId });
			utils.flashcards.getCards.setData({ deckId }, (old) =>
				old?.filter((card) => card.id !== cardId),
			);
			return { previousCards };
		},
		onError: (err, newCard, context) => {
			if (context?.previousCards) {
				utils.flashcards.getCards.setData({ deckId }, context.previousCards);
			}
			toast.error(`Failed to delete card: ${err.message}`);
		},
		onSettled: async () => {
			await utils.flashcards.getCards.invalidate({ deckId });
		},
		onSuccess: () => {
			toast.success("Card deleted successfully!");
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
							<ImagePasteTextarea
								id="card-front"
								placeholder="Enter the front of the card... (Paste images with Ctrl+V)"
								value={front}
								onChange={setFront}
								className="min-h-[100px]"
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="card-back" className="font-medium text-sm">
								Back
							</label>
							<ImagePasteTextarea
								id="card-back"
								placeholder="Enter the back of the card... (Paste images with Ctrl+V)"
								value={back}
								onChange={setBack}
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
												<ImagePasteTextarea
													id={`edit-front-${c.id}`}
													value={editFront}
													onChange={setEditFront}
													className="min-h-[80px]"
													placeholder="Paste images with Ctrl+V"
												/>
											</div>
											<div className="space-y-2">
												<label
													htmlFor={`edit-back-${c.id}`}
													className="font-medium text-sm"
												>
													Back
												</label>
												<ImagePasteTextarea
													id={`edit-back-${c.id}`}
													value={editBack}
													onChange={setEditBack}
													className="min-h-[80px]"
													placeholder="Paste images with Ctrl+V"
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
												<div className="font-medium">
													<MarkdownRenderer content={c.front} />
												</div>
											</div>
											<div>
												<div className="mb-1 font-medium text-muted-foreground text-sm">
													Back
												</div>
												<div className="text-sm">
													<MarkdownRenderer content={c.back} />
												</div>
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
