/**
 * vima brand marks — hexagonal motif (riffs on the shader's hex tiling)
 *
 * Four hex variants. Hex anatomy: pointy-top regular hexagon, vertices at
 *   (cx, cy - r), (cx + r·√3/2, cy - r/2), (cx + r·√3/2, cy + r/2),
 *   (cx, cy + r), (cx - r·√3/2, cy + r/2), (cx - r·√3/2, cy - r/2).
 *
 *   A) HexOutline   — single hex, weight-driven
 *   B) HexNested    — three concentric hexes, decreasing weight
 *   C) HexRipple    — hex with concentric inner arcs (echoes shader's ripple loop)
 *   D) HexLattice   — 7-hex honeycomb (1 + 6 around it)
 */

import React from "react";

type MarkProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

const DEFAULT_COLOR = "#e8d5c0";

// √3/2 = 0.8660254
const SQRT3_2 = 0.8660254037844387;

/** Compute pointy-top hexagon SVG path for center (cx, cy) and radius r. */
function hexPath(cx: number, cy: number, r: number): string {
  const dx = r * SQRT3_2;
  const dy = r * 0.5;
  return [
    `M ${cx} ${cy - r}`,
    `L ${cx + dx} ${cy - dy}`,
    `L ${cx + dx} ${cy + dy}`,
    `L ${cx} ${cy + r}`,
    `L ${cx - dx} ${cy + dy}`,
    `L ${cx - dx} ${cy - dy}`,
    `Z`,
  ].join(" ");
}

// ─── A) HexOutline — single clean hex ─────────────────────────────────────
export function MarkHexOutline({ size = 64, color = DEFAULT_COLOR, strokeWidth = 1.5, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="vima mark — hex outline"
    >
      <path d={hexPath(32, 32, 24)} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

// ─── B) HexNut — outer hex (shaded) with hex hole punched through ─────────
// Hex-socket nut: outer hex face shaded via linear gradient (top-left lit,
// bottom-right shadowed). Inner hex is cut out via fill-rule:evenodd so the
// page background shows through cleanly on any backdrop. Both hexes share
// orientation (pointy-top); set INNER_ROT to 30 for a flat-top inner hole
// (alternating-rotation variant).
export function MarkHexNut({ size = 64, color = DEFAULT_COLOR, strokeWidth = 1.5, className }: MarkProps) {
  const cx = 32;
  const cy = 32;
  const rOuter = 26;
  const rInner = 12;
  const INNER_ROT = 30; // flat-top inner inside pointy-top outer

  const outerD = hexPath(cx, cy, rOuter);
  // Inner hex points (rotated by INNER_ROT around center).
  const phi = (INNER_ROT * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const baseInner: Array<[number, number]> = [
    [0, -rInner],
    [rInner * SQRT3_2, -rInner * 0.5],
    [rInner * SQRT3_2,  rInner * 0.5],
    [0,  rInner],
    [-rInner * SQRT3_2, rInner * 0.5],
    [-rInner * SQRT3_2, -rInner * 0.5],
  ];
  const innerPts = baseInner.map(([x, y]) => [
    cx + x * cosP - y * sinP,
    cy + x * sinP + y * cosP,
  ] as const);
  const innerD =
    `M ${innerPts[0][0]} ${innerPts[0][1]} ` +
    innerPts.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ") +
    " Z";

  const gradId = "vima-hex-nut-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="vima mark — hex nut"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Filled donut — outer hex minus inner hex */}
      <path d={`${outerD} ${innerD}`} fill={`url(#${gradId})`} fillRule="evenodd" />
      {/* Edges */}
      <path d={outerD} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d={innerD} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

// ─── C) HexRipple — hex with internal concentric arcs ─────────────────────
// Echoes the shader's ripple: log-weighted concentric circles inside the hex envelope.
export function MarkHexRipple({ size = 64, color = DEFAULT_COLOR, strokeWidth = 1.5, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="vima mark — hex ripple"
    >
      <path d={hexPath(32, 32, 26)} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="32" cy="32" r="18" stroke={color} strokeWidth={strokeWidth} opacity="0.55" />
      <circle cx="32" cy="32" r="11" stroke={color} strokeWidth={strokeWidth} opacity="0.32" />
      <circle cx="32" cy="32" r="4"  stroke={color} strokeWidth={strokeWidth} opacity="0.18" />
    </svg>
  );
}

// ─── D) HexLattice — 7-cell honeycomb ─────────────────────────────────────
// Center hex + 6 neighbors at 60° intervals. References the shader's tiling space.
export function MarkHexLattice({ size = 64, color = DEFAULT_COLOR, strokeWidth = 1.2, className }: MarkProps) {
  const cx = 32;
  const cy = 32;
  const r = 9;
  // Neighbors are placed at distance r * √3 from center along the six "flat" directions.
  // For pointy-top tiling, neighbor centers sit at angles 0°, 60°, 120°, ... offset by 30° from vertices.
  const neighborD = r * SQRT3_2 * 2; // edge-to-edge distance between adjacent pointy-top hexes
  const neighbors: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const theta = (Math.PI / 3) * i + Math.PI / 6; // 30°, 90°, 150°, 210°, 270°, 330°
    neighbors.push([cx + neighborD * Math.cos(theta), cy + neighborD * Math.sin(theta)]);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="vima mark — hex lattice"
    >
      {neighbors.map(([nx, ny], i) => (
        <path
          key={i}
          d={hexPath(nx, ny, r)}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          opacity="0.55"
        />
      ))}
      <path d={hexPath(cx, cy, r)} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

// Picker array
export const MARKS = [
  { id: "outline", label: "outline", Comp: MarkHexOutline },
  { id: "nut",     label: "nut",     Comp: MarkHexNut     },
  { id: "ripple",  label: "ripple",  Comp: MarkHexRipple  },
  { id: "lattice", label: "lattice", Comp: MarkHexLattice },
] as const;
