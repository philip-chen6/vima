"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { type MotionValue } from "motion/react";
import { interpolateAll } from "flubber";
import { YES_PATH, NO_PATH, YES_BBOX, NO_BBOX } from "@/lib/yesno-paths";

/**
 * Direct YES ↔ NO path morph driven by the card's dragX.
 *
 *   dragX = +200  →  shape = YES
 *   dragX =    0  →  shape = midpoint blob (the blur softens it)
 *   dragX = -200  →  shape = NO
 *
 * Freeze behavior — the parent passes `freezeAtRef`. Setting that ref to
 * `performance.now()` locks the morph at its CURRENT shape; it stays locked
 * for FREEZE_DURATION_MS or until the user starts actively dragging the
 * next card (whichever is sooner). This prevents the visible "snap back to
 * midpoint" while the old card is still flying off and the new one hasn't
 * yet covered the morph area.
 *
 * Implementation note: the rAF loop reads dragX directly each frame instead
 * of subscribing via useMotionValueEvent — this avoids a race where the
 * parent's setState-based freeze flag wouldn't propagate before the
 * synchronous dragX.set(0) call fired the change handler.
 *
 * fillRule="evenodd" so the O hole in NO renders correctly at the endpoint.
 */
const FREEZE_DURATION_MS = 600;
const ACTIVE_DRAG_THRESHOLD = 30;

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export function YesNoMorph({
  dragX,
  freezeAtRef,
}: {
  dragX: MotionValue<number>;
  /** Mutate this ref to `performance.now()` to freeze the morph at its
   *  current shape for FREEZE_DURATION_MS. Auto-unfreezes early on drag. */
  freezeAtRef?: RefObject<number>;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const uid = useId().replace(/[:]/g, "");
  const gradId = `ynm-grad-${uid}`;
  const fuzzId = `ynm-fuzz-${uid}`;

  const interpolator = useMemo(() => {
    const split = (d: string) =>
      d
        .split(/(?=M)/)
        .map((s) => s.trim())
        .filter(Boolean);
    return interpolateAll(split(YES_PATH), split(NO_PATH), {
      single: true,
      maxSegmentLength: 8,
    }) as (t: number) => string;
  }, []);

  const targetT = useRef(0.5);
  const currentT = useRef(0.5);
  const targetOpacity = useRef(0);
  const currentOpacity = useRef(0);
  const groupRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    let raf = 0;
    if (pathRef.current) {
      pathRef.current.setAttribute("d", interpolator(0.5));
    }
    const tick = () => {
      const now = performance.now();
      const v = dragX.get();
      const isActiveDrag = Math.abs(v) > ACTIVE_DRAG_THRESHOLD;
      const freezeAt = freezeAtRef?.current ?? 0;
      const stillFrozen =
        freezeAt > 0 && now - freezeAt < FREEZE_DURATION_MS && !isActiveDrag;
      // Auto-clear the freeze stamp once the user starts interacting again,
      // so subsequent drags aren't accidentally re-frozen.
      if (isActiveDrag && freezeAt > 0 && freezeAtRef) {
        freezeAtRef.current = 0;
      }

      if (!stillFrozen) {
        const clamped = Math.max(-200, Math.min(200, v));
        // +200 → 0 (YES), 0 → 0.5 (mid), -200 → 1 (NO).
        targetT.current = (200 - clamped) / 400;
        // Opacity envelope: fully transparent at rest, ramps in via
        // smoothstep so a tiny accidental drag doesn't flash the word.
        const a = Math.abs(clamped) / 200;
        targetOpacity.current = a * a * (3 - 2 * a);
      }
      // While frozen we hold opacity AND shape — both stay at last value.

      const k = 0.18; // ~250ms time-constant — slow ease for snap-back
      currentT.current = lerp(currentT.current, targetT.current, k);
      currentOpacity.current = lerp(currentOpacity.current, targetOpacity.current, k);
      if (pathRef.current) {
        pathRef.current.setAttribute("d", interpolator(currentT.current));
      }
      if (groupRef.current) {
        groupRef.current.style.opacity = String(currentOpacity.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interpolator, dragX, freezeAtRef]);

  const halfW =
    Math.max(
      Math.abs(YES_BBOX.x1),
      Math.abs(YES_BBOX.x2),
      Math.abs(NO_BBOX.x1),
      Math.abs(NO_BBOX.x2)
    ) + 32;
  const halfH =
    Math.max(
      Math.abs(YES_BBOX.y1),
      Math.abs(YES_BBOX.y2),
      Math.abs(NO_BBOX.y1),
      Math.abs(NO_BBOX.y2)
    ) + 32;

  const wrapStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    mixBlendMode: "multiply",
  };

  return (
    <div aria-hidden style={wrapStyle}>
      <svg
        viewBox={`${-halfW} ${-halfH} ${halfW * 2} ${halfH * 2}`}
        width="92%"
        height="auto"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd1de" />
            <stop offset="50%" stopColor="#ff90b8" />
            <stop offset="100%" stopColor="#ff5a8a" />
          </linearGradient>
          {/* Composite filter: turbulence-driven displacement → fuzzy blur.
              The turbulence map distorts the letter edges into an organic
              wobble; the blur softens the result so it reads as ink, not
              jagged noise. */}
          <filter
            id={fuzzId}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018"
              numOctaves="2"
              seed="3"
              result="turb"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turb"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
              result="distorted"
            />
            <feGaussianBlur in="distorted" stdDeviation="6" />
          </filter>
        </defs>
        <g ref={groupRef} style={{ opacity: 0 }}>
          <path
            ref={pathRef}
            fill={`url(#${gradId})`}
            fillRule="evenodd"
            filter={`url(#${fuzzId})`}
          />
        </g>
      </svg>
    </div>
  );
}
