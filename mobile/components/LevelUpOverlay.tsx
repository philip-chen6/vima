"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";

const PETAL_HUES = ["#ffe4ec", "#ffd1de", "#ffb8c8", "#ff9eb1", "#ff7090"];

function seededUnit(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

export function LevelUpOverlay() {
  const level = useStore((s) => s.level);
  const consume = useStore((s) => s.consumeLevelUp);

  // strict-mode-safe auto-dismiss: ref guard prevents multi-fire across mounts
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    const t = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      consume();
    }, 2800);
    return () => clearTimeout(t);
  }, [consume]);

  const petals = useMemo(
    () =>
      Array.from({ length: 64 }, (_, i) => ({
        id: i,
        angle: (i / 64) * Math.PI * 2 + (seededUnit(i + 1) - 0.5) * 0.4,
        dist: 80 + seededUnit(i + 101) * 320,
        delay: seededUnit(i + 201) * 0.25,
        size: 6 + seededUnit(i + 301) * 12,
        hue: PETAL_HUES[Math.floor(seededUnit(i + 401) * PETAL_HUES.length)],
        rotate: seededUnit(i + 501) * 720,
      })),
    []
  );

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center cursor-pointer"
      onClick={consume}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        zIndex: 200,
        background:
          "radial-gradient(ellipse at center, rgb(255 184 200 / 0.18) 0%, rgb(10 10 10 / 0.94) 60%)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {/* expanding ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          border: "1px solid rgb(255 184 200 / 0.4)",
        }}
        initial={{ width: 80, height: 80, opacity: 0.9 }}
        animate={{ width: 720, height: 720, opacity: 0 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          border: "1px solid rgb(255 158 177 / 0.5)",
        }}
        initial={{ width: 40, height: 40, opacity: 1 }}
        animate={{ width: 540, height: 540, opacity: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      />

      {/* petal burst */}
      {petals.map((p) => (
        <motion.span
          key={p.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: p.size,
            height: p.size * 1.4,
            background: `radial-gradient(ellipse, ${p.hue} 0%, transparent 75%)`,
            filter: "blur(0.4px)",
          }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.5 }}
          animate={{
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist,
            opacity: [0, 1, 1, 0],
            rotate: p.rotate,
            scale: [0.5, 1.1, 1, 0.7],
          }}
          transition={{
            duration: 1.8,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.15, 0.7, 1],
          }}
        />
      ))}

      {/* content */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">
        <motion.div
          className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-pink-soft)] font-medium"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          ✦ level up ✦
        </motion.div>

        <motion.div
          className="font-cash tracking-display text-[var(--color-text)]"
          style={{
            fontSize: 128,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            textShadow:
              "0 0 40px rgb(255 184 200 / 0.5), 0 0 80px rgb(255 158 177 / 0.3), 0 4px 0 rgb(255 184 200 / 0.15)",
          }}
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 7, mass: 1.4, delay: 0.05 }}
        >
          {String(level).padStart(2, "0")}
        </motion.div>

        <motion.div
          className="font-book text-[13px] text-[var(--color-mute)] tracking-tight max-w-[240px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ fontWeight: 350 }}
        >
          spin pool tier upgraded · streak multiplier holds
        </motion.div>

        <motion.div
          className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-dim)] mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          tap to continue
        </motion.div>
      </div>
    </motion.div>
  );
}
