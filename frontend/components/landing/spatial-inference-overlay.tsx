"use client";

// Spatial inference overlay — shows depth heatmap + SAM masks on top of the
// raw masonry frame. Toggleable layers, frame scrubber, no backend dependency
// (everything is precomputed and served as static PNGs from /inference/).
//
// Why static instead of live inference: the prod VPS is 1 vCPU / 2GB RAM (no
// GPU). Vultr's cloud GPU plans need a manual support request. So depth +
// SAM run offline on the laptop (Apple Silicon MPS), results ship as PNGs.
// For the fixed demo set this is visually indistinguishable from live and
// 100x more reliable.
//
// Asset layout (built by backend/scripts/precompute_inference.py):
//   /masonry-frames-raw/{filename}.jpg        — raw RGB
//   /inference/{frame_id}/depth.png           — turbo-colormap heatmap
//   /inference/{frame_id}/mask.png            — RGBA SAM overlay (alpha=128)
//   /inference/manifest.json                  — array of {frame_id, urls, stats}

import { useEffect, useMemo, useState } from "react";

// ── Yozakura terminal palette (matches DESIGN.md) ───────────────────────
// AMBER kept as alias to sakura-hot so the JSX below doesn't need rewriting.
const INK = "#080503";
const AMBER = "#f2a7b8"; // sakura-hot (was amber #f59e0b)
const CREAM = "#f7ecef"; // washi (was warm cream)
const TEXT_MUTED = "rgba(247,236,239,0.55)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const LINE = "rgba(242,167,184,0.22)";

type Layer = "rgb" | "depth" | "mask" | "stack";

type ManifestEntry = {
  frame_id: string;
  filename: string;
  frame_idx: number;
  timestamp_s: number;
  depth: { url: string; depth_min: number; depth_max: number; depth_mean: number; shape: [number, number] };
  mask: { url: string; n_masks: number; grid: number; shape: [number, number] };
};

const LAYERS: { id: Layer; label: string; hint: string }[] = [
  { id: "rgb", label: "rgb", hint: "raw bodycam frame" },
  { id: "depth", label: "depth", hint: "monocular depth (depth-anything-v2-small)" },
  { id: "mask", label: "masks", hint: "segment-anything (sam-vit-base, 8x8 prompt grid)" },
  { id: "stack", label: "stacked", hint: "rgb + depth (60%) + masks" },
];

