"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "@/lib/store";
import { SwipeCard, type SwipeOutcome } from "./SwipeCard";
import { XPFloaterStack, type FloatEvent } from "./XPFloater";

const VISIBLE = 3;

export function SwipeDeck() {
  const claims = useStore((s) => s.claims);
  const deckIndex = useStore((s) => s.deckIndex);
  const verify = useStore((s) => s.verify);
  const [floaters, setFloaters] = useState<FloatEvent[]>([]);
  const idRef = useRef(0);

  const handleResolve = (outcome: SwipeOutcome) => {
    const decision = outcome;
    const result = verify(decision);
    if (result.gainedXP > 0) {
      const id = ++idRef.current;
      const claim = claims[deckIndex % claims.length];
      const isRare = claim?.rare ?? false;
      setFloaters((f) => [
        ...f,
        { id, amount: result.gainedXP, rare: isRare, x: (Math.random() - 0.5) * 60, y: -10 },
      ]);
      setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1200);
    }
  };

  // keyboard fallback for desktop: ← reject, → confirm, ↑ skip
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

  const visibleClaims = Array.from({ length: VISIBLE }, (_, i) => {
    const idx = (deckIndex + i) % claims.length;
    return { claim: claims[idx], z: i, key: `${claims[idx]?.id}-${deckIndex + i}` };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center pt-32 pb-32">
      <div className="relative w-full h-full max-w-[420px]">
        <AnimatePresence mode="popLayout">
          {visibleClaims.reverse().map(({ claim, z, key }) =>
            claim ? (
              <SwipeCard
                key={key}
                claim={claim}
                z={z}
                active={z === 0}
                onResolve={handleResolve}
              />
            ) : null
          )}
        </AnimatePresence>

        <XPFloaterStack events={floaters} />
      </div>

      {/* bottom action triad */}
      <div className="absolute bottom-12 inset-x-0 flex items-center justify-center gap-5 pointer-events-auto">
        <ActionButton variant="reject" onClick={() => handleResolve("reject")}>
          ✗
        </ActionButton>
        <ActionButton variant="skip" onClick={() => handleResolve("skip")}>
          ↑
        </ActionButton>
        <ActionButton variant="confirm" onClick={() => handleResolve("confirm")}>
          ✓
        </ActionButton>
      </div>

      {/* keyboard hint */}
      <div className="absolute bottom-2 inset-x-0 text-center text-[9px] uppercase tracking-[0.24em] text-[var(--color-dim)]">
        <span className="hidden md:inline">← reject · ↑ skip · → confirm</span>
        <span className="md:hidden">drag to verify</span>
      </div>
    </div>
  );
}

function ActionButton({
  variant,
  children,
  onClick,
}: {
  variant: "confirm" | "reject" | "skip";
  children: React.ReactNode;
  onClick: () => void;
}) {
  const styles: Record<typeof variant, { bg: string; color: string; size: number }> = {
    confirm: { bg: "var(--color-success)", color: "#06210e", size: 60 },
    reject: { bg: "var(--color-danger)", color: "#2a0a04", size: 60 },
    skip: { bg: "rgb(255 255 255 / 0.04)", color: "var(--color-pink-soft)", size: 50 },
  };
  const s = styles[variant];
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      onClick={onClick}
      className="rounded-full font-display flex items-center justify-center"
      style={{
        width: s.size,
        height: s.size,
        background: s.bg,
        color: s.color,
        fontSize: variant === "skip" ? 22 : 26,
        boxShadow:
          variant === "skip"
            ? "inset 0 0 0 1px rgb(255 255 255 / 0.1)"
            : `0 8px 24px -8px ${s.bg}, 0 0 0 1px rgb(255 255 255 / 0.06) inset`,
      }}
      aria-label={variant}
    >
      {children}
    </motion.button>
  );
}
