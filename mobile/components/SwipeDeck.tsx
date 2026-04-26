"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import { useStore } from "@/lib/store";
import { SwipeCard, type SwipeOutcome } from "./SwipeCard";

/**
 * The deck owns dragX/dragY/morphFreezeAtRef by default but accepts them
 * from the parent so the page can hoist them and share with the bg shader
 * (which subscribes to dragX for its weighted-rotation effect).
 */
export function SwipeDeck({
  dragX: dragXProp,
  dragY: dragYProp,
  morphFreezeAtRef: morphFreezeAtRefProp,
}: {
  dragX?: MotionValue<number>;
  dragY?: MotionValue<number>;
  morphFreezeAtRef?: RefObject<number>;
} = {}) {
  const claims = useStore((s) => s.claims);
  const deckIndex = useStore((s) => s.deckIndex);
  const verify = useStore((s) => s.verify);

  // entry direction OPPOSITE swipe-out direction:
  //   swipe right → next slides in from LEFT
  //   swipe left  → next slides in from RIGHT
  const [enterFrom, setEnterFrom] = useState<-1 | 1>(-1);

  const localDragX = useMotionValue(0);
  const localDragY = useMotionValue(0);
  const dragX = dragXProp ?? localDragX;
  const dragY = dragYProp ?? localDragY;

  // Freeze the YES/NO morph during the swipe-out → new-card-slide-in window.
  // Uses a ref + timestamp so the freeze flips synchronously, BEFORE the
  // dragX.set(0) below — a state-based flag would only flip after the next
  // render and the morph would have already started easing back by then.
  const localFreezeRef = useRef(0);
  const morphFreezeAtRef = morphFreezeAtRefProp ?? localFreezeRef;

  const handleResolve = (outcome: SwipeOutcome) => {
    if (outcome === "confirm") setEnterFrom(-1);     // swiped right → next from left
    else if (outcome === "reject") setEnterFrom(1);  // swiped left → next from right
    // Lock the morph at its current shape. Child auto-unfreezes after
    // ~600ms or as soon as the user starts dragging the new card.
    morphFreezeAtRef.current = performance.now();
    verify(outcome);
    dragX.set(0);
    dragY.set(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleResolve("confirm");
      else if (e.key === "ArrowLeft") handleResolve("reject");
      else if (e.key === "ArrowUp") handleResolve("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIndex, claims]);

  const activeClaim = claims[deckIndex % claims.length];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-full h-full max-w-[420px]">
        {activeClaim && (
          <SwipeCard
            key={`${activeClaim.id}-${deckIndex}`}
            claim={activeClaim}
            enterFrom={enterFrom}
            onResolve={handleResolve}
            dragX={dragX}
            dragY={dragY}
          />
        )}
      </div>
    </div>
  );
}
