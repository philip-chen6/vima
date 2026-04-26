"use client";

import { useMemo } from "react";

type Petal = {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  hue: string;
};

const HUES = ["#ffe4ec", "#ffd1de", "#ffb8c8", "#ff9eb1"];

function seededUnit(seed: number) {
  const x = Math.sin(seed * 997) * 10000;
  return x - Math.floor(x);
}

/** ambient drifting sakura petals — sparse, slow, used as bg layer */
export function SakuraField({ count = 14 }: { count?: number }) {
  const petals = useMemo<Petal[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: seededUnit(i + 1) * 100,
        size: 6 + seededUnit(i + 101) * 8,
        delay: seededUnit(i + 201) * 14,
        duration: 14 + seededUnit(i + 301) * 14,
        hue: HUES[Math.floor(seededUnit(i + 401) * HUES.length)],
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute block rounded-full"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 1.4,
            background: `radial-gradient(ellipse, ${p.hue} 0%, transparent 75%)`,
            filter: "blur(0.4px)",
            opacity: 0.55,
            animation: `drift ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
