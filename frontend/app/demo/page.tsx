"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import TextScatter from "@/components/react-bits/text-scatter";
import { LiveFrameAnalyzer } from "@/components/landing/live-frame-analyzer";

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

const failureExamples = [
  {
    label: "raw VLM",
    title: "sees a worker laying block",
    body: "Correct description, wrong accounting. The model does not know whether the camera wearer performed the work.",
  },
  {
    label: "vima",
    title: "binds work to place and evidence",
    body: "Frames are labeled, spatially clustered, and stored as an auditable ledger before payout logic touches them.",
  },
];

const proofCards = [
  {
    number: "01 / failure",
    title: "presence is not productivity",
    body: "A hardhat camera can pass by active work without the wearer doing that work. The system has to separate visual activity from credit.",
  },
  {
    number: "02 / fix",
    title: "frames become claims",
    body: "Each sampled frame gets a wrench-time label, confidence, timestamp, and zone assignment instead of a loose caption.",
  },
  {
    number: "03 / evidence",
    title: "claims stay replayable",
    body: "Every metric can point back to the frame ledger, so judges can inspect the exact footage behind the payout.",
  },
];

function gearPath(teeth: number, rootRadius: number, outerRadius: number) {
  const points: string[] = [];
  const steps = teeth * 4;

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2 - Math.PI / 2;
    const phase = index % 4;
    const radius = phase === 1 || phase === 2 ? outerRadius : rootRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `${points.join(" ")} Z`;
}

function Gear({
  id,
  size,
  teeth,
  duration,
  reverse = false,
  className,
}: {
  id: string;
  size: number;
  teeth: number;
  duration: number;
  reverse?: boolean;
  className: string;
}) {
  const path = gearPath(teeth, 42, 54);
  const spokeCount = Math.max(4, Math.round(teeth / 5));

  return (
    <div
      className={`absolute ${reverse ? "[animation-direction:reverse]" : ""} animate-spin ${className}`}
      style={{ width: size, height: size, animationDuration: `${duration}s` }}
    >
      <svg
        viewBox="-64 -64 128 128"
        className="h-full w-full drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${id}-face`} cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#d8d5cc" stopOpacity="0.84" />
            <stop offset="100%" stopColor="#777066" stopOpacity="0.72" />
          </radialGradient>
          <radialGradient id={`${id}-shade`} cx="44%" cy="42%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="64%" stopColor="#000000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
          </radialGradient>
        </defs>
        <path d={path} fill={`url(#${id}-face)`} stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.4" />
        <circle r="35" fill="#17130f" fillOpacity="0.54" />
        <circle r="33" fill={`url(#${id}-face)`} opacity="0.42" />
        {Array.from({ length: spokeCount }).map((_, index) => {
          const angle = (index / spokeCount) * Math.PI * 2;
          const x = Math.cos(angle) * 26;
          const y = Math.sin(angle) * 26;
          return (
            <line
              key={index}
              x1="0"
              y1="0"
              x2={x}
              y2={y}
              stroke="#ffffff"
              strokeOpacity="0.55"
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
        <circle r="14" fill="#100d0a" fillOpacity="0.72" />
        <circle r="7" fill="#f8f6ef" fillOpacity="0.88" />
        <circle r="3" fill="#080604" />
        <circle r="48" fill={`url(#${id}-shade)`} />
      </svg>
    </div>
  );
}

function ClockworkLoader() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setLeaving(true), 1050);
    const removeTimer = window.setTimeout(() => setVisible(false), 1450);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-[#080604] transition duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative h-56 w-56">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.10),transparent_58%)]" />
        <Gear id="gear-main" size={112} teeth={24} duration={7.2} className="left-[72px] top-[70px]" />
        <Gear id="gear-upper" size={76} teeth={18} duration={4.7} reverse className="left-[133px] top-[33px]" />
        <Gear id="gear-left" size={66} teeth={16} duration={4.9} reverse className="left-[32px] top-[62px]" />
        <Gear id="gear-lower" size={78} teeth={18} duration={5.3} reverse className="left-[43px] top-[133px]" />
      </div>
    </div>
  );
}

function SurveyCursor() {
  const [position, setPosition] = useState({ x: -120, y: -120 });

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-50 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 mix-blend-screen md:block"
      style={{ left: position.x, top: position.y }}
    >
      <div className="absolute left-1/2 top-0 h-full w-px bg-[#d69256]/35" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-[#d69256]/35" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f1c27d]/70" />
    </div>
  );
}

function TopographicField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        transparent={false}
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uAmber: { value: new THREE.Color("#b9a07f") },
          uGold: { value: new THREE.Color("#efe3cf") },
          uCoral: { value: new THREE.Color("#8f7b68") },
          uBg: { value: new THREE.Color("#080604") },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uAmber;
          uniform vec3 uGold;
          uniform vec3 uCoral;
          uniform vec3 uBg;
          varying vec2 vUv;

          vec2 hash(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
          }

          float noise(vec2 p) {
            const float K1 = 0.366025404;
            const float K2 = 0.211324865;
            vec2 i = floor(p + (p.x + p.y) * K1);
            vec2 a = p - i + (i.x + i.y) * K2;
            vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec2 b = a - o + K2;
            vec2 c = a - 1.0 + 2.0 * K2;
            vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
            vec3 n = h * h * h * h * vec3(
              dot(a, hash(i)),
              dot(b, hash(i + o)),
              dot(c, hash(i + 1.0))
            );
            return dot(n, vec3(70.0));
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.52;
            mat2 r = mat2(0.82, -0.58, 0.58, 0.82);
            for (int i = 0; i < 5; i++) {
              v += a * noise(p);
              p = r * p * 2.03 + 7.1;
              a *= 0.48;
            }
            return v;
          }

          void main() {
            vec2 uv = vUv;
            vec2 p = uv * vec2(2.25, 1.22);
            p.x += 0.17 * sin(p.y * 3.2 + uTime * 0.08);
            p.y += 0.08 * cos(p.x * 4.0 - uTime * 0.06);

            float elevation = fbm(p * 2.9 + vec2(uTime * 0.026, -uTime * 0.018));
            elevation = elevation * 0.5 + 0.5;

            float minor = abs(fract(elevation * 18.0) - 0.5);
            float major = abs(fract(elevation * 6.0) - 0.5);
            float minorLine = 1.0 - smoothstep(0.022, 0.064, minor);
            float majorLine = 1.0 - smoothstep(0.028, 0.092, major);

            vec3 contourColor = mix(uCoral, uGold, smoothstep(0.18, 0.88, elevation));
            float glow = minorLine * 0.46 + majorLine * 1.08;
            vec3 color = uBg + contourColor * glow * 1.12;

            float vignette = smoothstep(0.92, 0.2, distance(uv, vec2(0.5)));
            float lowGrid = (sin((uv.x + uv.y) * 680.0) * 0.5 + 0.5) * 0.015;
            color += uAmber * lowGrid;
            color = mix(uBg * 0.42, color, vignette);

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function TopographicBackdrop() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#080604]">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 3], zoom: 1 }}
        className="opacity-95"
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: false }}
      >
        <TopographicField />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_24%,rgba(98,142,127,0.10),transparent_24%),radial-gradient(circle_at_48%_72%,rgba(199,123,66,0.10),transparent_32%),linear-gradient(180deg,rgba(8,6,4,0.08),rgba(8,6,4,0.72)_94%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(241,194,125,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(241,194,125,.7)_1px,transparent_1px)] [background-size:78px_78px]" />
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

