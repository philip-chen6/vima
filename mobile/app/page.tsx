"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, useMotionValue } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { PhoneFrame } from "@/components/PhoneFrame";
import { StarSwipeBG } from "@/components/StarSwipeBG";
import { LevelShaderBG } from "@/components/LevelShaderBG";
import { SwipeDeck } from "@/components/SwipeDeck";
import { LotteryWheel } from "@/components/LotteryWheel";
import { PayoutClaim } from "@/components/PayoutClaim";

export default function Home() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const mode = useStore((s) => s.mode);
  const reset = useStore((s) => s.reset);

  // dragX/dragY/freeze ref hoisted here so both the bg shader (rotation
  // reacts to dragX) and the swipe deck (drives the morph + card transform)
  // share one source of truth.
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const morphFreezeAtRef = useRef(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <PhoneFrame>
        <div className="absolute inset-0 bg-[#050505]" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="absolute inset-0 overflow-hidden" style={{ background: "#000000" }}>
        {/* base layer: dark vertical swipe-rotated star-swipe shader */}
        <StarSwipeBG dragX={dragX} />

        {/* overlay layer: pink cloud rising from bottom, tied to XP */}
        <LevelShaderBG />

        {/* the only foreground UI: the card */}
        <SwipeDeck dragX={dragX} dragY={dragY} morphFreezeAtRef={morphFreezeAtRef} />

        {/* mode-driven overlays */}
        <AnimatePresence>
          {(mode === "raffle" || mode === "spinning") && <LotteryWheel key="wheel" />}
          {mode === "claim" && <PayoutClaim key="claim" />}
        </AnimatePresence>

        {/* reset — solid pink, top-right */}
        <button
          onClick={reset}
          className="absolute top-4 right-4 z-[300] w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "#1a1a22",
            color: "#ffd1de",
            boxShadow: "inset 0 0 0 1px #2a2a36",
          }}
          aria-label="reset"
          title="reset"
        >
          <RotateCcw size={15} strokeWidth={2.2} />
        </button>
      </div>
    </PhoneFrame>
  );
}