export function SpatialInferenceOverlay() {
  const [manifest, setManifest] = useState<ManifestEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [layer, setLayer] = useState<Layer>("stack");

  useEffect(() => {
    fetch("/inference/manifest.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`manifest http ${r.status}`);
        return r.json();
      })
      .then((data: ManifestEntry[]) => setManifest(data))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const current = manifest?.[idx] ?? null;

  // Pick a stable display caption for the layer + frame.
  const caption = useMemo(() => {
    if (!current) return "";
    const t = current.timestamp_s.toFixed(1).padStart(4, "0");
    return `t+${t}s · ${current.filename}`;
  }, [current]);

  if (error) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>spatial inference</span>
          <span style={{ color: AMBER, fontFamily: "var(--font-saans-mono, monospace)" }}>
            error
          </span>
        </div>
        <div style={{ padding: "24px", color: TEXT_MUTED, fontFamily: "var(--font-saans-mono, monospace)", fontSize: 12 }}>
          could not load /inference/manifest.json — has{" "}
          <code style={{ color: AMBER }}>backend/scripts/precompute_inference.py</code> run yet?
          <br />
          <span style={{ color: TEXT_FAINT }}>{error}</span>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>spatial inference</span>
          <span style={statusStyle}>loading…</span>
        </div>
        <div style={{ aspectRatio: "16 / 10", background: "linear-gradient(180deg, #0c0807 0%, #050302 100%)" }} />
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={titleStyle}>spatial inference</span>
          <span style={{ ...statusStyle, color: TEXT_FAINT }}>
            depth-anything-v2-small · sam-vit-base · precomputed offline (mps)
          </span>
        </div>
        <span style={{ ...statusStyle, color: AMBER, fontVariantNumeric: "tabular-nums" }}>
          {String(idx + 1).padStart(2, "0")} / {String(manifest.length).padStart(2, "0")}
        </span>
      </div>

      {/* canvas — stacked image layers */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${current!.depth.shape[1]} / ${current!.depth.shape[0]}`,
          background: INK,
          overflow: "hidden",
        }}
      >
        {/* base RGB always present so layers compose against it */}
        <img
          src={`/masonry-frames-raw/${current!.filename}`}
          alt={current!.filename}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: layer === "depth" ? 0 : layer === "mask" ? 0.85 : layer === "stack" ? 1 : 1,
          }}
        />
        {/* depth heatmap */}
        <img
          src={current!.depth.url}
          alt="depth"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: layer === "depth" ? 1 : layer === "stack" ? 0.55 : 0,
            mixBlendMode: layer === "stack" ? "screen" : "normal",
            transition: "opacity 180ms ease",
          }}
        />
        {/* SAM masks (RGBA, already 50% alpha in the file) */}
        <img
          src={current!.mask.url}
          alt="masks"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: layer === "mask" ? 1 : layer === "stack" ? 0.75 : 0,
            transition: "opacity 180ms ease",
            pointerEvents: "none",
          }}
        />

        {/* corner readouts */}
        <div style={cornerTL}>{caption}</div>
        <div style={cornerTR}>{LAYERS.find((l) => l.id === layer)?.hint}</div>
        <div style={cornerBL}>
          depth μ={current!.depth.depth_mean.toFixed(2)} · range {current!.depth.depth_min.toFixed(2)}…{current!.depth.depth_max.toFixed(2)}
        </div>
        <div style={cornerBR}>{current!.mask.n_masks} segments</div>
      </div>

      {/* layer toggle */}
      <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${LINE}` }}>
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLayer(l.id)}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: layer === l.id ? "rgba(242,167,184,0.10)" : "transparent",
              border: "none",
              borderRight: `1px solid ${LINE}`,
              color: layer === l.id ? AMBER : TEXT_MUTED,
              fontFamily: "var(--font-saans-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "background 120ms, color 120ms",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* frame scrubber */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${LINE}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--font-saans-mono, monospace)",
          fontSize: 11,
        }}
      >
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          style={navBtn(idx === 0)}
        >
          ‹ prev
        </button>
        <input
          type="range"
          min={0}
          max={manifest.length - 1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          style={{ flex: 1, accentColor: AMBER }}
        />
        <button
          onClick={() => setIdx((i) => Math.min(manifest.length - 1, i + 1))}
          disabled={idx === manifest.length - 1}
          style={navBtn(idx === manifest.length - 1)}
        >
          next ›
        </button>
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #0c0807 0%, #050302 100%)",
  border: `1px solid ${LINE}`,
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: `1px solid ${LINE}`,
};

const titleStyle: React.CSSProperties = {
  color: CREAM,
  fontFamily: "var(--font-saans-mono, monospace)",
  fontSize: 12,
  letterSpacing: "0.06em",
};

const statusStyle: React.CSSProperties = {
  color: TEXT_MUTED,
  fontFamily: "var(--font-saans-mono, monospace)",
  fontSize: 10,
  letterSpacing: "0.04em",
};

const cornerBase: React.CSSProperties = {
  position: "absolute",
  fontFamily: "var(--font-saans-mono, monospace)",
  fontSize: 10,
  color: CREAM,
  background: "rgba(8,5,3,0.72)",
  padding: "4px 8px",
  border: `1px solid ${LINE}`,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.03em",
  pointerEvents: "none",
};
const cornerTL: React.CSSProperties = { ...cornerBase, top: 8, left: 8 };
const cornerTR: React.CSSProperties = { ...cornerBase, top: 8, right: 8, color: AMBER };
const cornerBL: React.CSSProperties = { ...cornerBase, bottom: 8, left: 8 };
const cornerBR: React.CSSProperties = { ...cornerBase, bottom: 8, right: 8 };

const navBtn = (disabled: boolean): React.CSSProperties => ({
  background: "transparent",
  border: `1px solid ${LINE}`,
  color: disabled ? TEXT_FAINT : CREAM,
  padding: "4px 10px",
  fontFamily: "var(--font-saans-mono, monospace)",
  fontSize: 11,
  cursor: disabled ? "not-allowed" : "pointer",
  letterSpacing: "0.04em",
});
