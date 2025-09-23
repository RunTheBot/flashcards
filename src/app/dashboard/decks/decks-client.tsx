"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AIFlashcardGenerator, AIFlashcardGeneratorCard } from "@/components/ai-flashcard-generator";

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
      toast.error("Failed to delete deck: " + error.message);
    },
  });

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deckToDelete, setDeckToDelete] = useState<{id: string, name: string} | null>(null);

  const generateFlashcards = api.flashcards.generateFlashcards.useMutation({
    onSuccess: async (result) => {
      console.log('AI generation successful:', result);
      await utils.flashcards.getCards.invalidate();
      toast.success(`Generated ${result.cardsGenerated} flashcards successfully!`);
    },
    onError: (error) => {
      console.error('AI generation failed:', error);
      toast.error("Failed to generate flashcards: " + error.message);
    },
  });

  const handleAITopicSelect = async (topic: string) => {
    // Create a new deck for the AI-generated topic and immediately generate cards
    try {
      console.log('Creating deck for topic:', topic);
      const result = await createDeck.mutateAsync({ 
        name: `${topic} - AI Generated`, 
        description: `AI-generated flashcards about ${topic}` 
      });
      if (result) {
        console.log('Deck created successfully:', result.id);
        setSelectedDeckId(result.id);
        // Immediately generate flashcards for the new deck
        console.log('Starting AI generation for deck:', result.id, 'topic:', topic);
        generateFlashcards.mutate({ 
          deckId: result.id, 
          topic: topic, 
          count: 10 
        });
      }
    } catch (error) {
      console.error('Error in handleAITopicSelect:', error);
      toast.error("Failed to create deck");
    }
  };

  const handleDeleteDeck = (deck: {id: string, name: string}, event: React.MouseEvent) => {
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
    <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>New Deck</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input placeholder="Deck name" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button
              onClick={() => createDeck.mutate({ name, description: description || undefined })}
              disabled={!canCreate || createDeck.isPending}
            >
              Create Deck
            </Button>
          </CardContent>
        </Card>

        <AIFlashcardGeneratorCard 
          onTopicSelect={handleAITopicSelect} 
          isGenerating={createDeck.isPending || generateFlashcards.isPending}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Decks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : !decks || decks.length === 0 ? (
            <div className="text-muted-foreground">No decks yet. Create your first deck.</div>
          ) : (
            <ul className="grid gap-2">
              {decks.map((d) => (
                <li key={d.id}>
                  <div
                    className={`rounded-md border p-3 ${selectedDeckId === d.id ? "ring-2 ring-primary" : ""}`}
                  >
                    <button
                      className="w-full text-left hover:bg-accent rounded-md p-2 -m-2"
                      onClick={() => setSelectedDeckId(d.id)}
                    >
                      <div className="font-medium">{d.name}</div>
                      {d.description && (
                        <div className="text-sm text-muted-foreground">{d.description}</div>
                      )}
                    </button>
                    <div className="flex justify-end mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteDeck({id: d.id, name: d.name}, e)}
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

      <div className="md:col-span-2">
        {selectedDeckId ? (
          <DeckDetail deckId={selectedDeckId} />
        ) : (
          <Card>
            <CardContent className="p-6 text-muted-foreground">Select a deck to view and add cards.</CardContent>
          </Card>
        )}
      </div>
      
      {/* Deck delete confirmation dialog */}
      <Dialog open={!!deckToDelete} onOpenChange={() => setDeckToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deckToDelete?.name}"? This action cannot be undone and will also delete all cards in this deck.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeckToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDeck}
            >
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
  const { data: cards, isLoading } = api.flashcards.getCards.useQuery({ deckId });
  const createCard = api.flashcards.createCard.useMutation({
    onSuccess: async () => {
      await utils.flashcards.getCards.invalidate({ deckId });
      setFront("");
      setBack("");
      toast.success("Card created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create card: " + error.message);
    },
  });
  const updateCard = api.flashcards.updateCard.useMutation({
    onSuccess: async () => {
      await utils.flashcards.getCards.invalidate({ deckId });
      toast.success("Card updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update card: " + error.message);
    },
  });

  const deleteCard = api.flashcards.deleteCard.useMutation({
    onSuccess: async () => {
      await utils.flashcards.getCards.invalidate({ deckId });
      toast.success("Card deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete card: " + error.message);
    },
  });

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [cardToDelete, setCardToDelete] = useState<{id: string, front: string} | null>(null);

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
      updateCard.mutate({ cardId: editingCard, front: editFront, back: editBack });
      setEditingCard(null);
      setEditFront("");
      setEditBack("");
    }
  };

  const handleDeleteCard = (card: {id: string, front: string}, event: React.MouseEvent) => {
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <CardTitle>Cards</CardTitle>
        <AIFlashcardGenerator deckId={deckId} />
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Side-by-side card creation form */}
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Front</label>
              <Textarea 
                placeholder="Enter the front of the card..." 
                value={front} 
                onChange={(e) => setFront(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Back</label>
              <Textarea 
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
          <div className="text-muted-foreground">No cards yet. Add your first one.</div>
        ) : (
          <ul className="grid gap-3">
            {cards.map((c) => (
              <li key={c.id} className="rounded-md border p-4">
                {editingCard === c.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Front</label>
                        <Textarea
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Back</label>
                        <Textarea
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
                        onClick={(e) => handleDeleteCard({id: c.id, front: c.front}, e)}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Front</div>
                        <div className="font-medium">{c.front}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Back</div>
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
                        onClick={(e) => handleDeleteCard({id: c.id, front: c.front}, e)}
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
              Are you sure you want to delete this card? This action cannot be undone.
              <br />
              <br />
              <strong>Card:</strong> {cardToDelete?.front}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCard}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
