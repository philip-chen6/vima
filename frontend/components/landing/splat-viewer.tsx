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
// Default asset: /reconstruction/masonry-splat-10k.ply (5.3MB, 22,553
// gaussians, trained 10k steps via Brush v0.3.0). The 30k variant
// (~15MB, 62,783 gaussians) lives at /reconstruction/masonry-splat-30k.ply
// for high-detail viewing — pass src="/reconstruction/masonry-splat-30k.ply"
// to opt in. We default to 10k so /demo's first paint isn't gated on a
// 15MB download.
//
// Failure modes handled:
//   - asset missing → "splat not yet exported" empty state
//   - WebGL2 unavailable → "needs WebGL2" empty state
//   - viewer init throws → "viewer error" empty state with the message

import { useEffect, useRef, useState } from "react";

// Yozakura tokens — must match DESIGN.md. AMBER kept as alias to sakura
// so any downstream JSX referencing it doesn't need surgery.
const AMBER = "#f2a7b8"; // sakura-hot (was amber #f59e0b)
const CREAM = "#f7ecef"; // washi (was warm cream)
const TEXT_MUTED = "rgba(247,236,239,0.55)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const LINE = "rgba(242,167,184,0.22)";

// COLMAP-style camera pose. position is world-space [x,y,z], rotation_quat
// is [x,y,z,w] (three.js convention), fov_deg is vertical FOV in degrees.
export type SplatCameraPose = {
  position: [number, number, number];
  rotation_quat: [number, number, number, number];
  fov_deg?: number;
  label?: string;
};

export function SplatViewer({
  src = "/reconstruction/masonry-splat-10k.ply",
  label = "gaussian splat · masonry capture",
  cameraPose = null,
}: {
  src?: string;
  label?: string;
  /** When set, snaps the splat camera to this COLMAP-registered pose.
   *  Driven by clicking a frustum in the sibling COLMAP point cloud. */
  cameraPose?: SplatCameraPose | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [splatCount, setSplatCount] = useState<number | null>(null);
  // Intersection gate — defer init() until the viewer is in (or near) the
  // viewport. The 5MB splat download + three.js parse otherwise hits the
  // critical path even though the section sits two scroll-pages down.
  const [shouldInit, setShouldInit] = useState(false);

  useEffect(() => {
    if (!containerRef.current || shouldInit) return;
    const el = containerRef.current;
    if (typeof IntersectionObserver === "undefined") {
      // SSR or ancient browser — skip the gate, init immediately.
      setShouldInit(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldInit(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin: "400px 0px" }, // start ~half a viewport early
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldInit]);

  useEffect(() => {
    if (!shouldInit) return;
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
  }, [src, shouldInit]);

  // Imperative camera pose snap. Whenever cameraPose changes (e.g. user
  // clicks a frustum in the COLMAP viewer), warp the splat's camera to
  // that exact bodycam position + orientation + FOV. We have to do this
  // after the viewer is `ready` because viewer.camera doesn't exist
  // before init resolves.
  useEffect(() => {
    if (status !== "ready" || !cameraPose) return;
    const viewer = viewerRef.current;
    if (!viewer?.camera) return;

    let cancelled = false;
    (async () => {
      // Three.js is already loaded (mkkellogg pulls it in transitively).
      // Dynamic import keeps the bundler happy and avoids a duplicate copy.
      const THREE = await import("three");
      if (cancelled || !viewerRef.current?.camera) return;

      const cam = viewerRef.current.camera;
      cam.position.set(...cameraPose.position);

      // COLMAP quat → THREE quat. Both use [x,y,z,w] order.
      const q = new THREE.Quaternion(
        cameraPose.rotation_quat[0],
        cameraPose.rotation_quat[1],
        cameraPose.rotation_quat[2],
        cameraPose.rotation_quat[3],
      );
      cam.quaternion.copy(q);

      // FOV — three.js PerspectiveCamera takes vertical FOV in degrees.
      // Josh's intrinsics give vertical FOV directly (64.8° for the
      // SIMPLE_RADIAL model). Update the projection matrix after.
      if (cameraPose.fov_deg && "fov" in cam) {
        cam.fov = cameraPose.fov_deg;
        cam.updateProjectionMatrix?.();
      }

      // Tell the orbit controls (if any) to re-anchor on this pose so
      // user drags continue from here instead of snapping back.
      const controls = viewerRef.current.controls;
      if (controls?.target) {
        // Place the orbit target 1 meter ahead along the camera's local -Z.
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
        controls.target.set(
          cameraPose.position[0] + fwd.x,
          cameraPose.position[1] + fwd.y,
          cameraPose.position[2] + fwd.z,
        );
        controls.update?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cameraPose, status]);

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
