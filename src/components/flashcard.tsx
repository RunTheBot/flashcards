"use client";

import type React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FlashcardProps {
	front: React.ReactNode;
	back: React.ReactNode;
	className?: string;
	onFlip?: (isFlipped: boolean) => void;
	isFlipped?: boolean;
}

export function Flashcard({
	front,
	back,
	className,
	onFlip,
	isFlipped: controlledIsFlipped,
}: FlashcardProps) {
	const [internalIsFlipped, setInternalIsFlipped] = useState(false);

	// Use controlled state if provided, otherwise use internal state
	const isFlipped =
		controlledIsFlipped !== undefined ? controlledIsFlipped : internalIsFlipped;

	const handleFlip = () => {
		const newFlippedState = !isFlipped;

		if (controlledIsFlipped !== undefined) {
			// Controlled mode - notify parent
			onFlip?.(newFlippedState);
		} else {
			// Uncontrolled mode - manage internal state
			setInternalIsFlipped(newFlippedState);
		}
	};

	return (
		<div className={cn("perspective-1000 h-64 w-full", className)}>
			<button
				type="button"
				className={cn(
					"transform-style-preserve-3d relative h-full w-full cursor-pointer border-0 bg-transparent p-0 transition-transform duration-700",
					isFlipped && "rotate-y-180",
				)}
				onClick={handleFlip}
			>
				{/* Front of card */}
				<Card className="backface-hidden absolute inset-0 flex h-full w-full items-center justify-center bg-card p-6 transition-colors hover:bg-accent/50">
					<div className="whitespace-pre-wrap text-center">{front}</div>
				</Card>

				{/* Back of card */}
				<Card className="backface-hidden absolute inset-0 flex h-full w-full rotate-y-180 items-center justify-center bg-primary p-6 text-primary-foreground">
					<div className="whitespace-pre-wrap text-center">{back}</div>
				</Card>
			</button>
		</div>
	);
}
