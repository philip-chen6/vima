"use client";

import React, { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { cn } from "@/lib/utils";
import * as THREE from "three";

export interface SquareMatrixProps {
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: string | number;
  /** Additional CSS classes */
  className?: string;
  /** Content rendered above the effect */
  children?: React.ReactNode;
  /** Number of grid rows/columns */
  gridSize?: number;
  /** Animation speed multiplier */
  speed?: number;
  /** Wave frequency multiplier */
  waveFrequency?: number;
  /** Wave amplitude (0–1) */
  waveAmplitude?: number;
  /** Corner rounding (0 = square, 0.5 = circle) */
  cornerRadius?: number;
  /** Edge softness for antialiasing */
  edgeSoftness?: number;
  /** Cell padding from 0 (touching) to 1 (invisible) */
  cellGap?: number;
  /** Brightness at peak of wave */
  peakBrightness?: number;
  /** Baseline brightness at rest */
  baseBrightness?: number;
  /** Amount the cell center shifts with the wave */
  centerDrift?: number;
  /** Animation preset: 0=radial, 1=diagonal, 2=horizontal, 3=vertical, 4=spiral, 5=checkerboard */
  preset?: number;
  /** Foreground color (hex) */
  color?: string;
  /** Background color (hex) */
  backgroundColor?: string;
  /** Master opacity (0–1) */
  opacity?: number;
  /** Enable cursor interaction to create a brightness ripple near pointer */
  cursorInteraction?: boolean;
  /** Cursor effect strength multiplier (0–3) */
  cursorIntensity?: number;
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uRes;
uniform float uGrid;
uniform float uSpeed;
uniform float uFreq;
uniform float uAmp;
uniform float uRadius;
uniform float uSoft;
uniform float uGap;
uniform float uPeak;
uniform float uBase;
uniform float uDrift;
uniform int uPreset;
uniform vec3 uColor;
uniform vec3 uBg;
uniform float uAlpha;
uniform vec2 uPointer;
uniform float uCursorActive;
uniform float uCursorIntensity;

float sdRounded(vec2 p, float r) {
  float circ = length(p);
  float box = max(abs(p.x), abs(p.y));
  return mix(box, circ, r);
}

float calcPhase(vec2 id, float t, vec2 origin) {
  if (uPreset == 0) {
    return length(id - origin) * uFreq - t * uSpeed;
  } else if (uPreset == 1) {
    vec2 d = id - origin;
    return (d.x + d.y) * uFreq * 0.7 - t * uSpeed;
  } else if (uPreset == 2) {
    return (id.x - origin.x) * uFreq - t * uSpeed;
  } else if (uPreset == 3) {
    return (id.y - origin.y) * uFreq - t * uSpeed;
  } else if (uPreset == 4) {
    vec2 d = id - origin;
    float angle = atan(d.y, d.x);
    float dist = length(d);
    return (angle * 2.0 + dist * 0.8) * uFreq - t * uSpeed;
  } else {
    float checker = mod(id.x + id.y, 2.0);
    return checker * 3.14159 + length(id - origin) * uFreq * 0.4 - t * uSpeed;
  }
}

void main() {
  float ar = uRes.x / uRes.y;
  vec2 coord = (vUv * 2.0 - 1.0) * vec2(ar, 1.0);

  vec2 scaled = coord * uGrid;
  vec2 cellId = floor(scaled);
  vec2 cellUv = fract(scaled) - 0.5;

  vec2 origin = vec2(0.0);
  float phase = calcPhase(cellId, uTime, origin);
  float wave = sin(phase);

  vec2 pointerGrid = (uPointer * 2.0 - 1.0) * vec2(ar, 1.0) * uGrid;
  float pointerDist = length(cellId - pointerGrid);
  float ripple = sin(pointerDist * 1.5 - uTime * 3.0) * smoothstep(8.0, 0.0, pointerDist) * uCursorActive * uCursorIntensity;

  cellUv += uDrift * wave;

  float dist = sdRounded(cellUv, uRadius);
  float sizeBoost = ripple * 0.1;
  float size = uGap + (1.0 - uGap) * (0.55 + 0.45 * wave + sizeBoost) * uAmp;
  dist -= size;
  float mask = smoothstep(uSoft, -uSoft, dist);

  float luma = uBase + (uPeak - uBase) * (0.7 + 0.3 * wave) + ripple * 0.15;
  vec3 fill = uColor * min(luma, 1.0) + max(luma - 1.0, 0.0);
  vec3 result = mix(uBg, fill, mask);

  gl_FragColor = vec4(result, uAlpha);
}
`;

function parseHexColor(hex: string): [number, number, number] {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1], 16) / 255,
    parseInt(match[2], 16) / 255,
    parseInt(match[3], 16) / 255,
  ];
}

interface MatrixSceneProps {
  speed: number;
  gridSize: number;
  waveFrequency: number;
  waveAmplitude: number;
  cornerRadius: number;
  edgeSoftness: number;
  cellGap: number;
  peakBrightness: number;
  baseBrightness: number;
  centerDrift: number;
  preset: number;
  colorRgb: [number, number, number];
  bgRgb: [number, number, number];
  opacity: number;
  pointer: [number, number];
  cursorInteraction: boolean;
  cursorIntensity: number;
}

const MatrixScene: React.FC<MatrixSceneProps> = ({
  speed,
  gridSize,
  waveFrequency,
  waveAmplitude,
  cornerRadius,
  edgeSoftness,
  cellGap,
  peakBrightness,
  baseBrightness,
  centerDrift,
  preset,
  colorRgb,
  bgRgb,
  opacity,
  pointer,
  cursorInteraction,
  cursorIntensity,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();
  const smoothPointer = useRef(new THREE.Vector2(0.5, 0.5));

  const shaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uGrid: { value: gridSize },
      uSpeed: { value: speed },
      uFreq: { value: waveFrequency },
      uAmp: { value: waveAmplitude },
      uRadius: { value: cornerRadius },
      uSoft: { value: edgeSoftness },
      uGap: { value: cellGap },
      uPeak: { value: peakBrightness },
      uBase: { value: baseBrightness },
      uDrift: { value: centerDrift },
      uPreset: { value: Math.floor(preset) },
      uColor: { value: new THREE.Vector3(...colorRgb) },
      uBg: { value: new THREE.Vector3(...bgRgb) },
      uAlpha: { value: opacity },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uCursorActive: { value: 0 },
      uCursorIntensity: { value: 1 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;

    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uRes.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
    mat.uniforms.uGrid.value = gridSize;
    mat.uniforms.uSpeed.value = speed;
    mat.uniforms.uFreq.value = waveFrequency;
    mat.uniforms.uAmp.value = waveAmplitude;
    mat.uniforms.uRadius.value = cornerRadius;
    mat.uniforms.uSoft.value = edgeSoftness;
    mat.uniforms.uGap.value = cellGap;
    mat.uniforms.uPeak.value = peakBrightness;
    mat.uniforms.uBase.value = baseBrightness;
    mat.uniforms.uDrift.value = centerDrift;
    mat.uniforms.uPreset.value = Math.floor(preset);
    mat.uniforms.uColor.value.set(...colorRgb);
    mat.uniforms.uBg.value.set(...bgRgb);
    mat.uniforms.uAlpha.value = opacity;
    mat.uniforms.uCursorActive.value = cursorInteraction ? 1 : 0;
    mat.uniforms.uCursorIntensity.value = cursorIntensity;

    const ease = 1 - Math.exp(-delta / 0.15);
    smoothPointer.current.x += (pointer[0] - smoothPointer.current.x) * ease;
    smoothPointer.current.y += (pointer[1] - smoothPointer.current.y) * ease;
    mat.uniforms.uPointer.value.set(
      smoothPointer.current.x,
      smoothPointer.current.y,
    );
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={shaderUniforms}
        transparent
      />
    </mesh>
  );
};

const SquareMatrix: React.FC<SquareMatrixProps> = ({
  width = "100%",
  height = "100%",
  className,
  children,
  gridSize = 10,
  speed = 1,
  waveFrequency = 1,
  waveAmplitude = 0.2,
  cornerRadius = 1,
  edgeSoftness = 0.6,
  cellGap = 0,
  peakBrightness = 2,
  baseBrightness = 0,
  centerDrift = 0,
  preset = 0,
  color = "#ff00ff",
  backgroundColor = "#000000",
  opacity = 1,
  cursorInteraction = false,
  cursorIntensity = 1,
}) => {
  const colorRgb = useMemo(() => parseHexColor(color), [color]);
  const bgRgb = useMemo(
    () => parseHexColor(backgroundColor),
    [backgroundColor],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<[number, number]>([0.5, 0.5]);
  const [webglAvailable, setWebglAvailable] = useState(false);

  useEffect(() => {
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");

    setWebglAvailable(Boolean(gl));
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!cursorInteraction) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1 - (e.clientY - rect.top) / rect.height;
      setPointer([nx, ny]);
    },
    [cursorInteraction],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height, backgroundColor }}
      onPointerMove={handlePointerMove}
    >
      {webglAvailable ? (
        <Canvas
          className="absolute inset-0 h-full w-full"
          orthographic
          camera={{
            position: [0, 0, 1],
            zoom: 1,
            left: -1,
            right: 1,
            top: 1,
            bottom: -1,
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <MatrixScene
            speed={speed}
            gridSize={gridSize}
            waveFrequency={waveFrequency}
            waveAmplitude={waveAmplitude}
            cornerRadius={cornerRadius}
            edgeSoftness={edgeSoftness}
            cellGap={cellGap}
            peakBrightness={peakBrightness}
            baseBrightness={baseBrightness}
            centerDrift={centerDrift}
            preset={preset}
            colorRgb={colorRgb}
            bgRgb={bgRgb}
            opacity={opacity}
            pointer={pointer}
            cursorInteraction={cursorInteraction}
            cursorIntensity={cursorIntensity}
          />
        </Canvas>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            opacity: Math.min(opacity * 1.8, 0.34),
            backgroundImage: `linear-gradient(90deg, ${color} 1px, transparent 1px), linear-gradient(0deg, ${color} 1px, transparent 1px)`,
            backgroundSize: `${Math.max(16, 280 / gridSize)}px ${Math.max(16, 280 / gridSize)}px`,
            maskImage:
              "radial-gradient(circle at 32% 26%, black, transparent 72%)",
          }}
        />
      )}
      {children && (
        <div className="pointer-events-none relative z-10">{children}</div>
      )}
    </div>
  );
};

SquareMatrix.displayName = "SquareMatrix";

export default SquareMatrix;
