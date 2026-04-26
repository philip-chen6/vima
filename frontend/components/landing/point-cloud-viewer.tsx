"use client";

// Point cloud viewer — loads a .ply (binary or ASCII) from a URL and renders
// it with mouse-orbit controls. Used on /demo to show the COLMAP sparse
// reconstruction from the masonry video (1770 points, 1.199px reproj error
// per the paper).
//
// Why not @react-three/drei: drei is 200KB+ for two helpers we don't need.
// Three core ships PLYLoader + OrbitControls. We use those directly through
// r3f's <primitive> + an imperative useEffect for controls.
//
// Failure modes handled:
//   - file 404 → "reconstruction not yet exported" empty state
//   - parse error → "unsupported PLY format" error state
//   - empty cloud (0 points) → same empty state as 404
//
// Performance: 1770 points renders at 60fps trivially. We pre-bake a small
// per-vertex attenuation for depth and use additive blending so the cloud
// reads as luminous in the dark yozakura backdrop.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const SAKURA_HOT = "#f2a7b8";
const SAKURA = "#A64D79";
const WASHI = "#f7ecef";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const LINE = "rgba(242,167,184,0.18)";

// ── Camera frustum: a thin pyramid showing where one frame was captured ─
// Drawn as a wireframe so it doesn't compete with the cloud. Hover/click
// fires onSelect with the frame name.
type CameraPose = {
  frame: string;
  position: [number, number, number];
  // Either a quaternion {x,y,z,w} or rotation: [x,y,z,w]. Both supported.
  rotation_quat?: [number, number, number, number];
  rotation?: [number, number, number, number];
};

function CameraFrustum({
  pose,
  active,
  onSelect,
}: {
  pose: CameraPose;
  active: boolean;
  onSelect: (frame: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const rot = pose.rotation_quat || pose.rotation || [0, 0, 0, 1];

  // Build a small frustum geometry: apex at origin, four corners 0.18 units
  // ahead. Edges only.
  const geometry = useMemo(() => {
    const s = 0.12;
    const d = 0.22;
    const points = [
      // apex to four corners
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(s, s, d),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-s, s, d),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(s, -s, d),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-s, -s, d),
      // far rectangle
      new THREE.Vector3(s, s, d), new THREE.Vector3(-s, s, d),
      new THREE.Vector3(-s, s, d), new THREE.Vector3(-s, -s, d),
      new THREE.Vector3(-s, -s, d), new THREE.Vector3(s, -s, d),
      new THREE.Vector3(s, -s, d), new THREE.Vector3(s, s, d),
    ];
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, []);

  return (
    <group
      ref={ref}
      position={pose.position}
      quaternion={[rot[0], rot[1], rot[2], rot[3]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(pose.frame);
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "default"; }}
    >
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          color={active ? "#f2a7b8" : "#A64D79"}
          transparent
          opacity={active ? 1.0 : 0.55}
          linewidth={1}
        />
      </lineSegments>
    </group>
  );
}

// ── Scene helper: orbit controls bound to the canvas ─────────────────────
function Controls({ autoRotate = true }: { autoRotate?: boolean }) {
  const { camera, gl } = useThree();
  const ref = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 0.6;
    controls.maxDistance = 30;
    ref.current = controls;
    return () => controls.dispose();
  }, [camera, gl, autoRotate]);

  useFrame(() => ref.current?.update());
  return null;
}

