"use client";

import { AnimatePresence } from "motion/react";
import { useStore } from "@/lib/store";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SakuraField } from "@/components/SakuraField";
import { HUD } from "@/components/HUD";
import { SwipeDeck } from "@/components/SwipeDeck";
import { LevelUpOverlay } from "@/components/LevelUpOverlay";
import { LotteryWheel } from "@/components/LotteryWheel";
import { PayoutClaim } from "@/components/PayoutClaim";

export default function Home() {
  const mode = useStore((s) => s.mode);
  const openRaffle = useStore((s) => s.openRaffle);
  const reset = useStore((s) => s.reset);

  return (
    <>
      <PhoneFrame>
        <div className="absolute inset-0 overflow-hidden">
          {/* ambient bg */}
          <SakuraField count={10} />

          {/* persistent HUD */}
          <HUD onOpenRaffle={openRaffle} />

          {/* default deck */}
          <SwipeDeck />

          {/* mode-driven overlays */}
          <AnimatePresence>
            {mode === "levelup" && <LevelUpOverlay key="levelup" />}
            {(mode === "raffle" || mode === "spinning") && <LotteryWheel key="wheel" />}
            {mode === "claim" && <PayoutClaim key="claim" />}
          </AnimatePresence>

          {/* dev: reset button (top-right corner of screen, very faint) */}
          <button
            onClick={reset}
            className="absolute top-[18px] right-4 z-50 text-[8px] uppercase tracking-[0.2em] text-[var(--color-dim)] hover:text-[var(--color-pink-soft)] transition"
            title="reset session"
          >
            reset
          </button>
        </div>
      </PhoneFrame>

      {/* desktop-only side caption */}
      <div className="hidden md:block fixed bottom-6 left-6 text-[10px] uppercase tracking-[0.24em] text-[var(--color-dim)]">
        vima · verify scene ledger claims · earn sol · v<span className="font-cash">0.1</span>
      </div>
      <div className="hidden md:block fixed bottom-6 right-6 text-[10px] uppercase tracking-[0.2em] text-[var(--color-dim)]">
        ← reject &nbsp;·&nbsp; ↑ skip &nbsp;·&nbsp; → confirm
      </div>
    </>
  );
}
