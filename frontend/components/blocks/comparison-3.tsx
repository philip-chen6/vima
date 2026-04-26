"use client";

import { Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";

// Vima vs. manual / centralized labeling. Numbers below are illustrative —
// vima score is the verifications-per-minute throughput target on the iOS app
// (one-tap swipe), legacy is a typical scale-ai / mturk crowd-labeling pace.
// Keep these as modeled throughput targets until the live benchmark runner lands.
const VIMA_SCORE = 94;
const LEGACY_SCORE = 38;

export default function Comparison3() {
  return (
    <section className="relative w-full bg-transparent px-6 py-12">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Left Column - Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col"
          >
            <p className="mb-4 text-xs tracking-[0.05em] text-neutral-400" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
              throughput · claims verified per minute
            </p>
            <h2
              className="mb-6 text-5xl font-normal tracking-tight text-white"
              style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 0.97 }}
            >
              vima vs. manual labeling
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-400 md:text-xl">
              Centralized labeling pipelines move at a worker&apos;s reading speed.
              Vima reduces the unit of work to one tap on a phone, then settles
              the answer on-chain. Throughput goes up, audit cost goes down,
              labelers get paid the moment the work clears.
            </p>
            <div className="flex gap-3 text-xs text-neutral-500" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              <span>· one-tap verification</span>
              <span>· on-chain settlement</span>
              <span>· streak + lottery rewards</span>
            </div>
          </motion.div>

          {/* Right Column - Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative h-[520px]">
              {/* Horizontal Grid Lines */}
              <div className="absolute left-0 right-0 top-8 bottom-0 flex flex-col justify-between">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-px w-full bg-neutral-300 dark:bg-neutral-700"
                  />
                ))}
              </div>

              {/* Bar Chart */}
              <div className="absolute left-0 right-0 top-8 bottom-0 flex items-end justify-center gap-6">
                {/* vima */}
                <div
                  className="relative w-40"
                  style={{ height: `${VIMA_SCORE}%`, clipPath: "inset(0 0 0 0)" }}
                >
                  <motion.div
                    initial={{ y: 467 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 w-40"
                    style={{
                      background: "#A64D79",
                      borderTopLeftRadius: "200px",
                      borderTopRightRadius: "200px",
                      boxShadow: "0 0 32px rgba(166,77,121,0.32)",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 1.1 }}
                      className="absolute left-1/2 top-8 -translate-x-1/2"
                    >
                      <div
                        className="flex h-24 w-24 items-center justify-center"
                        style={{ background: "#080503", border: "1px solid rgba(247,236,239,0.92)" }}
                      >
                        <Sparkles className="h-12 w-12" style={{ color: "#f2a7b8" }} />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center"
                    >
                      <div
                        className="text-7xl font-bold text-white md:text-8xl"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {VIMA_SCORE}
                      </div>
                      <div className="mt-2 text-xs font-medium text-white/90">
                        vima · claims/min
                      </div>
                    </motion.div>
                  </motion.div>
                </div>

                {/* manual labeling */}
                <div
                  className="relative w-40"
                  style={{ height: `${LEGACY_SCORE}%`, clipPath: "inset(0 0 0 0)" }}
                >
                  <motion.div
                    initial={{ y: 305 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 w-40"
                    style={{
                      background: "rgba(247,236,239,0.18)",
                      border: "1px solid rgba(247,236,239,0.24)",
                      borderTopLeftRadius: "200px",
                      borderTopRightRadius: "200px",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 1.2 }}
                      className="absolute left-1/2 top-8 -translate-x-1/2"
                    >
                      <div
                        className="flex h-24 w-24 items-center justify-center"
                        style={{ background: "#080503", border: "1px solid rgba(247,236,239,0.32)" }}
                      >
                        <Users className="h-12 w-12" style={{ color: "rgba(247,236,239,0.62)" }} />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 1.0 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center"
                    >
                      <div
                        className="text-7xl font-bold text-white md:text-8xl"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {LEGACY_SCORE}
                      </div>
                      <div className="mt-2 text-xs font-medium text-white/90">
                        manual · claims/min
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* internal benchmark target — replace once measured on the iOS swipe deck */}
            <div className="mt-8 text-center">
              <span
                className="text-xs"
                style={{
                  color: "rgba(247,236,239,0.46)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                vima target throughput · benchmark pending
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