// ── Point cloud mesh: positions buffer + per-vertex color ─────────────────
function Cloud({ geometry }: { geometry: THREE.BufferGeometry }) {
  // Points material: small, additive, washi-tinted with subtle sakura on Z.
  // We don't use vertex colors from the PLY directly — COLMAP outputs
  // uncalibrated RGB which often looks muddy. Instead we color by depth
  // (z-axis distance from centroid) so the cloud reads as a clean
  // wireframe-style object in the dark theme.
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.04,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Compute per-vertex colors based on Z position once.
  useEffect(() => {
    const positions = geometry.attributes.position;
    if (!positions) return;

    let zMin = Infinity;
    let zMax = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
    const zRange = zMax - zMin || 1;

    const colors = new Float32Array(positions.count * 3);
    const washi = new THREE.Color(WASHI);
    const sakura = new THREE.Color(SAKURA_HOT);
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      const t = (z - zMin) / zRange;
      const c = washi.clone().lerp(sakura, t * 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [geometry]);

  return <points geometry={geometry} material={material} />;
}

// ── Main viewer ──────────────────────────────────────────────────────────
type Status =
  | { kind: "loading" }
  | { kind: "ready"; geometry: THREE.BufferGeometry; pointCount: number }
  | { kind: "missing" }
  | { kind: "error"; message: string };

export interface PointCloudViewerProps {
  /** Path to a .ply file in /public, e.g. "/reconstruction/sparse.ply" */
  src: string;
  /** Optional path to a cameras.json with [{frame, position, rotation_quat}].
   *  When present, render a small frustum at each registered frame pose.
   *  Empty / missing → only points are drawn. */
  camerasSrc?: string;
  /** Caption label rendered as a chip on the panel */
  label?: string;
  /** Auto-rotate the cloud */
  autoRotate?: boolean;
  /** Callback fired when a camera frustum is clicked. */
  onSelectFrame?: (frame: string) => void;
}

export function PointCloudViewer({
  src,
  camerasSrc,
  label = "colmap sparse · 1770 points",
  autoRotate = true,
  onSelectFrame,
}: PointCloudViewerProps) {
  const [cameras, setCameras] = useState<CameraPose[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);

  // Optional cameras fetch — runs in parallel with the cloud load. 404 is
  // fine; we just don't render frustums.
  useEffect(() => {
    if (!camerasSrc) return;
    let cancelled = false;
    fetch(camerasSrc, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) return;
        // Normalize the schema — accept rotation_quat or rotation, default
        // identity quat if missing.
        const normalized: CameraPose[] = data
          .filter((d) => d && d.position && Array.isArray(d.position))
          .map((d) => ({
            frame: d.frame || d.image || "?",
            position: d.position,
            rotation_quat: d.rotation_quat || d.rotation || [0, 0, 0, 1],
          }));
        setCameras(normalized);
      })
      .catch(() => { /* swallowed — frustums are best-effort */ });
    return () => { cancelled = true; };
  }, [camerasSrc]);

  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "loading" });

    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) {
          if (!cancelled) setStatus({ kind: "missing" });
          return Promise.reject(new Error("missing"));
        }
        return new PLYLoader().loadAsync(src);
      })
      .then((geom) => {
        if (cancelled) return;
        // Recenter the cloud on its centroid + scale to fit the viewport.
        // COLMAP outputs in arbitrary world units; we don't care about
        // physical scale, just visual fit.
        geom.computeBoundingBox();
        if (geom.boundingBox) {
          const center = new THREE.Vector3();
          geom.boundingBox.getCenter(center);
          geom.translate(-center.x, -center.y, -center.z);
          const size = new THREE.Vector3();
          geom.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) geom.scale(2 / maxDim, 2 / maxDim, 2 / maxDim);
        }
        const positions = geom.attributes.position;
        const pointCount = positions ? positions.count : 0;
        if (pointCount === 0) {
          setStatus({ kind: "missing" });
          return;
        }
        setStatus({ kind: "ready", geometry: geom, pointCount });
      })
      .catch((err) => {
        if (cancelled) return;
        if (status.kind !== "missing") {
          setStatus({ kind: "error", message: String(err.message || err) });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 10",
        border: `1px solid ${LINE}`,
        background: "linear-gradient(180deg, #0c0508 0%, #050203 100%)",
        overflow: "hidden",
      }}
    >
      {status.kind === "ready" && (
        <Canvas
          camera={{ position: [2.4, 1.8, 2.6], fov: 38, near: 0.05, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.6} />
          <Cloud geometry={status.geometry} />
          {cameras.map((pose) => (
            <CameraFrustum
              key={pose.frame}
              pose={pose}
              active={activeCamera === pose.frame}
              onSelect={(f) => {
                setActiveCamera(f);
                onSelectFrame?.(f);
              }}
            />
          ))}
          <Controls autoRotate={autoRotate} />
        </Canvas>
      )}

      {/* Loading state */}
      {status.kind === "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: TEXT_MUTED,
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.05em",
          }}
        >
          loading reconstruction...
        </div>
      )}

      {/* Empty state — file isn't on disk yet */}
      {status.kind === "missing" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            color: TEXT_MUTED,
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.05em",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <span style={{ color: SAKURA_HOT, fontSize: "10px" }}>
            reconstruction · pending export
          </span>
          <span style={{ maxWidth: "360px", lineHeight: 1.5, color: "rgba(247,236,239,0.42)" }}>
            COLMAP sparse cloud (1,770 verts, 1.199px reprojection error)
            scoped for handoff. Drop sparse.ply at <code style={{ color: WASHI, fontFamily: "var(--font-mono)" }}>{src}</code> and the viewer renders on next reload.
          </span>
        </div>
      )}

      {/* Error state */}
      {status.kind === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef476f",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.04em",
            padding: "20px",
            textAlign: "center",
          }}
        >
          could not load reconstruction: {status.message}
        </div>
      )}

      {/* Always-on label chip — top-left, doesn't disturb the cloud */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          padding: "5px 10px",
          border: `1px solid ${LINE}`,
          background: "rgba(8,5,3,0.78)",
          color: SAKURA_HOT,
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.08em",
          backdropFilter: "blur(6px)",
        }}
      >
        {label}
      </div>

      {/* Hint chip — top-right, only when there's something to interact with */}
      {status.kind === "ready" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            padding: "5px 10px",
            border: `1px solid ${LINE}`,
            background: "rgba(8,5,3,0.78)",
            color: TEXT_MUTED,
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.06em",
            backdropFilter: "blur(6px)",
          }}
        >
          drag · scroll to zoom · {status.pointCount} pts{cameras.length > 0 ? ` · ${cameras.length} cams` : ""}
        </div>
      )}
    </div>
  );
}

export default PointCloudViewer;
