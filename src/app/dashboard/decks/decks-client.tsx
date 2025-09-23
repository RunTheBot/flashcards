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

  const canCreate = name.trim().length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Deck</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete "{d.name}"? This action cannot be undone and will also delete all cards in this deck.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteDeck.mutate({ deckId: d.id })}
                              disabled={deleteDeck.isPending}
                            >
                              {deleteDeck.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cards</CardTitle>
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
                    <Button
                      onClick={() => startEditing(c)}
                      variant="outline"
                      size="sm"
                      className="w-fit"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
