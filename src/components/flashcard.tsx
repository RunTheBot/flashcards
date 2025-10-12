"use client";

import type React from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface FlashcardProps {
	front: React.ReactNode;
	back: React.ReactNode;
	className?: string;
	onFlip?: (isFlipped: boolean) => void;
	onFlipEnd?: (isFlipped: boolean) => void;
	isFlipped?: boolean;
}

export function Flashcard({
	front,
	back,
	className,
	onFlip,
	onFlipEnd,
	isFlipped: controlledIsFlipped,
}: FlashcardProps) {
	const [internalIsFlipped, setInternalIsFlipped] = useState(false);
	const frontRef = useRef<HTMLDivElement>(null);
	const backRef = useRef<HTMLDivElement>(null);
	// const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
	// const isLongPressRef = useRef(false);

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

	const copyCardContent = useCallback(() => {
		const textToCopy = isFlipped
			? (backRef.current?.innerText ?? "")
			: (frontRef.current?.innerText ?? "");
		const side = isFlipped ? "Back" : "Front";
		navigator.clipboard.writeText(textToCopy);
		toast.success(`${side} of flashcard copied to clipboard!`);
	}, [isFlipped]);

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		// If it was a long press, don't flip the card
		// if (isLongPressRef.current) {
		// 	isLongPressRef.current = false;
		// 	return;
		// }

		if (e.ctrlKey) {
			e.preventDefault();
			e.stopPropagation();
			copyCardContent();
		} else {
			handleFlip();
		}
	};

	const lastFlipEndRef = useRef<number>(0);
	const handleTransitionEnd = (e: React.TransitionEvent<HTMLButtonElement>) => {
		// Only react to the 3D flip transform finishing on the button itself
		if (e.currentTarget !== e.target) return;
		if (e.propertyName !== "transform") return;
		// Debounce multiple transitionend events occurring in quick succession
		const now = Date.now();
		if (now - lastFlipEndRef.current < 50) return;
		lastFlipEndRef.current = now;
		onFlipEnd?.(isFlipped);
	};

	const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		copyCardContent();
	};

	// const handlePointerDown = () => {
	// 	isLongPressRef.current = false;
	// 	longPressTimerRef.current = setTimeout(() => {
	// 		isLongPressRef.current = true;
	// 		copyCardContent();
	// 		// Add haptic feedback on mobile devices that support it
	// 		if ('vibrate' in navigator) {
	// 			navigator.vibrate(50);
	// 		}
	// 	}, 500); // 500ms for long press
	// };

	// const handlePointerUp = () => {
	// 	if (longPressTimerRef.current) {
	// 		clearTimeout(longPressTimerRef.current);
	// 		longPressTimerRef.current = null;
	// 	}
	// };

	return (
		<div className={cn("perspective-1000 w-full", className)}>
			<button
				type="button"
				className={cn(
					"transform-style-preserve-3d relative w-full cursor-pointer border-0 bg-transparent p-0 transition-transform duration-700",
					isFlipped && "rotate-y-180",
				)}
				onClick={handleClick}
				onContextMenu={handleContextMenu}
				onTransitionEnd={handleTransitionEnd}
				// onPointerDown={handlePointerDown}
				// onPointerUp={handlePointerUp}
				// onPointerLeave={handlePointerUp}
			>
				{/* Front of card */}
				<Card className={cn(
					"backface-hidden flex min-h-64 w-full items-center justify-center bg-card p-6 transition-colors hover:bg-accent/50",
					isFlipped && "absolute inset-0"
				)}>
					<div ref={frontRef} className="w-full text-center">
						{typeof front === "string" ? (
							<MarkdownRenderer content={front} />
						) : (
							front
						)}
					</div>
				</Card>

				{/* Back of card */}
				<Card className={cn(
					"backface-hidden flex min-h-64 w-full rotate-y-180 items-center justify-center bg-primary p-6 text-primary-foreground",
					!isFlipped && "absolute inset-0"
				)}>
					<div ref={backRef} className="w-full text-center">
						{typeof back === "string" ? (
							<MarkdownRenderer content={back} />
						) : (
							back
						)}
					</div>
				</Card>
			</button>
		</div>
	);
}
