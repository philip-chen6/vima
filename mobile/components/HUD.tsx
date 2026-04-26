"use client";

import { motion, AnimatePresence } from "motion/react";
import { useStore } from "@/lib/store";
import { levelForXP, RAFFLE_THRESHOLD } from "@/lib/mock";
import { TickerNumber } from "./TickerNumber";

export function HUD({ onOpenRaffle }: { onOpenRaffle: () => void }) {
  const xp = useStore((s) => s.xp);
  const level = useStore((s) => s.level);
  const streak = useStore((s) => s.streak);
  const claims_done = useStore((s) => s.claims_done);
  const spins = useStore((s) => s.spins_available);
  const sol_pending = useStore((s) => s.sol_pending);

  const { into, needed } = levelForXP(xp);
  const pct = Math.min(100, (into / needed) * 100);
  const toRaffle = RAFFLE_THRESHOLD - (claims_done % RAFFLE_THRESHOLD);
  const showRaffleCta = spins > 0;

  return (
    <div className="absolute top-0 inset-x-0 z-30 pt-14 px-5 md:pt-16">
      {/* level + xp bar */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-dim)]">level</span>
          <span className="font-cash text-[22px] tracking-tight text-[var(--color-text)]">
            <TickerNumber value={level} />
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-cash text-[13px] text-[var(--color-pink)]">
            <TickerNumber value={into} />
          </span>
          <span className="font-cash text-[11px] text-[var(--color-dim)]">/ {needed}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-dim)] ml-1">xp</span>
        </div>
      </div>

      <div className="relative h-[3px] rounded-full overflow-hidden bg-[var(--color-surface-2)]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--color-pink-300), var(--color-pink-500))",
            boxShadow: "0 0 10px rgb(255 184 200 / 0.5)",
          }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 text-[var(--color-mute)]">
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--color-pink)]">▲</span>
            <span className="font-cash text-[var(--color-text)]">
              <TickerNumber value={streak} />
            </span>
            <span className="uppercase tracking-[0.14em] text-[10px]">streak</span>
          </span>
          <span className="text-[var(--color-dim)]">·</span>
          <span className="flex items-center gap-1.5">
            <span className="font-cash text-[var(--color-text)]">
              <TickerNumber value={claims_done} />
            </span>
            <span className="uppercase tracking-[0.14em] text-[10px]">verified</span>
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {showRaffleCta ? (
            <motion.button
              key="raffle-cta"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
              onClick={onOpenRaffle}
              className="pill animate-pulse-pink text-[11px] uppercase tracking-[0.16em] font-medium"
              style={{
                background: "linear-gradient(135deg, var(--color-pink-300), var(--color-pink-500))",
                color: "#1a0a12",
                padding: "6px 14px",
              }}
            >
              <span>raffle</span>
              <span className="text-[12px]">×<span className="font-cash">{spins}</span></span>
            </motion.button>
          ) : (
            <motion.span
              key="raffle-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-dim)]"
            >
              <span className="font-cash text-[11px] text-[var(--color-pink-soft)]">{toRaffle}</span> to raffle
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {sol_pending > 0 && (
        <div className="mt-2 text-right text-[10px] uppercase tracking-[0.14em] text-[var(--color-dim)]">
          <span className="font-cash text-[12px] text-[var(--color-gold)]">{sol_pending.toFixed(3)}</span> sol pending
        </div>
      )}
    </div>
  );
}
