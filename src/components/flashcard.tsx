"use client";

import type React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { toast } from "sonner";

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
	const frontRef = useRef<HTMLDivElement>(null);
	const backRef = useRef<HTMLDivElement>(null);

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

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (e.ctrlKey) {
			e.preventDefault();
			e.stopPropagation();
			const textToCopy = isFlipped
				? (backRef.current?.innerText ?? "")
				: (frontRef.current?.innerText ?? "");
			const side = isFlipped ? "Back" : "Front";
			navigator.clipboard.writeText(textToCopy);
			toast.success(`${side} of flashcard copied to clipboard!`);
		} else {
			handleFlip();
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
				onClick={handleClick}
			>
				{/* Front of card */}
				<Card className="backface-hidden absolute inset-0 flex h-full w-full items-center justify-center bg-card p-6 transition-colors hover:bg-accent/50">
					<div ref={frontRef} className="whitespace-pre-wrap text-center">
						{front}
					</div>
				</Card>

				{/* Back of card */}
				<Card className="backface-hidden absolute inset-0 flex h-full w-full rotate-y-180 items-center justify-center bg-primary p-6 text-primary-foreground">
					<div ref={backRef} className="whitespace-pre-wrap text-center">
						{back}
					</div>
				</Card>
			</button>
		</div>
	);
}
