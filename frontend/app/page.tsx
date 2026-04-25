"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Activity,
  Coins,
  HardHat,
  Map,
  ScanLine,
  ShieldCheck,
  Terminal,
} from "lucide-react";

type CursorPoint = {
  id: number;
  x: number;
  y: number;
  char: string;
};

const metricCards = [
  { label: "productive", value: "86.7%", sub: "26 / 30 sampled frames" },
  { label: "mean P-confidence", value: "0.939", sub: "Claude Sonnet judge" },
  { label: "COLMAP points", value: "1,770", sub: "registered site anchors" },
  { label: "reprojection", value: "1.199px", sub: "spatial fit error" },
];

const evidenceRows = [
  ["00.0s", "P", "laying concrete blocks", "Zone A", "0.95"],
  ["425.3s", "P", "scaffold work at elevation", "Zone B", "0.94"],
  ["808.1s", "NC", "idle / walking interval", "Zone B", "0.82"],
  ["1234.0s", "P", "material staging", "Zone C", "0.91"],
];

const systemSteps = [
  {
    icon: ScanLine,
    eyebrow: "01 / capture",
    title: "hardhat video becomes evidence",
    body: "Frames are sampled from real masonry footage and treated as a spatial record, not a flat slideshow.",
  },
  {
    icon: Map,
    eyebrow: "02 / anchor",
    title: "COLMAP zones bind claims to place",
    body: "Camera pose clustering assigns work to site regions: equipment, scaffold, material staging.",
  },
  {
    icon: Activity,
    eyebrow: "03 / classify",
    title: "CII wrench-time labels",
    body: "Every frame becomes P, C, or NC with confidence and reasoning for downstream audit.",
  },
  {
    icon: Coins,
    eyebrow: "04 / settle",
    title: "verified work turns into raffle weight",
    body: "Wrench time drives transparent Solana SPL payout logic with a replayable evidence chain.",
  },
];

function AsciiCursor() {
  const [trail, setTrail] = useState<CursorPoint[]>([]);
  const counter = useRef(0);
  const chars = useMemo(() => ["+", "/", ".", ":", "*", "x"], []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      counter.current += 1;
      const point = {
        id: counter.current,
        x: event.clientX,
        y: event.clientY,
        char: chars[counter.current % chars.length],
      };
      setTrail((current) => [point, ...current].slice(0, 12));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [chars]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
      {trail.map((point, index) => (
        <span
          key={point.id}
          className="absolute mono text-[11px] text-[#d69256]"
          style={{
            left: point.x + 10,
            top: point.y + 8,
            opacity: Math.max(0, 1 - index / trail.length),
            transform: `translate3d(0, ${index * 2}px, 0) scale(${1 - index * 0.035})`,
          }}
        >
          {point.char}
        </span>
      ))}
    </div>
  );
}

function AmberParticleField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const particleCount = 5600;

  const positions = useMemo(() => {
    const data = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = Math.sqrt(Math.random()) * 7.4;
      const angle = Math.random() * Math.PI * 2;
      data[index * 3] = Math.cos(angle) * radius * 1.45;
      data[index * 3 + 1] = Math.sin(angle) * radius * 0.46 - 0.75;
      data[index * 3 + 2] = (Math.random() - 0.5) * 2.2;
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color("#c77b42") },
          uColorB: { value: new THREE.Color("#f1c27d") },
        }}
        vertexShader={`
          uniform float uTime;
          varying float vAlpha;
          varying float vWarmth;
          void main() {
            vec3 p = position;
            float wave = sin(p.x * 0.65 + uTime * 0.28) + cos(p.y * 1.8 - uTime * 0.22);
            p.y += wave * 0.16;
            p.x += sin(p.y * 1.1 + uTime * 0.16) * 0.24;
            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
            float depth = clamp(1.0 - abs(p.z) * 0.35, 0.28, 1.0);
            gl_PointSize = (2.2 + depth * 3.2) * (1.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            vAlpha = depth * 0.72;
            vWarmth = smoothstep(-4.5, 5.5, p.x + wave);
          }
        `}
        fragmentShader={`
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying float vAlpha;
          varying float vWarmth;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float glow = smoothstep(0.5, 0.0, d);
            vec3 color = mix(uColorA, uColorB, vWarmth);
            gl_FragColor = vec4(color, glow * vAlpha);
          }
        `}
      />
    </points>
  );
}

function ShaderBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#080604]">
      <Canvas
        camera={{ position: [0, 0, 7.8], fov: 58 }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true }}
      >
        <AmberParticleField />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(199,123,66,0.20),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(98,142,127,0.16),transparent_24%),linear-gradient(180deg,rgba(8,6,4,0.16),#080604_92%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(241,194,125,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(241,194,125,.6)_1px,transparent_1px)] [background-size:64px_64px]" />
    </div>
  );
}

function ContourPanel({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative min-h-[260px] overflow-hidden rounded-[22px] border border-[#6f4a2f]/40 bg-[#0e0a07]">
      <div className="absolute inset-0 opacity-65 [background-image:repeating-radial-gradient(ellipse_at_42%_46%,transparent_0_14px,rgba(198,126,73,.52)_15px_16px,transparent_17px_30px)] transition duration-500 group-hover:scale-105 group-hover:opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0e0a07]/45 to-[#0e0a07]" />
      <div className="relative flex h-full flex-col justify-end p-7">
        <span className="mono mb-3 text-xs uppercase tracking-[0.32em] text-[#c77b42]">
          {number}
        </span>
        <h3 className="text-2xl font-semibold text-[#f4eadb]">{title}</h3>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#a99a86]">{body}</p>
      </div>
    </div>
  );
}

export default function VinnaPage() {
  return (
    <main className="min-h-screen bg-[#080604] text-[#f4eadb]">
      <AsciiCursor />
      <section className="relative min-h-screen overflow-hidden px-5 py-6 sm:px-8 lg:px-12">
        <ShaderBackdrop />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-[#6f4a2f]/35 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c77b42]/45 bg-[#1a120c]/80">
              <HardHat className="h-4 w-4 text-[#f1c27d]" />
            </div>
            <span className="mono text-sm tracking-[0.32em] text-[#f1c27d]">
              VINNA
            </span>
          </div>
          <div className="hidden items-center gap-8 mono text-xs uppercase tracking-[0.22em] text-[#8f806d] md:flex">
            <a href="#system" className="transition hover:text-[#f1c27d]">
              System
            </a>
            <a href="#evidence" className="transition hover:text-[#f1c27d]">
              Evidence
            </a>
            <a href="#settlement" className="transition hover:text-[#f1c27d]">
              Settlement
            </a>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 pt-20 lg:grid-cols-[1fr_430px] lg:items-end lg:pt-28">
          <div>
            <p className="mono mb-6 max-w-xl text-xs uppercase tracking-[0.34em] text-[#c77b42]">
              spatial proof of work / hardhat video / CII index
            </p>
            <h1 className="max-w-5xl text-6xl font-light leading-[0.88] tracking-[-0.08em] text-[#f8efe0] sm:text-8xl lg:text-[9.5rem]">
              site intelligence that can pay out.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#b9aa94]">
              VINNA turns bodycam footage into a verifiable construction ledger:
              where work happened, whether it was productive, and how that
              evidence maps to worker rewards.
            </p>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="border border-[#6f4a2f]/45 bg-[#100b07]/70 px-4 py-4 backdrop-blur"
                >
                  <div className="text-3xl font-semibold text-[#f1c27d]">
                    {metric.value}
                  </div>
                  <div className="mono mt-3 text-[10px] uppercase tracking-[0.18em] text-[#c77b42]">
                    {metric.label}
                  </div>
                  <div className="mt-2 text-xs text-[#8f806d]">{metric.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative border border-[#6f4a2f]/45 bg-[#0b0806]/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#6f4a2f]/30 pb-3">
              <span className="mono text-xs uppercase tracking-[0.24em] text-[#c77b42]">
                live index
              </span>
              <span className="flex items-center gap-2 mono text-xs text-[#76c7ae]">
                <span className="h-2 w-2 rounded-full bg-[#76c7ae]" />
                operational
              </span>
            </div>
            <div className="space-y-3">
              {evidenceRows.map((row) => (
                <div
                  key={row[0]}
                  className="grid grid-cols-[58px_42px_1fr_74px_48px] items-center gap-2 border border-[#2a1d14] bg-[#110c08] px-3 py-3 mono text-[11px] text-[#b9aa94]"
                >
                  <span className="text-[#8f806d]">{row[0]}</span>
                  <span
                    className={
                      row[1] === "NC" ? "text-[#d9694f]" : "text-[#76c7ae]"
                    }
                  >
                    {row[1]}
                  </span>
                  <span className="truncate text-[#f4eadb]">{row[2]}</span>
                  <span className="text-[#c77b42]">{row[3]}</span>
                  <span>{row[4]}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 border border-[#6f4a2f]/30 bg-[#0c0907] p-4">
              <div className="mono text-[11px] uppercase tracking-[0.2em] text-[#8f806d]">
                current verdict
              </div>
              <div className="mt-3 text-2xl font-semibold text-[#f4eadb]">
                11 raffle tickets unlocked
              </div>
              <p className="mt-2 text-sm leading-6 text-[#a99a86]">
                Wrench time exceeds the 30% baseline. Evidence chain is ready
                for Solana devnet settlement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="system"
        className="border-y border-[#2a1d14] bg-[#0b0806] px-5 py-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mono text-xs uppercase tracking-[0.32em] text-[#c77b42]">
                system map
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-light tracking-[-0.04em] text-[#f4eadb] md:text-6xl">
                not a dashboard. a jobsite blackbox.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#9c8d78]">
              The interface keeps the fiction simple: every frame enters the
              ledger, gets spatially anchored, classified, and settled.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {systemSteps.map((step) => (
              <div
                key={step.title}
                className="border border-[#6f4a2f]/35 bg-[#100b07] p-5"
              >
                <step.icon className="h-5 w-5 text-[#f1c27d]" />
                <p className="mono mt-10 text-[11px] uppercase tracking-[0.24em] text-[#c77b42]">
                  {step.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-[#f4eadb]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#9c8d78]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="evidence"
        className="bg-[#080604] px-5 py-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          <ContourPanel
            number="01 / risk terrain"
            title="zone-aware productivity"
            body="Frame classifications are grouped by site zone so output has a place, not just a timestamp."
          />
          <ContourPanel
            number="02 / signal decay"
            title="gaming resistance"
            body="Temporal consistency makes reward hacking less useful as noisy claims fail to compound."
          />
          <ContourPanel
            number="03 / settlement"
            title="payable evidence"
            body="Every raffle ticket can point back to the exact frames and spatial claims that created it."
          />
        </div>
      </section>

      <section
        id="settlement"
        className="px-5 pb-24 sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border border-[#6f4a2f]/35 bg-[#0f0a07] p-7">
            <ShieldCheck className="h-6 w-6 text-[#76c7ae]" />
            <p className="mono mt-8 text-xs uppercase tracking-[0.28em] text-[#c77b42]">
              submission claim
            </p>
            <h2 className="mt-3 text-4xl font-light tracking-[-0.04em]">
              spatial work should be auditable.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#a99a86]">
              VINNA is intentionally dramatic, but the proof path is concrete:
              CII classification, COLMAP anchoring, risk zones, and on-chain
              reward logic wired into one evidence chain.
            </p>
          </div>

          <div className="border border-[#6f4a2f]/35 bg-[#0f0a07] p-7">
            <div className="mb-5 flex items-center gap-3">
              <Terminal className="h-5 w-5 text-[#f1c27d]" />
              <span className="mono text-xs uppercase tracking-[0.26em] text-[#c77b42]">
                raffle.py
              </span>
            </div>
            <pre className="overflow-hidden whitespace-pre-wrap mono text-sm leading-7 text-[#d8c6aa]">
{`=== IRONSITE PRODUCTIVITY RAFFLE ===
W002: 90.0% productive (900 tickets)
W003: 90.0% productive (900 tickets)
W001: 80.0% productive (800 tickets)

WINNER: W003
PAYOUT: $100 USDC
MODE: devnet / mock fallback`}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
