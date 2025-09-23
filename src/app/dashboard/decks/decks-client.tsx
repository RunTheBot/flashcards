"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DecksClient() {
  const utils = api.useUtils();
  const { data: decks, isLoading } = api.flashcards.getDecks.useQuery();
  const createDeck = api.flashcards.createDeck.useMutation({
    onSuccess: async () => {
      await utils.flashcards.getDecks.invalidate();
      setName("");
      setDescription("");
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
            disabled={!canCreate || createDeck.isLoading}
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
                  <button
                    className={`w-full text-left rounded-md border p-3 hover:bg-accent ${selectedDeckId === d.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDeckId(d.id)}
                  >
                    <div className="font-medium">{d.name}</div>
                    {d.description && (
                      <div className="text-sm text-muted-foreground">{d.description}</div>
                    )}
                  </button>
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
    },
  });

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const canAdd = front.trim().length > 0 && back.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cards</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Input placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} />
          <Textarea placeholder="Back" value={back} onChange={(e) => setBack(e.target.value)} />
          <Button
            onClick={() => createCard.mutate({ deckId, front, back })}
            disabled={!canAdd || createCard.isLoading}
          >
            Add Card
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : !cards || cards.length === 0 ? (
          <div className="text-muted-foreground">No cards yet. Add your first one.</div>
        ) : (
          <ul className="grid gap-2">
            {cards.map((c) => (
              <li key={c.id} className="rounded-md border p-3">
                <div className="font-medium">{c.front}</div>
                <div className="text-sm text-muted-foreground">{c.back}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
