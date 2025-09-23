"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Settings, BookOpen, Zap, Brain } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Remove client-side settings interface - now handled server-side

export function AIFlashcardsClient() {
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState<number | "auto">("auto");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDeckName, setGeneratedDeckName] = useState<string>("");

  const utils = api.useUtils();
  const aiSettings = api.flashcards.getAISettings.useQuery();
  const generateFlashcards = api.flashcards.generateFlashcards.useMutation();

  // Initialize settings from server when loaded
  React.useEffect(() => {
    if (aiSettings.data) {
      setCardCount(aiSettings.data.defaultCardCount);
      setDifficulty(aiSettings.data.defaultDifficulty);
    }
  }, [aiSettings.data]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please describe what you want to study");
      return;
    }

    setIsGenerating(true);
    setGeneratedDeckName("");
    
    try {
      // Generate flashcards with automatic deck creation
      const result = await generateFlashcards.mutateAsync({
        topic: topic.trim(),
        count: cardCount === "auto" ? undefined : cardCount,
      });

      await utils.flashcards.getDecks.invalidate();
      
      // Get the created deck name for display
      const decks = await utils.flashcards.getDecks.fetch();
      const createdDeck = decks.find(deck => deck.id === result.deckId);
      const deckName = createdDeck?.name || "New Deck";
      
      setGeneratedDeckName(deckName);
      toast.success(`Successfully created "${deckName}" with ${result.cardsGenerated} flashcards!`);
      
      // Reset form
      setTopic("");
      
    } catch (error) {
      toast.error("Failed to generate flashcards: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = topic.trim().length > 0 && !isGenerating;

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-background">
      <div className="container mx-auto h-full px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">AI Flashcard Generator</h1>
            </div>
            <p className="text-muted-foreground">
              Create comprehensive flashcard decks using advanced AI models. Describe any topic and get high-quality study materials instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Generation Form */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Create New Deck
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {generatedDeckName && (
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        Last Generated Deck
                      </div>
                      <p className="mt-1 font-semibold">{generatedDeckName}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="topic">What do you want to study?</Label>
                    <Textarea
                      id="topic"
                      placeholder="Describe the topic in detail. The AI will automatically create a deck name and generate flashcards. For example:

'JavaScript fundamentals including variables, functions, arrays, objects, and basic DOM manipulation. Focus on ES6+ features like arrow functions, destructuring, and template literals.'

or

'The causes and major events of World War II, including key battles, political figures, and the impact on different countries. Cover both European and Pacific theaters.'"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isGenerating}
                      className="min-h-[200px] resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Be specific about what aspects you want to focus on. The AI will automatically generate an appropriate deck name.
                    </p>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="flex h-12 w-full items-center gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating deck and generating {cardCount === "auto" ? "optimal number of" : cardCount} flashcards...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Create Deck & Generate {cardCount === "auto" ? "Optimal" : cardCount} Flashcards
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Settings Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {aiSettings.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : aiSettings.data ? (
                    <>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">AI Models</Label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Main Model</span>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              {aiSettings.data.models.main.name}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Light Model</span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {aiSettings.data.models.light.name}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {aiSettings.data.models.main.description}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="card-count">Number of Cards</Label>
                        <Select
                          value={cardCount.toString()}
                          onValueChange={(value: string) => 
                            setCardCount(value === "auto" ? "auto" : Number.parseInt(value, 10))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {aiSettings.data.cardCountOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.value === "auto" ? (
                                  <div className="flex items-center gap-2">
                                    <Brain className="h-3 w-3" />
                                    {option.label}
                                  </div>
                                ) : (
                                  option.label
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty Level</Label>
                        <Select
                          value={difficulty}
                          onValueChange={(value: "beginner" | "intermediate" | "advanced") => 
                            setDifficulty(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {aiSettings.data.difficultyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Failed to load AI settings
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild variant="outline" className="w-full justify-start" size="sm">
                    <Link href="/dashboard/decks">
                      <BookOpen className="mr-2 h-4 w-4" />
                      View All Decks
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start" size="sm">
                    <Link href="/dashboard/review">
                      <Zap className="mr-2 h-4 w-4" />
                      Start Studying
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
