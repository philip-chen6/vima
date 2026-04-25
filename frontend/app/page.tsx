"use client";

import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  Camera,
  Cpu,
  Coins,
  HardHat,
  ShieldCheck,
  BarChart3,
  MapPin,
  Layers,
} from "lucide-react";

import SilkWaves from "@/components/react-bits/silk-waves";
import TextScatter from "@/components/react-bits/text-scatter";
import SmoothCursor from "@/components/react-bits/smooth-cursor";
import { BlurHighlight } from "@/components/react-bits/blur-highlight";
import SquareMatrix from "@/components/react-bits/square-matrix";
import RotatingCards from "@/components/react-bits/rotating-cards";
import GradientCarousel from "@/components/react-bits/gradient-carousel";
import { Features4 } from "@/components/blocks/features-4";

// ─── CII Stats section ────────────────────────────────────────────────────────

function CIIStatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  const stats = [
    {
      value: "9.1%",
      label: "Productive (P)",
      desc: "Workers actively contributing to deliverable work",
      color: "#4ade80",
      delay: 0,
    },
    {
      value: "54.5%",
      label: "Contributory (C)",
      desc: "Necessary support activities per CII standard",
      color: "#FFD700",
      delay: 0.1,
    },
    {
      value: "36.4%",
      label: "Non-Contributory (NC)",
      desc: "Idle, waiting, or rework — target for elimination",
      color: "#FF6B35",
      delay: 0.2,
    },
  ];

  return (
    <section
      ref={ref}
      className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a] construction-grid"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block mono text-xs tracking-widest text-[#FFD700] mb-4 uppercase">
            CII Activity Classification
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
            22 sampled frames. Real numbers.
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Every payout is anchored to verified productive time — not
            self-reported hours. The ledger never lies.
          </p>
        </motion.div>

        {/* Stacked bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={inView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex rounded-full overflow-hidden h-4 mb-12 origin-left"
        >
          <div style={{ width: "9.1%", background: "#4ade80" }} />
          <div style={{ width: "54.5%", background: "#FFD700" }} />
          <div style={{ flex: 1, background: "#FF6B35" }} />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: s.delay + 0.3 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col gap-3"
            >
              <span
                className="text-5xl font-semibold tracking-tight"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <span className="text-white font-medium">{s.label}</span>
              <span className="text-neutral-400 text-sm leading-relaxed">
                {s.desc}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { val: "1,770", label: "COLMAP 3D points" },
            { val: "1.199px", label: "Reprojection error" },
            { val: "30", label: "OSHA rules mapped" },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
              className="rounded-xl border border-white/8 bg-white/3 px-6 py-5 flex flex-col gap-1"
            >
              <span className="mono text-2xl font-bold text-[#FFD700]">
                {m.val}
              </span>
              <span className="text-neutral-500 text-sm">{m.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── RotatingCards data ───────────────────────────────────────────────────────

const HOW_IT_WORKS_CARDS = [
  {
    id: "video",
    background: "linear-gradient(135deg, #1a1a1a 0%, #2a1a00 100%)",
    content: (
      <div className="flex flex-col items-center gap-4 text-center px-2">
        <div className="w-12 h-12 rounded-xl bg-[#FFD700]/15 flex items-center justify-center">
          <Camera className="w-6 h-6 text-[#FFD700]" />
        </div>
        <span className="text-[#FFD700] mono text-xs tracking-widest uppercase">
          Step 01
        </span>
        <h3 className="text-white font-semibold text-sm leading-snug">
          Video Ingestion
        </h3>
        <p className="text-neutral-400 text-xs leading-relaxed">
          Site cameras stream frames. COLMAP reconstructs 3D camera poses.
          Every frame gets a verified spatial anchor.
        </p>
      </div>
    ),
  },
  {
    id: "classify",
    background: "linear-gradient(135deg, #1a1a1a 0%, #001a1a 100%)",
    content: (
      <div className="flex flex-col items-center gap-4 text-center px-2">
        <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Cpu className="w-6 h-6 text-blue-400" />
        </div>
        <span className="text-blue-400 mono text-xs tracking-widest uppercase">
          Step 02
        </span>
        <h3 className="text-white font-semibold text-sm leading-snug">
          CII Classification
        </h3>
        <p className="text-neutral-400 text-xs leading-relaxed">
          Claude Sonnet vision judges each frame: P / C / NC per Construction
          Industry Institute standard. No human subjectivity.
        </p>
      </div>
    ),
  },
  {
    id: "payout",
    background: "linear-gradient(135deg, #1a1a1a 0%, #0a1a00 100%)",
    content: (
      <div className="flex flex-col items-center gap-4 text-center px-2">
        <div className="w-12 h-12 rounded-xl bg-[#4ade80]/15 flex items-center justify-center">
          <Coins className="w-6 h-6 text-[#4ade80]" />
        </div>
        <span className="text-[#4ade80] mono text-xs tracking-widest uppercase">
          Step 03
        </span>
        <h3 className="text-white font-semibold text-sm leading-snug">
          Solana Payout
        </h3>
        <p className="text-neutral-400 text-xs leading-relaxed">
          Productive time unlocks SPL token rewards. Immutable on-chain ledger.
          Workers earn based on verified output, not clocked hours.
        </p>
      </div>
    ),
  },
  {
    id: "osha",
    background: "linear-gradient(135deg, #1a1a1a 0%, #1a0000 100%)",
    content: (
      <div className="flex flex-col items-center gap-4 text-center px-2">
        <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-red-400" />
        </div>
        <span className="text-red-400 mono text-xs tracking-widest uppercase">
          Step 04
        </span>
        <h3 className="text-white font-semibold text-sm leading-snug">
          OSHA Compliance
        </h3>
        <p className="text-neutral-400 text-xs leading-relaxed">
          30 OSHA rules cross-referenced against every classified frame.
          Violations flagged before they become incidents.
        </p>
      </div>
    ),
  },
  {
    id: "ledger",
    background: "linear-gradient(135deg, #1a1a1a 0%, #100020 100%)",
    content: (
      <div className="flex flex-col items-center gap-4 text-center px-2">
        <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <Layers className="w-6 h-6 text-purple-400" />
        </div>
        <span className="text-purple-400 mono text-xs tracking-widest uppercase">
          Step 05
        </span>
        <h3 className="text-white font-semibold text-sm leading-snug">
          Tamper-Proof Ledger
        </h3>
        <p className="text-neutral-400 text-xs leading-relaxed">
          Camera pose + VLM annotation + CII label = cryptographic proof of
          work. Disputes resolved by on-chain evidence, not management.
        </p>
      </div>
    ),
  },
];

// ─── Evidence Architecture section ───────────────────────────────────────────

function EvidenceSection() {
  return (
    <section className="w-full py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block mono text-xs tracking-widest text-[#FF6B35] mb-4 uppercase">
            Evidence Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-8">
            Every payout backed by a chain of evidence
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-xl sm:text-2xl text-neutral-300 leading-relaxed font-light"
        >
          <BlurHighlight
            highlightedBits={[
              "tamper-proof",
              "camera pose",
              "COLMAP reconstruction",
            ]}
            highlightColor="rgba(255, 215, 0, 0.22)"
            highlightClassName="text-[#FFD700]"
            blurAmount={6}
            blurDuration={0.8}
            highlightDelay={0.5}
            highlightDuration={1.2}
            viewportOptions={{ once: true, amount: 0.5 }}
          >
            VINNA builds a tamper-proof audit trail from every job site. camera
            pose data from COLMAP reconstruction is fused with Claude vision
            judgments and CII classification — anchoring each payout to a
            verifiable, immutable record.
          </BlurHighlight>
        </motion.div>

        {/* Evidence chain diagram */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
          {[
            {
              icon: Camera,
              label: "Camera Pose",
              sub: "COLMAP 3D",
              color: "#FFD700",
            },
            {
              icon: Cpu,
              label: "VLM Judge",
              sub: "Claude Sonnet",
              color: "#60a5fa",
            },
            {
              icon: BarChart3,
              label: "CII Label",
              sub: "P / C / NC",
              color: "#4ade80",
            },
            {
              icon: MapPin,
              label: "On-Chain",
              sub: "Solana SPL",
              color: "#a78bfa",
            },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-white/10 bg-white/5 min-w-[120px]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${item.color}20` }}
                >
                  <item.icon
                    className="w-5 h-5"
                    style={{ color: item.color }}
                  />
                </div>
                <span className="text-white text-sm font-medium">
                  {item.label}
                </span>
                <span className="mono text-xs text-neutral-500">
                  {item.sub}
                </span>
              </motion.div>
              {i < 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.12 + 0.2 }}
                  className="hidden sm:block text-neutral-600 text-xl px-3"
                >
                  →
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VinnaPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Global smooth cursor trail */}
      <SmoothCursor
        color="#FFD700"
        lineWidth={0.5}
        pointsCount={35}
        springStrength={0.5}
        dampening={0.6}
        trailOpacity={0.7}
        velocityScale
      />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* SilkWaves — construction amber palette */}
        <div className="absolute inset-0 z-0">
          <SilkWaves
            speed={0.6}
            scale={2.5}
            distortion={1.4}
            curve={0.8}
            contrast={1.1}
            colors={[
              "#0a0a0a",
              "#1a1000",
              "#2a1a00",
              "#3d2a00",
              "#5c3d00",
              "#7a5200",
              "#996600",
              "#b37a00",
            ]}
            brightness={0.85}
            opacity={0.7}
            frequency={1.4}
            complexity={1.1}
          />
        </div>

        {/* Hazard stripe top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 hazard-stripe z-10 opacity-70" />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-8 max-w-5xl mx-auto">
          {/* Prize badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 py-1.5"
          >
            <HardHat className="w-4 h-4 text-[#FFD700]" />
            <span className="mono text-xs text-[#FFD700] tracking-wide">
              HackTech Caltech · Ironsite Prize Track
            </span>
          </motion.div>

          {/* Title — TextScatter interactive chars */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-2"
          >
            <TextScatter
              text="VINNA"
              as="h1"
              className="text-7xl sm:text-9xl font-bold tracking-tighter text-white"
              velocity={180}
              rotation={60}
              duration={1.8}
              returnAfter={0.8}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mono text-xs sm:text-sm text-[#FFD700]/70 tracking-widest mb-8 uppercase"
          >
            Verifiable Rewards for Construction Safety Intelligence
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="text-lg sm:text-xl text-neutral-300 max-w-2xl leading-relaxed mb-10"
          >
            AI classifies every construction frame as Productive, Contributory,
            or Non-Contributory — then workers earn Solana payouts anchored to
            verified output.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button className="rounded-full px-8 py-3 bg-[#FFD700] text-black font-semibold text-sm hover:bg-[#ffc800] transition-colors">
              See the Demo
            </button>
            <button className="rounded-full px-8 py-3 border border-white/20 text-white text-sm hover:bg-white/8 transition-colors">
              View Architecture
            </button>
          </motion.div>

          {/* Tech tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-3"
          >
            {[
              "Claude Sonnet Vision",
              "CII Standard",
              "Solana SPL",
              "COLMAP 3D",
              "OSHA 30-Rule Engine",
            ].map((tag) => (
              <span
                key={tag}
                className="mono text-xs px-3 py-1.5 rounded-full border border-white/15 text-neutral-400"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <span className="mono text-xs text-neutral-600 tracking-widest">
            SCROLL
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-[#FFD700]/60 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS — RotatingCards ──────────────────────────────────── */}
      <section className="w-full py-24 px-4 sm:px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="inline-block mono text-xs tracking-widest text-[#FF6B35] mb-4 uppercase">
              The Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
              From site camera to paycheck
            </h2>
            <p className="text-neutral-400 max-w-lg mx-auto leading-relaxed text-sm">
              Five stages. Zero ambiguity. Hover to pause, drag to explore.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <RotatingCards
              cards={HOW_IT_WORKS_CARDS}
              radius={260}
              duration={28}
              cardWidth={180}
              cardHeight={220}
              pauseOnHover
              draggable
              mouseWheel
            />
          </motion.div>
        </div>
      </section>

      {/* ── CII STATS ─────────────────────────────────────────────────────── */}
      <CIIStatsSection />

      {/* ── SQUARE MATRIX DIVIDER ─────────────────────────────────────────── */}
      <div className="w-full h-32 sm:h-40">
        <SquareMatrix
          width="100%"
          height="100%"
          gridSize={22}
          speed={1.2}
          waveFrequency={1.4}
          waveAmplitude={0.7}
          preset={1}
          color="#FFD700"
          backgroundColor="#0a0a0a"
          cornerRadius={0.4}
          cellGap={0.15}
          peakBrightness={1.6}
          baseBrightness={0.05}
          cursorInteraction
          cursorIntensity={2}
          opacity={1}
        />
      </div>

      {/* ── DEMO PREVIEW — GradientCarousel ───────────────────────────────── */}
      <section className="w-full py-20 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="inline-block mono text-xs tracking-widest text-[#4ade80] mb-4 uppercase">
              Live Demo
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
              Frames the classifier sees
            </h2>
            <p className="text-neutral-400 max-w-lg mx-auto leading-relaxed text-sm">
              Each image is classified in real time. Drag or scroll to explore.
            </p>
          </motion.div>
        </div>

        <div className="w-full h-[480px] sm:h-[560px]">
          <GradientCarousel
            images={[
              "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=1000&fit=crop&q=80",
              "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&h=1000&fit=crop&q=80",
              "https://images.unsplash.com/photo-1590725140246-20acddc1ec6b?w=800&h=1000&fit=crop&q=80",
              "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=1000&fit=crop&q=80",
              "https://images.unsplash.com/photo-1573166364902-872f1bc6c64a?w=800&h=1000&fit=crop&q=80",
              "https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?w=800&h=1000&fit=crop&q=80",
            ]}
            cardAspectRatio={0.8}
            gradientIntensity={0.5}
            gradientSize={0.7}
            backgroundBlur={28}
          />
        </div>
      </section>

      {/* ── FEATURES4 — Why VINNA wins ────────────────────────────────────── */}
      <div className="bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pt-16 text-center"
          >
            <span className="inline-block mono text-xs tracking-widest text-[#FFD700] mb-4 uppercase">
              Why VINNA wins
            </span>
          </motion.div>
        </div>
        <Features4 autoPlay autoPlayDelay={4500} />
      </div>

      {/* ── EVIDENCE ARCHITECTURE + BlurHighlight ─────────────────────────── */}
      <EvidenceSection />

      {/* ── SQUARE MATRIX DIVIDER 2 ───────────────────────────────────────── */}
      <div className="w-full h-24 sm:h-32">
        <SquareMatrix
          width="100%"
          height="100%"
          gridSize={18}
          speed={0.8}
          waveFrequency={0.9}
          waveAmplitude={0.5}
          preset={4}
          color="#FF6B35"
          backgroundColor="#0a0a0a"
          cornerRadius={0.9}
          cellGap={0.2}
          peakBrightness={1.4}
          baseBrightness={0.03}
          cursorInteraction
          cursorIntensity={1.5}
          opacity={0.9}
        />
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="w-full py-20 px-4 sm:px-6 bg-[#0a0a0a] border-t border-white/8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10 mb-14">
            {/* Team */}
            <div>
              <span className="mono text-xs tracking-widest text-neutral-600 uppercase mb-5 block">
                Team
              </span>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Joshua", role: "AI / CII Pipeline" },
                  { name: "Philip", role: "Solana Smart Contracts" },
                  { name: "Lucas", role: "Systems (remote)" },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700]/30 to-[#FF6B35]/30 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                      {m.name[0]}
                    </div>
                    <div>
                      <span className="text-white text-sm font-medium">
                        {m.name}
                      </span>
                      <span className="text-neutral-500 text-xs ml-2">
                        {m.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stack */}
            <div>
              <span className="mono text-xs tracking-widest text-neutral-600 uppercase mb-5 block">
                Stack
              </span>
              <div className="flex flex-col gap-2">
                {[
                  ["Vision Judge", "Claude Sonnet 4.6"],
                  ["Classifier", "CII Standard"],
                  ["3D Reconstruction", "COLMAP"],
                  ["Rewards Chain", "Solana SPL Token"],
                  ["Compliance", "30-Rule OSHA Engine"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-sm">
                    <span className="text-neutral-600 w-36 shrink-0">{k}</span>
                    <span className="text-neutral-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand */}
            <div className="flex flex-col items-center sm:items-end gap-3">
              <TextScatter
                text="VINNA"
                as="div"
                className="text-4xl font-bold text-white tracking-tight"
                velocity={100}
                rotation={40}
                duration={1.4}
                returnAfter={0.6}
              />
              <span className="mono text-xs text-neutral-600 text-center sm:text-right max-w-[180px] leading-relaxed">
                Verifiable Rewards for Construction Safety Intelligence
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/6">
            <span className="mono text-xs text-neutral-700">
              Presented at HackTech Caltech · Ironsite Prize Track · 2026
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-[safepulse_2s_ease-in-out_infinite]"
                style={{ background: "#4ade80" }}
              />
              <span className="mono text-xs text-neutral-600">
                System operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
