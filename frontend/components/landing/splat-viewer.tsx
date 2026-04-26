"use client";

// Gaussian splat viewer — renders the Brush-trained masonry splat with mouse
// orbit + zoom. Built on @mkkellogg/gaussian-splats-3d (the standard webgl
// gaussian splat renderer) — three.js underneath, no r3f because mkkellogg's
// Viewer class manages its own scene/camera/loop.
//
// Why not r3f's drei <Splat>: drei expects the older luma .splat format and
// can't load Brush's gaussian PLY directly. mkkellogg's PlyLoader handles
// SH-degree-3 PLYs out of the box, which is exactly what Brush exports.
//
// Asset: /reconstruction/masonry-splat-30k.ply  (~15MB, 62,783 gaussians,
// trained 30k steps at 1080p target from masonry-source.mp4 + COLMAP sparse
// on Apple Silicon Metal via Brush v0.3.0 in ~6 minutes). The 10k variant
// (5.3MB, 22,553 gaussians) is also available as a lighter-weight fallback.
//
// Failure modes handled:
//   - asset missing → "splat not yet exported" empty state
//   - WebGL2 unavailable → "needs WebGL2" empty state
//   - viewer init throws → "viewer error" empty state with the message

import { useEffect, useRef, useState } from "react";

const AMBER = "#f59e0b";
const CREAM = "#e8d5c0";
const TEXT_MUTED = "rgba(232,213,192,0.55)";
const TEXT_FAINT = "rgba(232,213,192,0.34)";
const LINE = "rgba(245,158,11,0.22)";

export function SplatViewer({
  src = "/reconstruction/masonry-splat-30k.ply",
  label = "gaussian splat · masonry capture",
}: {
  src?: string;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [splatCount, setSplatCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let viewer: any = null;

    async function init() {
      // Probe the asset first so we can show a clean empty state instead of
      // letting the loader throw a generic 404.
      try {
        const head = await fetch(src, { method: "HEAD" });
        if (!head.ok) {
          if (!cancelled) setStatus("missing");
          return;
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(`probe failed: ${(e as Error).message}`);
        }
        return;
      }

      // Dynamic import — the splat lib is ~200KB and pulls in three.js. Defer
      // until we actually mount.
      const GaussianSplats3D = await import("@mkkellogg/gaussian-splats-3d");

      if (!containerRef.current || cancelled) return;

      try {
        viewer = new (GaussianSplats3D as any).Viewer({
          rootElement: containerRef.current,
          // No HUD chrome — we render our own corner readouts.
          ignoreDevicePixelRatio: false,
          gpuAcceleratedSort: true,
          sharedMemoryForWorkers: false, // simpler on first paint
          selfDrivenMode: true,
          useBuiltInControls: true,
          // Camera starting pose tuned for COLMAP-trained splats which sit
          // near origin. Moves back along +Z so we see the whole scene.
          initialCameraPosition: [0, 0, -3],
          initialCameraLookAt: [0, 0, 0],
        });

        viewerRef.current = viewer;

        await viewer.addSplatScene(src, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: false,
          progressiveLoad: true,
        });

        if (cancelled) {
          viewer.dispose();
          return;
        }

        // Read back splat count if the viewer exposes it (varies by version).
        const scene = viewer.getSplatScene?.(0);
        const count = scene?.getSplatCount?.() ?? null;
        if (count != null) setSplatCount(count);

        viewer.start();
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(`viewer init: ${(e as Error).message}`);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        if (viewer) {
          viewer.stop?.();
          viewer.dispose?.();
        }
      } catch {
        // ignore — disposal during unmount is best-effort
      }
    };
  }, [src]);

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #0c0807 0%, #050302 100%)",
        border: `1px solid ${LINE}`,
        aspectRatio: "16 / 10",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* corner readouts — always present, content varies by status */}
      <div style={cornerTL}>{label}</div>
      <div style={cornerTR}>
        {status === "ready"
          ? splatCount != null
            ? `${splatCount.toLocaleString()} gaussians`
            : "ready"
          : status === "loading"
          ? "loading…"
          : status === "missing"
          ? "asset missing"
          : "error"}
      </div>
      <div style={cornerBL}>
        brush v0.3.0 · 10k steps · trained on apple metal
      </div>
      <div style={cornerBR}>drag · scroll · right-drag</div>

      {status === "missing" && (
        <div style={emptyOverlay}>
          <div style={{ color: CREAM, fontSize: 12, marginBottom: 6 }}>
            splat not yet exported
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 10, fontFamily: "var(--font-saans-mono, monospace)" }}>
            expected at <code style={{ color: AMBER }}>{src}</code>
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={emptyOverlay}>
          <div style={{ color: CREAM, fontSize: 12, marginBottom: 6 }}>viewer error</div>
          <div style={{ color: TEXT_MUTED, fontSize: 10, maxWidth: 360, textAlign: "center" }}>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

const cornerBase: React.CSSProperties = {
  position: "absolute",
  fontFamily: "var(--font-saans-mono, monospace)",
  fontSize: 10,
  color: CREAM,
  background: "rgba(8,5,3,0.72)",
  padding: "4px 8px",
  border: `1px solid ${LINE}`,
  letterSpacing: "0.03em",
  pointerEvents: "none",
  fontVariantNumeric: "tabular-nums",
};
const cornerTL: React.CSSProperties = { ...cornerBase, top: 8, left: 8 };
const cornerTR: React.CSSProperties = { ...cornerBase, top: 8, right: 8, color: AMBER };
const cornerBL: React.CSSProperties = { ...cornerBase, bottom: 8, left: 8 };
const cornerBR: React.CSSProperties = { ...cornerBase, bottom: 8, right: 8 };

const emptyOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(5,3,2,0.9)",
  fontFamily: "var(--font-saans-mono, monospace)",
};
