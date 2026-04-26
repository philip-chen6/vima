"use client";

/**
 * <Logo /> — vima brand logo (hex-nut mark + optional wordmark).
 *
 * Inspired by Framer's "Logo Shaders" pattern (https://www.framer.com/updates/logo-shaders):
 * edge-aware visual treatments applied non-destructively over a base mark shape.
 *
 * Variants:
 *   static    — flat, no motion. Default.
 *   sheen     — slow metallic light-pass across the face (SVG SMIL, ~3.6s loop).
 *   bevel     — static depth via feSpecularLighting filter (SVG, no animation).
 *   gradient  — raw WebGL2 fragment shader rendering iridescent plasma flow
 *               inside the hex donut. Animated.
 *   metallic  — React Bits Pro MetallicPaint shader (Poisson-solved depth +
 *               liquid-metal fragment shader) tinted with a gradient palette.
 *               Animated. Larger by default (sized for hero lockups).
 *
 * Props:
 *   size        — pixel size of the mark (square). Default 44 for small variants,
 *                 128 for metallic.
 *   variant     — visual treatment (see above). Default "static".
 *   color       — accent color for stroke + face gradient. Default cream `#e8d5c0`.
 *   wordmark    — when true, render the wordmark text inline next to the mark.
 *   strokeWidth — stroke weight on the hex edges. Default 1.5.
 *   className   — passes through to the outer wrapper.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import MetallicPaint from "./metallic-paint";

const SQRT3_2 = 0.8660254037844387;
const DEFAULT_COLOR = "#e8d5c0";

// Outer hex (pointy-top) path centered at (cx, cy) with radius r.
function hexPathPointy(cx: number, cy: number, r: number): string {
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

// Inner hex rotated by `rotDeg` degrees about (cx, cy).
function hexPathRotated(cx: number, cy: number, r: number, rotDeg: number): string {
  const phi = (rotDeg * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const base: Array<[number, number]> = [
    [0, -r],
    [r * SQRT3_2, -r * 0.5],
    [r * SQRT3_2,  r * 0.5],
    [0,  r],
    [-r * SQRT3_2, r * 0.5],
    [-r * SQRT3_2, -r * 0.5],
  ];
  const pts = base.map(([x, y]) => [
    cx + x * cosP - y * sinP,
    cy + x * sinP + y * cosP,
  ]);
  return (
    `M ${pts[0][0]} ${pts[0][1]} ` +
    pts.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ") +
    " Z"
  );
}

export type LogoVariant = "static" | "sheen" | "bevel" | "gradient" | "metallic";

export interface LogoProps {
  size?: number;
  variant?: LogoVariant;
  color?: string;
  wordmark?: boolean;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export default function Logo({
  size = 44,
  variant = "static",
  color = DEFAULT_COLOR,
  wordmark = false,
  strokeWidth = 1.5,
  className,
  ariaLabel = "vima",
}: LogoProps) {
  // Dispatch to the WebGL renderer for the gradient variant.
  // Falls back to a static SVG render server-side; the canvas mounts on hydration.
  if (variant === "gradient") {
    return (
      <GradientLogoFrame
        size={size}
        color={color}
        wordmark={wordmark}
        strokeWidth={strokeWidth}
        className={className}
        ariaLabel={ariaLabel}
      />
    );
  }

  // Dispatch to the MetallicPaint shader for the metallic variant.
  if (variant === "metallic") {
    return (
      <MetallicLogoFrame
        size={size}
        color={color}
        wordmark={wordmark}
        className={className}
        ariaLabel={ariaLabel}
      />
    );
  }

  // Hex nut geometry — outer pointy-top, inner flat-top (rotated 30°).
  const cx = 32;
  const cy = 32;
  const rOuter = 26;
  const rInner = 12;
  const outerD = hexPathPointy(cx, cy, rOuter);
  const innerD = hexPathRotated(cx, cy, rInner, 30);

  // Stable IDs (SSR-safe — no Math.random).
  const ID = "vima-logo";
  const idFaceGrad = `${ID}-face-${variant}`;
  const idSheenGrad = `${ID}-sheen`;
  const idBevelFilter = `${ID}-bevel`;
  const idClip = `${ID}-clip`;

  const showSheen = variant === "sheen";
  const showBevel = variant === "bevel";

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={wordmark ? undefined : className}
    >
      <defs>
        {/* Face gradient — top-left lit → bottom-right shadowed. */}
        <linearGradient id={idFaceGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>

        {/* Sheen — narrow bright band that translates across the X axis. */}
        {showSheen && (
          <linearGradient
            id={idSheenGrad}
            x1="-0.5"
            y1="0"
            x2="0.5"
            y2="0"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%"   stopColor={color} stopOpacity="0" />
            <stop offset="42%"  stopColor={color} stopOpacity="0" />
            <stop offset="50%"  stopColor={color} stopOpacity="0.55" />
            <stop offset="58%"  stopColor={color} stopOpacity="0" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1.4 0"
              to="1.4 0"
              dur="3.6s"
              repeatCount="indefinite"
              additive="replace"
            />
          </linearGradient>
        )}

        {/* Clip the sheen overlay to the hex donut shape. */}
        {showSheen && (
          <clipPath id={idClip}>
            <path d={`${outerD} ${innerD}`} fillRule="evenodd" />
          </clipPath>
        )}

        {/* Bevel — specular highlight via SVG filter. */}
        {showBevel && (
          <filter id={idBevelFilter} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="3"
              specularConstant="0.9"
              specularExponent="22"
              lightingColor="#ffffff"
              result="spec"
            >
              <fePointLight x="-12" y="-14" z="60" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" operator="in" result="specOut" />
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        )}
      </defs>

      {/* ── Filled donut face ───────────────────────────────────────────── */}
      <path
        d={`${outerD} ${innerD}`}
        fill={`url(#${idFaceGrad})`}
        fillRule="evenodd"
        filter={showBevel ? `url(#${idBevelFilter})` : undefined}
      />

      {/* ── Sheen overlay (clipped to donut) ────────────────────────────── */}
      {showSheen && (
        <g clipPath={`url(#${idClip})`}>
          <rect x="0" y="0" width="64" height="64" fill={`url(#${idSheenGrad})`} />
        </g>
      )}

      {/* ── Edges ───────────────────────────────────────────────────────── */}
      <path d={outerD} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d={innerD} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );

  if (!wordmark) return mark;

  // Wordmark layout: mark + "vima" text, vertically centered.
  // The wordmark cap-height is tuned to ~70% of the mark size so the two
  // optical-balance instead of measuring exactly equal.
  const wordSize = Math.round(size * 0.85);
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.round(size * 0.32)}px`,
      }}
    >
      {mark}
      <WordmarkText size={wordSize} color={color} />
    </div>
  );
}

// ─── GradientLogoFrame — WebGL2 plasma shader masked to the hex donut ─────
// "Plasma" palette: violet → magenta → teal → cream. Animated flow field
// (layered sines, no noise textures) inside the hex donut shape.
// Strokes are an SVG overlay so they stay crisp regardless of canvas DPR.

const PLASMA_PALETTE = `
vec3 plasma(float t) {
  vec3 c0 = vec3(0.039, 0.020, 0.070); // #0a0512
  vec3 c1 = vec3(0.290, 0.102, 0.306); // #4a1a4e
  vec3 c2 = vec3(0.659, 0.216, 0.561); // #a8378f
  vec3 c3 = vec3(0.243, 0.718, 0.659); // #3eb7a8
  vec3 c4 = vec3(0.910, 0.835, 0.753); // #e8d5c0
  if (t < 0.25) return mix(c0, c1, t * 4.0);
  if (t < 0.50) return mix(c1, c2, (t - 0.25) * 4.0);
  if (t < 0.75) return mix(c2, c3, (t - 0.50) * 4.0);
  return mix(c3, c4, (t - 0.75) * 4.0);
}
`;

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform float uTime;

${PLASMA_PALETTE}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.32;

  // Flow field — layered sine waves displace the sample point.
  vec2 p = uv * 2.0 - 1.0;
  p.x += sin(uv.y * 5.0  + t * 1.20) * 0.18;
  p.y += cos(uv.x * 4.7  + t * 1.50) * 0.20;
  p.x += sin((uv.x + uv.y) * 8.0 + t * 0.80) * 0.10;
  p.y += cos((uv.x - uv.y) * 7.0 + t * 0.65) * 0.08;

  // Composite oscillator — outputs in roughly [0,1].
  float v = (
    sin(p.x * 2.5 + p.y * 1.8 + t * 0.6) +
    cos(p.y * 3.0 - p.x * 2.2 + t * 0.4) * 0.7
  ) * 0.5 + 0.5;
  v = clamp(v, 0.0, 1.0);

  outColor = vec4(plasma(v), 1.0);
}
`;

