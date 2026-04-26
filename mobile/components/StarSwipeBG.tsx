"use client";

import { useEffect, useState } from "react";
import { type MotionValue } from "motion/react";
import StarSwipe from "./react-bits/star-swipe";
import { useStore } from "@/lib/store";
import { levelForXP } from "@/lib/mock";

/**
 * Full-bleed reactive background built on react-bits' Möbius-warp shader.
 *
 *   - Fixed 45° orientation (vertical sweep, no tilt) — the shader doesn't
 *     get rotated by swipes, just scrolled.
 *   - WEIGHTED swipe response via SCROLL SPEED, not rotation: dragX adds
 *     a ±large boost to scrollSpeed so the field appears to push WITH the
 *     card motion (and reverse direction past zero).
 *   - Top + bottom vignette so the bg fades to dark like a film frame.
 *   - Darker palette overall + small XP-driven warp/intensity bump for the
 *     "charging up to raffle" feel.
 */

const BASE_ROTATION_DEG = -45;        // fixed — sweep top-to-bottom, no tilt
const DRAG_SATURATION = 200;          // dragX magnitude that maps to peak input

// Physics-style integration: dragX is treated as ACCELERATION, not target.
// Holding a drag pushes the speed further (weighted). Releasing leaves it
// to coast and slowly bleed back to zero via friction. No snap.
// Tuned VERY low — the bg should drift, not race.
const MAX_ACCEL_PER_SEC = 0.4;        // at full drag, speed changes 0.4/s
const SPEED_FRICTION_PER_SEC = 0.25;  // velocity decays e^-0.25 each second
const MAX_SPEED_OFFSET = 1.0;         // cap so it never runs away

export function StarSwipeBG({ dragX }: { dragX: MotionValue<number> }) {
  const xp = useStore((s) => s.xp);
  const { into, needed } = levelForXP(xp);
  const xpProgress = Math.max(0, Math.min(1, into / needed));

  const [speedBoost, setSpeedBoost] = useState(0);

  useEffect(() => {
    let raf = 0;
    let velocity = 0;
    let lastTs = performance.now();
    let lastEmit = 0;
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTs) / 1000); // clamp dt against tab-pause spikes
      lastTs = now;

      const v = Math.max(-DRAG_SATURATION, Math.min(DRAG_SATURATION, dragX.get()));
      const accel = (v / DRAG_SATURATION) * MAX_ACCEL_PER_SEC;

      // Integrate: v += a*dt, then apply continuous-time friction.
      velocity += accel * dt;
      velocity *= Math.exp(-SPEED_FRICTION_PER_SEC * dt);
      // Cap to keep it bounded.
      velocity = Math.max(-MAX_SPEED_OFFSET, Math.min(MAX_SPEED_OFFSET, velocity));

      if (Math.abs(velocity - lastEmit) > 0.04) {
        lastEmit = velocity;
        setSpeedBoost(velocity);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragX]);

  // Second slider screenshot — low-contrast / blended-dark configuration.
  // colorIntensity=2 with a near-black tint on pure-black bg gives a rich
  // muted glow rather than punchy color, so everything reads "in the same
  // dark family". Speed/scrollSpeed back to slider values; the physics
  // speedBoost is still small (capped ±1) so swipes only nudge.
  void xpProgress;
  const baseScrollSpeed = 6;
  const scrollSpeed = baseScrollSpeed + speedBoost;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* scaleX(-1) mirrors the shader horizontally without re-rotating it. */}
      <div className="absolute inset-0" style={{ transform: "scaleX(-1)" }}>
      <StarSwipe
        speed={0.2}
        scale={0.1}
        warpStrength={0.9}
        warpCurvature={5.9}
        warpFalloff={1.2}
        scrollSpeed={scrollSpeed}
        noiseAmount={0}
        colorIntensity={2}
        colorSeparation={3.6}
        rotation={BASE_ROTATION_DEG}
        backgroundColor="#000000"
        color="#2a0a1a"
        opacity={0.45}
        cursorInteraction={false}
      />
      </div>
      {/* Vignette: top + bottom fade to pure black, so the bg blends seamlessly
          into the page edges and reads as one continuous dark field. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 10%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 76%, rgba(0,0,0,0.6) 90%, rgba(0,0,0,1) 100%)",
        }}
      />
    </div>
  );
}
