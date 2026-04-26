"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useStore } from "@/lib/store";
import { WHEEL_SEGMENTS, LEGENDARY_PRIZE, type Prize } from "@/lib/mock";
import confetti from "canvas-confetti";

const SEGMENTS = WHEEL_SEGMENTS;
const SEG_COUNT = SEGMENTS.length;
const SEG_DEG = 360 / SEG_COUNT;

export function LotteryWheel() {
  const spin = useStore((s) => s.spin);
  const consumeSpinResult = useStore((s) => s.consumeSpinResult);
  const legendaryHit = useStore((s) => s.legendaryHit);

  const rotation = useMotionValue(0);
  const [revealedPrize, setRevealedPrize] = useState<Prize | null>(null);
  const [spinning, setSpinning] = useState(false);
  const fireConfettiRef = useRef(false);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    fireConfettiRef.current = false;
    const result = spin();
    const targetSeg = result.segmentIndex;

    // pointer at top (90deg in css land — but we use 0deg = top with our wheel orientation).
    // Want segment center to align with pointer: rotate wheel by -(targetSeg * SEG_DEG + SEG_DEG/2)
    // plus N full extra rotations for drama.
    const turns = 6 + Math.random() * 2;
    const finalDeg = -(targetSeg * SEG_DEG + SEG_DEG / 2) - turns * 360;

    const startDeg = rotation.get();
    const animDuration = 4200;
    const startTs = performance.now();

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / animDuration);
      const eased = easeOutQuart(t);
      rotation.set(startDeg + (finalDeg - startDeg) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else {
        setSpinning(false);
        setRevealedPrize(result.legendary ? LEGENDARY_PRIZE : SEGMENTS[targetSeg]);
        if ((result.legendary || (result.prize.amount_sol >= 0.01)) && !fireConfettiRef.current) {
          fireConfettiRef.current = true;
          fireConfetti(result.legendary);
        }
        setTimeout(() => consumeSpinResult(), 2400);
      }
    };
    requestAnimationFrame(tick);
  };

  const wheelRotate = useTransform(rotation, (v) => `rotate(${v}deg)`);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ zIndex: 200, background: "rgba(5, 5, 5, 0.85)", backdropFilter: "blur(14px)" }}
    >
      <div className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-pink-soft)] mb-4">
        ✿ raffle ✿
      </div>

      <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-mute)] mb-8">
        spin to claim
      </div>

      {/* wheel container */}
      <div className="relative" style={{ width: 320, height: 320 }}>
        {/* pointer */}
        <div
          className="absolute z-10 left-1/2 -translate-x-1/2"
          style={{
            top: -6,
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid var(--color-pink-bold)",
            filter: "drop-shadow(0 4px 12px rgb(255 158 177 / 0.6))",
          }}
        />

        {/* wheel */}
        <motion.svg
          width={320}
          height={320}
          viewBox="0 0 320 320"
          style={{ transform: wheelRotate }}
        >
          <defs>
            <radialGradient id="wheel-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(255 209 222)" stopOpacity="0.18" />
              <stop offset="80%" stopColor="rgb(255 184 200)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="rgb(255 184 200)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* outer halo */}
          <circle cx="160" cy="160" r="158" fill="url(#wheel-glow)" />

          {SEGMENTS.map((seg, i) => {
            const startDeg = i * SEG_DEG - 90;
            const endDeg = startDeg + SEG_DEG;
            const startRad = (startDeg * Math.PI) / 180;
            const endRad = (endDeg * Math.PI) / 180;
            const r = 144;
            const x1 = 160 + r * Math.cos(startRad);
            const y1 = 160 + r * Math.sin(startRad);
            const x2 = 160 + r * Math.cos(endRad);
            const y2 = 160 + r * Math.sin(endRad);
            const path = `M 160 160 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

            // text position (mid radius, mid angle)
            const midRad = ((startDeg + endDeg) / 2 * Math.PI) / 180;
            const tx = 160 + 92 * Math.cos(midRad);
            const ty = 160 + 92 * Math.sin(midRad);
            const textRotate = (startDeg + endDeg) / 2 + 90;

            return (
              <g key={i}>
                <path d={path} fill={seg.color} fillOpacity={0.92} stroke="#0a0a0a" strokeWidth={1} />
                <g transform={`translate(${tx} ${ty}) rotate(${textRotate})`}>
                  <text
                    textAnchor="middle"
                    dy="-2"
                    fontFamily="PhantomCash, monospace"
                    fontSize="13"
                    fill="#1a0a12"
                    fontWeight={500}
                  >
                    {seg.label}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="12"
                    fontFamily="Phantom, sans-serif"
                    fontSize="8"
                    letterSpacing="2"
                    fill="#1a0a12"
                    opacity={0.7}
                  >
                    {seg.sublabel.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}

          {/* center hub */}
          <circle cx="160" cy="160" r="22" fill="#0a0a0a" stroke="rgb(255 184 200 / 0.6)" strokeWidth="1.5" />
          <circle cx="160" cy="160" r="6" fill="var(--color-pink-bold)" />
        </motion.svg>
      </div>

      {/* spin button */}
      <motion.button
        onClick={handleSpin}
        disabled={spinning || revealedPrize !== null}
        whileTap={{ scale: 0.94 }}
        className="pill mt-10 text-[14px] tracking-[0.18em] uppercase"
        style={{
          background:
            spinning || revealedPrize ? "var(--color-surface-2)" : "linear-gradient(135deg, var(--color-pink-300), var(--color-pink-500))",
          color: spinning || revealedPrize ? "var(--color-mute)" : "#1a0a12",
          padding: "14px 36px",
          fontWeight: 500,
          opacity: spinning || revealedPrize ? 0.6 : 1,
        }}
      >
        {spinning ? "spinning…" : revealedPrize ? "revealing…" : "spin"}
      </motion.button>

      {/* reveal toast */}
      {revealedPrize && (
        <motion.div
          className="absolute inset-x-0 top-12 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: -10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <div
            className="glass-card glass-card-strong px-6 py-4 text-center"
            style={{
              background: legendaryHit
                ? "linear-gradient(180deg, rgb(255 233 179 / 0.12), rgb(255 233 179 / 0.04))"
                : undefined,
            }}
          >
            <div className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-pink-soft)] mb-1">
              {legendaryHit ? "legendary ✦" : revealedPrize.rarity}
            </div>
            <div className="font-cash text-[34px] leading-none tracking-tight" style={{ color: revealedPrize.color }}>
              {revealedPrize.label}
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-mute)] mt-1">
              {revealedPrize.sublabel}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function fireConfetti(legendary: boolean) {
  const colors = legendary
    ? ["#ffe9b3", "#ffd166", "#ffd1de", "#ffb8c8"]
    : ["#ffe4ec", "#ffd1de", "#ffb8c8", "#ff9eb1"];
  const end = Date.now() + (legendary ? 1800 : 900);
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      scalar: 0.9,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      scalar: 0.9,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