export default function VimaPage() {
  return (
    <main className="min-h-screen bg-[#080604] text-[#f4eadb]">
      <ClockworkLoader />
      <SurveyCursor />
      <section className="relative min-h-screen overflow-hidden px-5 py-6 sm:px-8 lg:px-12">
        <TopographicBackdrop />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-[#6f4a2f]/35 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c77b42]/45 bg-[#1a120c]/80">
              <HardHat className="h-4 w-4 text-[#f1c27d]" />
            </div>
            <TextScatter
              as="span"
              text="vima"
              velocity={34}
              rotation={10}
              duration={0.45}
              returnAfter={0.18}
              className="mono text-sm tracking-[0.32em] text-[#f1c27d]"
            />
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

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl items-center">
          <div className="max-w-5xl">
            <h1 className="text-6xl font-light leading-[0.88] tracking-normal text-[#f8efe0] sm:text-8xl lg:text-[9.5rem]">
              map the work before you pay it.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#cdbda4]">
              Hardhat footage becomes a spatial ledger for proof of work.
            </p>
          </div>
        </div>
      </section>

      <LiveFrameAnalyzer />

      <section
        id="system"
        className="border-y border-[#2a1d14] bg-[#0b0806] px-5 py-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mono text-xs uppercase tracking-[0.32em] text-[#c77b42]">
                problem
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-light tracking-normal text-[#f4eadb] md:text-6xl">
                cameras see activity. payouts need proof.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#9c8d78]">
              The hard part is not making another video dashboard. It is
              turning messy egocentric footage into claims that survive audit.
            </p>
          </div>

          <div className="mb-16 grid gap-4 lg:grid-cols-2">
            {failureExamples.map((example) => (
              <div
                key={example.label}
                className="border border-[#6f4a2f]/35 bg-[#100b07] p-7"
              >
                <p className="mono text-xs uppercase tracking-[0.28em] text-[#c77b42]">
                  {example.label}
                </p>
                <h3 className="mt-8 text-3xl font-light tracking-normal text-[#f4eadb]">
                  {example.title}
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#a99a86]">
                  {example.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-16 grid gap-5 lg:grid-cols-[1fr_430px]">
            <div className="grid self-start grid-cols-2 gap-3 sm:grid-cols-4">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="min-h-[142px] border border-[#6f4a2f]/45 bg-[#100b07]/70 px-4 py-4 backdrop-blur"
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

            <div className="relative border border-[#6f4a2f]/45 bg-[#0b0806]/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between border-b border-[#6f4a2f]/30 pb-3">
                <span className="mono text-xs uppercase tracking-[0.24em] text-[#c77b42]">
                  frame ledger
                </span>
                <span className="flex items-center gap-2 mono text-xs text-[#76c7ae]">
                  <span className="h-2 w-2 rounded-full bg-[#76c7ae]" />
                  verified
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
          {proofCards.map((card) => (
            <ContourPanel
              key={card.number}
              number={card.number}
              title={card.title}
              body={card.body}
            />
          ))}
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
              demo claim
            </p>
            <h2 className="mt-3 text-4xl font-light tracking-normal">
              show the clip, then show the ledger.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#a99a86]">
              The judging story should be concrete: raw footage goes in, a
              spatial evidence table comes out, and the payout can be traced
              back to frame-level claims.
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
