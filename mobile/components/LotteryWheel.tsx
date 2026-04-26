"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue } from "motion/react";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { WHEEL_SEGMENTS, LEGENDARY_PRIZE, type Prize, type Rarity } from "@/lib/mock";
import confetti from "canvas-confetti";

const RARITY_IMG: Record<Rarity, string> = {
  common: "/prizes/common.png",
  uncommon: "/prizes/uncommon.png",
  rare: "/prizes/rare.png",
  epic: "/prizes/epic.png",
  legendary: "/prizes/legendary.png",
};

const ALL_PRIZES: Prize[] = [...WHEEL_SEGMENTS, LEGENDARY_PRIZE];

// reel geometry
const CARD_W = 168;
const CARD_H = 220;
const GAP = 16;
const STEP = CARD_W + GAP;
const VIEWPORT_W = 336;
const LOOPS = 7; // copies of segments laid end-to-end

/**
 * Raffle screen. Auto-spins on mount: a horizontal reel of prize cards
 * scrolls past at speed and decelerates to land on the chosen winner.
 */
export function LotteryWheel() {
  const spin = useStore((s) => s.spin);
  const consumeSpinResult = useStore((s) => s.consumeSpinResult);
  const [phase, setPhase] = useState<"spinning" | "revealed">("spinning");
  const [revealedPrize, setRevealedPrize] = useState<Prize | null>(null);
  const ranRef = useRef(false);
  const fireConfettiRef = useRef(false);
  // start position: ribbon shifted left by 1.5 loops so cards are flying past
  const startX = -(1.5 * ALL_PRIZES.length * STEP);
  const x = useMotionValue(startX);

  // long ribbon of prize cards
  const ribbon = useMemo(() => {
    const out: Array<{ prize: Prize; key: string }> = [];
    for (let l = 0; l <= LOOPS; l++) {
      ALL_PRIZES.forEach((p, i) => out.push({ prize: p, key: `${l}-${i}` }));
    }
    return out;
  }, []);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const result = spin();
    const targetIdx = result.legendary
      ? ALL_PRIZES.findIndex((p) => p.rarity === "legendary")
      : result.segmentIndex;
    const prize = result.legendary ? LEGENDARY_PRIZE : WHEEL_SEGMENTS[result.segmentIndex];

    // land in the LAST loop of the ribbon at the target card index
    const finalCardIdx = LOOPS * ALL_PRIZES.length + targetIdx;
    const targetX = -(finalCardIdx * STEP + CARD_W / 2 - VIEWPORT_W / 2);
    const jitter = (Math.random() - 0.5) * (CARD_W * 0.18);
    const endX = targetX + jitter;

    // manual rAF spin — strong decel ease, 3.4s
    const dur = 3400;
    const tStart = performance.now();
    const fromX = x.get();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4); // strong decel
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - tStart) / dur);
      const eased = easeOut(t);
      x.set(fromX + (endX - fromX) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // settled — fire reveal
        setRevealedPrize(prize);
        setPhase("revealed");
        if ((result.legendary || prize.amount_sol >= 0.01) && !fireConfettiRef.current) {
          fireConfettiRef.current = true;
          fireConfetti(result.legendary);
        }
      }
    };
    raf = requestAnimationFrame(tick);

    // hand off to next mode after reveal sits
    const handOff = setTimeout(() => consumeSpinResult(), dur + 2400);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(handOff);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 200, background: "#050505" }}
    >
      {/* the reel */}
      <div className="relative overflow-hidden" style={{ width: VIEWPORT_W, height: CARD_H + 40 }}>
        {/* center indicator — pink glowing notches above and below */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: VIEWPORT_W / 2 - 1,
            top: 0,
            width: 2,
            height: 14,
            background: "#ff9eb1",
          }}
        />
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: VIEWPORT_W / 2 - 1,
            bottom: 24,
            width: 2,
            height: 14,
            background: "#ff9eb1",
          }}
        />

        {/* the moving ribbon */}
        <motion.div
          className="absolute top-3 left-0 flex"
          style={{ x, gap: `${GAP}px`, height: CARD_H }}
        >
          {ribbon.map(({ prize, key }) => (
            <ReelCard key={key} prize={prize} />
          ))}
        </motion.div>

        {/* reveal — solid centered prize text on settle, no opacity transitions */}
        {phase === "revealed" && revealedPrize && (
          <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-6"
            style={{ background: "#050505" }}
          >
            <div
              className="font-cash-fat leading-none tracking-[-0.05em]"
              style={{
                fontSize: 96,
                color: revealedPrize.color,
                textShadow: "0 0 44px rgb(255 184 200 / 0.65), 0 4px 0 rgb(255 184 200 / 0.18)",
              }}
            >
              {revealedPrize.label}
            </div>
            <div
              className="font-cash mt-2 tracking-tight"
              style={{
                fontSize: 22,
                color: "var(--color-pink-soft)",
                fontWeight: 600,
              }}
            >
              {revealedPrize.sublabel}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ReelCard({ prize }: { prize: Prize }) {
  return (
    <div
      className="relative shrink-0 rounded-2xl overflow-hidden"
      style={{
        width: CARD_W,
        height: CARD_H,
        background: "linear-gradient(180deg, #13131a 0%, #0e0e14 100%)",
        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.06)",
      }}
    >
      <div className="relative w-full h-[140px]">
        <Image
          src={RARITY_IMG[prize.rarity]}
          alt=""
          fill
          sizes="180px"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="px-3 pt-3 pb-3 flex flex-col items-center text-center">
        <span
          className="font-cash leading-none tracking-tight"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: prize.color,
            textShadow: `0 0 18px ${prize.color}55`,
          }}
        >
          {prize.label}
        </span>
        <span className="mt-1.5 font-cash text-[12px] tracking-tight font-medium text-[var(--color-mute)]">
          {prize.sublabel}
        </span>
      </div>
    </div>
  );
}

function fireConfetti(legendary: boolean) {
  const colors = legendary
    ? ["#ffe9b3", "#ffd166", "#ffd1de", "#ffb8c8"]
    : ["#ffe4ec", "#ffd1de", "#ffb8c8", "#ff9eb1"];
  const end = Date.now() + (legendary ? 1800 : 900);
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, scalar: 0.9 });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, scalar: 0.9 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
