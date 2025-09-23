"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FlashcardProps {
  front: React.ReactNode
  back: React.ReactNode
  className?: string
  onFlip?: (isFlipped: boolean) => void
  isFlipped?: boolean
}

export function Flashcard({ front, back, className, onFlip, isFlipped: controlledIsFlipped }: FlashcardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const isFlipped = controlledIsFlipped !== undefined ? controlledIsFlipped : internalIsFlipped

  const handleFlip = () => {
    const newFlippedState = !isFlipped
    
    if (controlledIsFlipped !== undefined) {
      // Controlled mode - notify parent
      onFlip?.(newFlippedState)
    } else {
      // Uncontrolled mode - manage internal state
      setInternalIsFlipped(newFlippedState)
    }
  }

  return (
    <div className={cn("perspective-1000 w-full h-64", className)}>
      <div
        className={cn(
          "relative w-full h-full cursor-pointer transition-transform duration-700 transform-style-preserve-3d",
          isFlipped && "rotate-y-180",
        )}
        onClick={handleFlip}
      >
        {/* Front of card */}
        <Card className="absolute inset-0 w-full h-full backface-hidden flex items-center justify-center p-6 bg-card hover:bg-accent/50 transition-colors">
          <div className="text-center">{front}</div>
        </Card>

        {/* Back of card */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 bg-primary text-primary-foreground">
          <div className="text-center">{back}</div>
        </Card>
      </div>
    </div>
  )
}
