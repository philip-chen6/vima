"use client";

import { useEffect, useRef, useState } from "react";
import ShaderCard from "./react-bits/shader-card";
import { useStore } from "@/lib/store";
import { levelForXP } from "@/lib/mock";

/**
 * Full-bleed shader background that reacts to game state.
 *
 * Mapping:
 *   - actual XP progress (0..1) is passed through a log10 curve so the SHADER
 *     visibly jumps a lot for the first few XP, then changes less as you near
 *     the cap. Matches the user spec: "moves RLLY high first then logarithmically
 *     less and less as it goes higher into the level".
 *   - color cycles by level through pink → coral → gold range
 *   - many shader uniforms (positionY, speed, effectBoost, branchIntensity,
 *     waveAmount, verticalExtent, noiseScale, scale) are bound to the same
 *     curve so EVERYTHING gets more intense as you climb a level
 *   - smooth tweening: target → animated current via 60fps lerp so the shader
 *     swells fluidly when XP lands
 */

// pink only — no hue cycling
const PINK = "#ff7090";

function logCurve(x: number): number {
  // Two-piece, no late ramp:
  //   x ∈ [0, 0.1]: linear 0 → 0.5         (swipe 1 lands at exactly 50%)
  //   x  >  0.1   : linear 0.5 → 1.0       (steady 5.5%-per-swipe creep
  //                                          to full, no acceleration)
  //
  // L2 (10 swipes): 0.50, 0.56, 0.61, 0.67, 0.72, 0.78, 0.83, 0.89, 0.94, 1.00
  // Each subsequent swipe contributes the same +5.5%, so the bar moves
  // visibly but slowly through the rest of the level. No "fills up too fast"
  // log shape, no plateau-then-jump, just predictable steady progress.
  const c = Math.max(0, Math.min(1, x));
  if (c <= 0.1) return c * 5;
  return 0.5 + (0.5 * (c - 0.1)) / 0.9;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface ShaderState {
  positionY: number;
  speed: number;
  effectBoost: number;
  branchIntensity: number;
  waveAmount: number;
  verticalExtent: number;
  horizontalExtent: number;
  noiseScale: number;
  scale: number;
  effectRadius: number;
  color: string;
}

function targetForProgress(actualProgress: number): ShaderState {
  const p = logCurve(actualProgress);
  // The user's screenshot values (verticalExtent 0.5, horizontalExtent 0.5,
  // scale 2.3, etc) ARE the full-state. We only animate two things:
  //   1. positionY — rises from below-screen up into mid-upper. The brightest
  //      part of the blob travels with positionY, so this reads as "water level
  //      rising" from bottom toward top.
  //   2. effectRadius — 0 (invisible) → 1 (fully formed).
  // Everything else stays locked at the user-tuned baseline.
  return {
    positionY: -0.5 + 0.8 * p,                // -0.5 (below frame) → 0.3 (mid-upper)
    effectRadius: 0.0 + 1.0 * p,              // 0 → 1
    effectBoost: 0.0 + 0.4 * p,               // subtle charge toward the top
    noiseScale: 3.0 - 1.7 * p,                // chaos → settled (3.0 → 1.3)
    // ----- locked at user-tuned baseline -----
    verticalExtent: 0.5,
    horizontalExtent: 0.5,
    scale: 2.3,
    speed: 0.1,
    branchIntensity: 0.0,
    waveAmount: 0.0,
    color: PINK,
  };
}

export function LevelShaderBG() {
  const xp = useStore((s) => s.xp);
  const { into, needed } = levelForXP(xp);
  const actualProgress = Math.max(0, Math.min(1, into / needed));
  const target = targetForProgress(actualProgress);

  // animate from current → target with simple lerp on rAF
  const [current, setCurrent] = useState<ShaderState>(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setCurrent((cur) => {
        const t = targetRef.current;
        // 0.06 = ~250ms time-constant at 60fps for numeric props
        const k = 0.06;
        return {
          positionY: lerp(cur.positionY, t.positionY, k),
          speed: lerp(cur.speed, t.speed, k),
          effectBoost: lerp(cur.effectBoost, t.effectBoost, k),
          branchIntensity: lerp(cur.branchIntensity, t.branchIntensity, k),
          waveAmount: lerp(cur.waveAmount, t.waveAmount, k),
          verticalExtent: lerp(cur.verticalExtent, t.verticalExtent, k),
          horizontalExtent: lerp(cur.horizontalExtent, t.horizontalExtent, k),
          noiseScale: lerp(cur.noiseScale, t.noiseScale, k),
          scale: lerp(cur.scale, t.scale, k),
          effectRadius: lerp(cur.effectRadius, t.effectRadius, k),
          color: t.color, // color cycles only on level change — snap, don't tween
        };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <ShaderCard
        fill
        autoPlay
        speed={current.speed}
        color={current.color}
        positionY={current.positionY}
        scale={current.scale}
        effectRadius={current.effectRadius}
        effectBoost={current.effectBoost}
        edgeMin={0}
        edgeMax={0.5}
        falloffPower={1}
        noiseScale={current.noiseScale}
        widthFactor={1.5}
        waveAmount={current.waveAmount}
        branchIntensity={current.branchIntensity}
        verticalExtent={current.verticalExtent}
        horizontalExtent={current.horizontalExtent}
        blur={28}
        opacity={1}
      />
    </div>
  );
}
