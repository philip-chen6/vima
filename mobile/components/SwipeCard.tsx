"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { type Claim } from "@/lib/mock";

export type SwipeOutcome = "confirm" | "reject" | "skip";

const SWIPE_THRESHOLD = 110;

export function SwipeCard({
  claim,
  z,
  active,
  onResolve,
}: {
  claim: Claim;
  z: number;
  active: boolean;
  onResolve: (outcome: SwipeOutcome) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-14, 0, 14]);
  const confirmOpacity = useTransform(x, [40, 140], [0, 1]);
  const rejectOpacity = useTransform(x, [-140, -40], [1, 0]);
  const skipOpacity = useTransform(y, [-160, -50], [1, 0]);

  const handleEnd = (_e: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const dy = info.offset.y;
    if (dx > SWIPE_THRESHOLD) onResolve("confirm");
    else if (dx < -SWIPE_THRESHOLD) onResolve("reject");
    else if (dy < -SWIPE_THRESHOLD) onResolve("skip");
  };

  // stack-depth visual offset (peek behind)
  const stackOffset = z * 10;
  const stackScale = 1 - z * 0.05;
  const stackOpacity = z === 0 ? 1 : Math.max(0.18, 1 - z * 0.45);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 100 - z, pointerEvents: "none" }}
      initial={false}
      animate={{
        y: stackOffset,
        scale: stackScale,
        opacity: stackOpacity,
      }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
    >
      <motion.div
        drag={active}
        dragElastic={0.18}
        dragMomentum={false}
        onDragEnd={handleEnd}
        style={{ x, y, rotate, pointerEvents: active ? "auto" : "none" }}
        className="relative w-[88%] h-[78%] glass-card overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* opaque surface base — kills behind-card bleed */}
        <div className="absolute inset-0" style={{ background: "#0e0e14" }} />
        {/* claim-type colored gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${claim.gradient[0]}24 0%, ${claim.gradient[1]} 65%)`,
          }}
        />

        {/* faint grid overlay (citadel terminal vibe) */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-screen"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        {/* content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-7">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-pink-soft)]">
                claim · <span className="font-cash">{claim.id}</span>
              </span>
              {claim.rare && (
                <span
                  className="text-[9px] uppercase tracking-[0.2em] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: "#1a0a12",
                    background: "var(--color-gold)",
                  }}
                >
                  rare ×2
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 mb-6">
              <span className="text-[14px] text-[var(--color-pink-300)]">{claim.glyph}</span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-mute)]">
                {claim.type.replace("_", " ")}
              </span>
              <span className="font-cash text-[10px] text-[var(--color-dim)] ml-auto">
                {claim.timestamp}
              </span>
            </div>

            <p
              className="font-book text-[22px] leading-[1.32] tracking-[-0.015em] text-[var(--color-text)]"
              style={{ fontWeight: 350 }}
            >
              {claim.text}
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--color-dim)]">conf</span>
              <span className="font-cash text-[18px] text-[var(--color-text)]">
                {claim.confidence.toFixed(2)}
              </span>
              <div className="mt-1 w-24 h-[2px] bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${claim.confidence * 100}%`,
                    background: "var(--color-pink-300)",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--color-dim)]">reward</span>
              <span className="text-[18px] text-[var(--color-pink-300)] flex items-baseline gap-1">
                <span className="font-cash">+{claim.xp_reward}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-mute)]" style={{ fontFamily: "var(--font-display)" }}>xp</span>
              </span>
            </div>
          </div>
        </div>

        {/* decision overlays */}
        <motion.div
          className="absolute top-7 right-7 px-3 py-1.5 rounded-lg border-2 font-medium tracking-[0.2em] text-[12px] uppercase rotate-[12deg]"
          style={{
            opacity: confirmOpacity,
            color: "var(--color-success)",
            borderColor: "var(--color-success)",
            background: "rgb(61 214 140 / 0.08)",
          }}
        >
          ✓ confirm
        </motion.div>
        <motion.div
          className="absolute top-7 left-7 px-3 py-1.5 rounded-lg border-2 font-medium tracking-[0.2em] text-[12px] uppercase -rotate-[12deg]"
          style={{
            opacity: rejectOpacity,
            color: "var(--color-danger)",
            borderColor: "var(--color-danger)",
            background: "rgb(229 77 46 / 0.08)",
          }}
        >
          ✗ reject
        </motion.div>
        <motion.div
          className="absolute bottom-7 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg border-2 font-medium tracking-[0.2em] text-[11px] uppercase"
          style={{
            opacity: skipOpacity,
            color: "var(--color-pink-soft)",
            borderColor: "var(--color-pink-soft)",
            background: "rgb(255 209 222 / 0.06)",
          }}
        >
          ↑ skip
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
