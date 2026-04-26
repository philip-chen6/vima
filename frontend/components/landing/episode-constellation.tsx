"use client";

// EpisodeConstellation — renders 118 episodes as a radial oscilloscope:
// angle = ts_start across the 0-60s capture, radius = confidence (outer
// ring is 1.0), size = number of grounded spatial_claims. Severity (info/
// warning/critical) drives color. Click a node to set the active episode.
//
// Why radial: 118 is too many for a vertical list and too sparse for a
// 2D scatter — the time dimension is the spine of the eval, so wrapping
// it into a clock face matches the phosphor-terminal aesthetic AND lets
// you see clusters at a glance (the masonry capture has dense activity
// in the 0-30s range, sparse after).

import { useMemo, useState } from "react";

type SpatialClaim = {
  object: string;
  location?: string;
  distance_m?: number | null;
};

// Loose schema: callers pass their full Episode shape, we read the
// fields we need. The trailing index signature lets `Episode` (with
// extra fields like `frames`) satisfy this without a cast.
export type ConstellationEpisode = {
  episode: number;
  ts_start: number;
  ts_end?: number;
  summary: string;
  confidence: number;
  spatial_claims: SpatialClaim[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type Severity = "info" | "warning" | "critical";

interface Props {
  episodes: ConstellationEpisode[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  /** Total capture duration the angles get mapped against. Defaults to 60s. */
  totalDuration?: number;
  /** SVG square dimension. Render scales by container, so this is just the
   *  internal coordinate space — keep at 100 for percentage-based math. */
  size?: number;
  inferSeverity?: (ep: ConstellationEpisode) => Severity;
}

// Colors must match the rest of /eval (Yozakura tokens).
const SAKURA_HOT = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";
const WASHI = "#f7ecef";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const LINE = "rgba(242,167,184,0.18)";

const SEVERITY_COLOR: Record<Severity, string> = {
  info: SAKURA_HOT,
  warning: LANTERN,
  critical: RED,
};

function defaultSeverity(ep: ConstellationEpisode): Severity {
  const s = ep.summary.toLowerCase();
  const missingControl = /no (fall protection|guardrail|harness|tie-?off)/.test(s);
  const fallHazard = /open edge|edge of|unprotected|elevated edge|edge masonry/.test(s);
  if (missingControl && fallHazard && ep.confidence >= 0.78) return "critical";
  if (missingControl || fallHazard) return "warning";
  return "info";
}

export function EpisodeConstellation({
  episodes,
  activeIdx,
  onSelect,
  totalDuration = 60,
  size = 100,
  inferSeverity = defaultSeverity,
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  // Reserve outer ring for tick marks; max episode radius is 90% of half-size.
  const maxR = (size / 2) * 0.86;
  // Inner ring marks 0 confidence; we squash everything into the outer 70%
  // so even a 0.4-conf episode is visible and not glued to the center.
  const innerR = (size / 2) * 0.18;

  const points = useMemo(
    () =>
      episodes.map((ep, i) => {
        // Angle: 12 o'clock = ts=0, sweep clockwise. Episodes past totalDuration
        // wrap (shouldn't happen on the masonry capture but guards us anyway).
        const tsClamped = Math.max(0, Math.min(totalDuration, ep.ts_start));
        const theta = -Math.PI / 2 + (tsClamped / totalDuration) * Math.PI * 2;
        const conf = Math.max(0, Math.min(1, ep.confidence));
        const r = innerR + (maxR - innerR) * conf;
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        const sev = inferSeverity(ep);
        // Dot scales mildly with claim count; capped so high-claim outliers
        // don't dominate. 0 claims → 0.7, 5 claims → 1.6 in radius units.
        const dotR = 0.6 + Math.min(ep.spatial_claims.length, 6) * 0.18;
        return { ep, i, x, y, theta, r, sev, dotR };
      }),
    [episodes, totalDuration, cx, cy, maxR, innerR, inferSeverity],
  );

  // Tick marks every 10s (0,10,20,30,40,50) plus a 60-mark closing the loop.
  const tickAngles = Array.from({ length: 6 }, (_, k) => k * 10);

  const hoverEp = hoverIdx !== null ? episodes[hoverIdx] : null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        maxWidth: "560px",
        margin: "0 auto",
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        role="img"
        aria-label={`${episodes.length} episodes plotted radially over a 0-${totalDuration}s capture`}
      >
        {/* Concentric guide rings — three thin circles at 0.33/0.66/1.0 conf. */}
        {[0.33, 0.66, 1.0].map((frac) => {
          const r = innerR + (maxR - innerR) * frac;
          return (
            <circle
              key={frac}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={LINE}
              strokeWidth={frac === 1.0 ? 0.18 : 0.12}
            />
          );
        })}

        {/* Time tick spokes — short marks at outer ring labeled with seconds. */}
        {tickAngles.map((s) => {
          const theta = -Math.PI / 2 + (s / totalDuration) * Math.PI * 2;
          const x1 = cx + (maxR + 1.2) * Math.cos(theta);
          const y1 = cy + (maxR + 1.2) * Math.sin(theta);
          const x2 = cx + (maxR + 4) * Math.cos(theta);
          const y2 = cy + (maxR + 4) * Math.sin(theta);
          const labelX = cx + (maxR + 7) * Math.cos(theta);
          const labelY = cy + (maxR + 7) * Math.sin(theta);
          return (
            <g key={s}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={TEXT_FAINT} strokeWidth={0.18} />
              <text
                x={labelX}
                y={labelY}
                fill={TEXT_MUTED}
                fontSize={2.4}
                fontFamily="var(--font-mono), monospace"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ letterSpacing: "0.04em" }}
              >
                {s}s
              </text>
            </g>
          );
        })}

        {/* Episode dots — drawn after the rings so they sit on top. */}
        {points.map(({ ep, i, x, y, sev, dotR }) => {
          const active = i === activeIdx;
          const hover = i === hoverIdx;
          const color = SEVERITY_COLOR[sev];
          return (
            <g key={ep.episode}>
              {(active || hover) && (
                <circle
                  cx={x}
                  cy={y}
                  r={dotR + 1.6}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.18}
                  opacity={0.6}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={dotR}
                fill={color}
                opacity={active ? 1 : hover ? 0.95 : 0.78}
                style={{
                  cursor: "pointer",
                  filter: active ? `drop-shadow(0 0 1.6px ${color})` : undefined,
                  transition: "opacity 140ms ease",
                }}
                onClick={() => onSelect(i)}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                tabIndex={0}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
              >
                <title>
                  {`ep ${ep.episode.toString().padStart(3, "0")} · ${ep.ts_start.toFixed(1)}s · ${(ep.confidence * 100).toFixed(0)}% · ${ep.spatial_claims.length} claims\n${ep.summary}`}
                </title>
              </circle>
            </g>
          );
        })}

        {/* Center marker — small ring + count, anchors the visualization. */}
        <circle cx={cx} cy={cy} r={innerR * 0.45} fill="none" stroke={LINE} strokeWidth={0.18} />
        <text
          x={cx}
          y={cy - 0.6}
          fill={WASHI}
          fontSize={4.4}
          fontFamily='"Times New Roman", Times, serif'
          textAnchor="middle"
          dominantBaseline="middle"
          fontWeight={400}
        >
          {episodes.length}
        </text>
        <text
          x={cx}
          y={cy + 4.2}
          fill={TEXT_MUTED}
          fontSize={2.2}
          fontFamily="var(--font-mono), monospace"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ letterSpacing: "0.06em" }}
        >
          episodes
        </text>
      </svg>

      {/* Hover/active readout — fixed slot below the constellation so the
          layout doesn't shift as the user moves the cursor. */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 14px",
          border: `1px solid ${LINE}`,
          background: "rgba(8,5,3,0.6)",
          minHeight: "84px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.04em",
          color: WASHI,
        }}
      >
        {hoverEp ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", color: TEXT_MUTED }}>
              <span>ep {hoverEp.episode.toString().padStart(3, "0")} · {hoverEp.ts_start.toFixed(1)}s</span>
              <span>
                {hoverEp.spatial_claims.length} claims · {(hoverEp.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ marginTop: "6px", color: WASHI, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.45 }}>
              {hoverEp.summary || "(no summary)"}
            </div>
          </>
        ) : (
          <div style={{ color: TEXT_FAINT, fontFamily: "var(--font-sans)", fontSize: "13px" }}>
            hover a node — angle = capture time, radius = confidence, dot = number of grounded spatial claims.
          </div>
        )}
      </div>
    </div>
  );
}