interface GradientFrameProps {
  size: number;
  color: string;
  wordmark: boolean;
  strokeWidth: number;
  className?: string;
  ariaLabel: string;
}

function GradientLogoFrame({
  size,
  color,
  wordmark,
  strokeWidth,
  className,
  ariaLabel,
}: GradientFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hex geometry in viewBox-64 space, then scaled to actual pixel size for
  // the canvas's CSS clip-path (which uses pixel units, not viewBox units).
  const cx = 32, cy = 32, rOuter = 26, rInner = 12;
  const outerD = hexPathPointy(cx, cy, rOuter);
  const innerD = hexPathRotated(cx, cy, rInner, 30);
  const scale = size / 64;
  const outerDClip = hexPathPointy(cx * scale, cy * scale, rOuter * scale);
  const innerDClip = hexPathRotated(cx * scale, cy * scale, rInner * scale, 30);
  const clip = `path(evenodd, '${outerDClip} ${innerDClip}')`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // WebGL2 only — the GLSL3 in the shader requires it.
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) {
      console.warn("[Logo gradient] WebGL2 unavailable; canvas will be empty.");
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Compile shaders.
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("[Logo gradient] shader compile error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[Logo gradient] program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Fullscreen quad (4 verts, triangle strip).
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");

    // Visibility gating: pause off-screen + when tab hidden.
    let isVisible = true;
    let isDocVisible = !document.hidden;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) isVisible = e.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(container);
    const onVisibilityChange = () => {
      isDocVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let raf = 0;
    const startMs = performance.now();
    const tick = (nowMs: number) => {
      raf = requestAnimationFrame(tick);
      if (!isVisible || !isDocVisible) return;
      gl.uniform1f(uTime, (nowMs - startMs) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [size]);

  const mark = (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={wordmark ? undefined : className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          clipPath: clip,
          WebkitClipPath: clip,
          display: "block",
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        aria-hidden
      >
        <path d={outerD} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <path d={innerD} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      </svg>
    </div>
  );

  if (!wordmark) return mark;

  const wordSize = Math.round(size * 0.85);
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.round(size * 0.32)}px`,
      }}
    >
      {mark}
      <WordmarkText size={wordSize} color={color} />
    </div>
  );
}

// ─── WordmarkText — "v i m a." thin Times New Roman brand wordmark ────────
function WordmarkText({ size, color }: { size: number; color: string }) {
  return (
    <span
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: `${size}px`,
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: "0",
        color,
        whiteSpace: "nowrap",
      }}
    >
      v i m a.
    </span>
  );
}

// ─── Metallic palette + shader params (shared by mark + wordmark) ─────────
// Centralized so the hex-nut and the "v i m a." text render with
// identical material — the lockup reads as one cohesive object.
const METALLIC_PARAMS = {
  lightColor: "#f7ecef",
  darkColor: "#3b1c32",
  tintColor: "#a64d79",
  seed: 42,
  scale: 2.4,
  speed: 0.10,
  liquid: 0.72,
  brightness: 1.68,
  contrast: 0.92,
  refraction: 0.012,
  blur: 0.014,
  chromaticSpread: 0.8,
  fresnel: 3.1,
  patternSharpness: 1.8,
  waveAmplitude: 0.95,
  noiseScale: 0.42,
  distortion: 0.82,
  contour: 0.68,
  mouseAnimation: false,
} as const;

const WORDMARK_METALLIC_PARAMS = {
  ...METALLIC_PARAMS,
  darkColor: "#74435f",
  liquid: 0.56,
  brightness: 1.86,
  contrast: 0.64,
  refraction: 0.004,
  blur: 0.018,
  chromaticSpread: 0.12,
  fresnel: 2.2,
  patternSharpness: 1.25,
  waveAmplitude: 0.42,
  noiseScale: 0.28,
  distortion: 0.28,
  contour: 0.34,
} as const;

// ─── MetallicWordmark — glyphs rasterized onto canvases, fed to MetallicPaint ─
// Renders each glyph onto its own mask so the liquid-metal phase does not move
// through the whole word as one synchronized sheet.
//
// High-resolution font size used for canvas rasterization. The depth solver
// auto-scales this to MAX_SIZE=1000 if it exceeds that; smaller is downsampled.
const RASTER_FONT_SIZE = 240;

function MetallicWordmark({ size }: { size: number }) {
  const [glyphs, setGlyphs] = useState<Array<{
    char: string;
    imageSrc: string;
    aspect: number;
    canvasToFont: number;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fontSpec = `400 ${RASTER_FONT_SIZE}px "Times New Roman", Times, serif`;

    const rasterize = () => {
      if (cancelled) return;
      const scratch = document.createElement("canvas");
      const scratchCtx = scratch.getContext("2d");
      if (!scratchCtx) return;

      scratchCtx.font = fontSpec;
      scratchCtx.textBaseline = "alphabetic";

      const text = "v i m a.";
      const padX = 10;
      const padTop = 12;
      const padBottom = 12;
      const ascender = RASTER_FONT_SIZE * 0.85;
      const descender = RASTER_FONT_SIZE * 0.22;
      const canvasH = Math.ceil(ascender + descender) + padTop + padBottom;
      const baseline = padTop + ascender;

      const nextGlyphs = Array.from(text).map((char) => {
        const metrics = scratchCtx.measureText(char);
        const canvasW = Math.max(24, Math.ceil(metrics.width) + padX * 2);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        canvas.width = canvasW;
        canvas.height = canvasH;
        ctx.font = fontSpec;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "black";
        ctx.fillText(char, padX, baseline);

        return {
          char,
          imageSrc: canvas.toDataURL("image/png"),
          aspect: canvasW / canvasH,
          canvasToFont: canvasH / RASTER_FONT_SIZE,
        };
      }).filter((glyph): glyph is NonNullable<typeof glyph> => glyph !== null);

      if (!cancelled) setGlyphs(nextGlyphs);
    };

    // Wait for the font to load before rasterizing — otherwise the canvas
    // 2D context can fall back before Times New Roman is available.
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts.load(fontSpec).then(rasterize).catch(rasterize);
    } else {
      rasterize();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Fallback while font/canvas prepare — render plain text so layout doesn't jump.
  if (!glyphs) {
    return <WordmarkText size={size} color="#e8d5c0" />;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {glyphs.map((glyph, index) => {
        if (glyph.char === " ") {
          return (
            <span
              key={`space-${index}`}
              style={{
                width: Math.round(size * 0.18),
                height: Math.round(size * glyph.canvasToFont),
                display: "inline-block",
                flexShrink: 0,
                marginLeft: index === 0 ? 0 : Math.round(size * -0.055),
              }}
            />
          );
        }

        const displayHeight = Math.round(size * glyph.canvasToFont);
        const displayWidth = Math.round(displayHeight * glyph.aspect);
        const canvasH = Math.min(520, Math.round(displayHeight * 2));
        const canvasW = Math.min(640, Math.round(canvasH * glyph.aspect));

        return (
          <span
            key={`${glyph.char}-${index}`}
            style={{
              width: displayWidth,
              height: displayHeight,
              display: "inline-block",
              flexShrink: 0,
              marginLeft: index === 0 ? 0 : Math.round(size * -0.055),
            }}
          >
            <MetallicPaint
              imageSrc={glyph.imageSrc}
              canvasWidth={canvasW}
              canvasHeight={canvasH}
              {...WORDMARK_METALLIC_PARAMS}
              seed={WORDMARK_METALLIC_PARAMS.seed + index * 11}
              timeOffset={index * 180}
            />
          </span>
        );
      })}
    </div>
  );
}

// ─── MetallicLogoFrame — React Bits Pro liquid-metal shader on the hex nut ─
// Generates the hex-nut donut as an inline SVG data URL (black fill on
// transparent bg, 30px padding inside a 200×200 viewBox so the depth solver
// has room to bevel the edges). Feeds it to <MetallicPaint /> with a
// sakura-plum metallic palette — NOT the default silver.
function MetallicLogoFrame({
  size,
  wordmark,
  className,
  ariaLabel,
}: {
  size: number;
  /** Accepted for prop-shape parity with other variants but unused — the
   *  metallic shader has its own palette in METALLIC_PARAMS. */
  color?: string;
  wordmark: boolean;
  className?: string;
  ariaLabel: string;
}) {
  // Build the hex nut SVG once, memoize the data URL.
  // Tight viewBox (160×160 with hex r=70 → 10px padding each side) so the
  // hex fills more of the bounding box. Less visual gap between mark + text.
  const imageSrc = useMemo(() => {
    const cx = 80, cy = 80, rOuter = 70, rInner = 32;
    const outerD = hexPathPointy(cx, cy, rOuter);
    const innerD = hexPathRotated(cx, cy, rInner, 30);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="${outerD} ${innerD}" fill="black" fill-rule="evenodd"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, []);

  const mark = (
    <div
      role="img"
      aria-label={ariaLabel}
      data-gsap-intro={wordmark ? "intro-logo-mark" : undefined}
      className={wordmark ? undefined : className}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <MetallicPaint
        imageSrc={imageSrc}
        canvasSize={Math.max(384, Math.round(size * 3))}
        timeOffset={-260}
        {...METALLIC_PARAMS}
      />
    </div>
  );

  if (!wordmark) return mark;

  // Metallic wordmark — text font-size is 1.1× the hex-nut size so the two
  // feel proportionally close (wordmark just barely larger than the mark).
  const wordSize = Math.round(size * 1.1);
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.round(size * 0.02)}px`,
      }}
    >
      {mark}
      <span
        data-gsap-intro="intro-logo-wordmark"
        style={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
          perspective: 900,
        }}
      >
        <MetallicWordmark size={wordSize} />
      </span>
    </div>
  );
}
