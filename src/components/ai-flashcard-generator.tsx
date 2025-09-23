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
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AIFlashcardGeneratorProps {
	deckId: string;
	onCardsGenerated?: () => void;
}

export function AIFlashcardGenerator({
	deckId,
	onCardsGenerated,
}: AIFlashcardGeneratorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [topic, setTopic] = useState("");
	const [count, setCount] = useState(10);

	const utils = api.useUtils();
	const generateFlashcards = api.flashcards.generateFlashcards.useMutation({
		onSuccess: async (result) => {
			await utils.flashcards.getCards.invalidate({ deckId });
			setTopic("");
			setCount(10);
			setIsOpen(false);
			toast.success(
				`Generated ${result.cardsGenerated} flashcards successfully!`,
			);
			onCardsGenerated?.();
		},
		onError: (error) => {
			toast.error(`Failed to generate flashcards: ${error.message}`);
		},
	});

	const handleGenerate = () => {
		if (!topic.trim()) {
			toast.error("Please enter a topic");
			return;
		}
		generateFlashcards.mutate({ deckId, topic: topic.trim(), count });
	};

	const canGenerate = topic.trim().length > 0 && count >= 1 && count <= 20;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="flex items-center gap-2">
					<Sparkles className="h-4 w-4" />
					Generate with AI
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5" />
						Generate AI Flashcards
					</DialogTitle>
					<DialogDescription>
						Use AI to automatically generate flashcards on any topic. Just
						describe what you want to study!
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="topic">Topic</Label>
						<Input
							id="topic"
							placeholder="e.g., JavaScript fundamentals, World War II, Photosynthesis..."
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
							disabled={generateFlashcards.isPending}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="count">Number of cards</Label>
						<Input
							id="count"
							type="number"
							min="1"
							max="20"
							value={count}
							onChange={(e) =>
								setCount(
									Math.max(
										1,
										Math.min(20, Number.parseInt(e.target.value) || 1),
									),
								)
							}
							disabled={generateFlashcards.isPending}
						/>
						<p className="text-muted-foreground text-xs">
							Generate between 1 and 20 flashcards
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setIsOpen(false)}
						disabled={generateFlashcards.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleGenerate}
						disabled={!canGenerate || generateFlashcards.isPending}
						className="flex items-center gap-2"
					>
						{generateFlashcards.isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Generating...
							</>
						) : (
							<>
								<Sparkles className="h-4 w-4" />
								Generate Cards
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface AIFlashcardGeneratorCardProps {
	onTopicSelect: (topic: string) => void;
	isGenerating?: boolean;
}

export function AIFlashcardGeneratorCard({
	onTopicSelect,
	isGenerating = false,
}: AIFlashcardGeneratorCardProps) {
	const [topic, setTopic] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (topic.trim() && !isGenerating) {
			onTopicSelect(topic.trim());
			setTopic("");
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Sparkles className="h-5 w-5" />
					AI Flashcard Generator
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="ai-topic">What would you like to study?</Label>
						<Input
							id="ai-topic"
							placeholder="e.g., JavaScript fundamentals, World War II, Photosynthesis..."
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
							disabled={isGenerating}
						/>
					</div>
					<Button
						type="submit"
						disabled={!topic.trim() || isGenerating}
						className="flex w-full items-center gap-2"
					>
						{isGenerating ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Creating & Generating...
							</>
						) : (
							<>
								<Sparkles className="h-4 w-4" />
								Create Deck with AI
							</>
						)}
					</Button>
				</form>
				<div className="mt-4 text-muted-foreground text-sm">
					<p>
						AI will generate a complete set of flashcards on your chosen topic
						automatically.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
