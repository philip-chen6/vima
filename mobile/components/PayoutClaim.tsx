"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";

export function PayoutClaim() {
  const pendingPrize = useStore((s) => s.pendingPrize);
  const submitPayout = useStore((s) => s.submitPayout);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!pendingPrize) return null;

  const handleSubmit = () => {
    if (!address.trim() || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      submitPayout(address.trim());
    }, 600);
  };

  const handlePhantomConnect = () => {
    // STUB: in production, wire to @solana/wallet-adapter-react
    setAddress("DemoPh4nt0mAddrXyz1234...abCD");
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ zIndex: 200, background: "rgba(5, 5, 5, 0.92)", backdropFilter: "blur(16px)" }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="w-full max-w-[320px] glass-card glass-card-strong p-8"
      >
        <div className="text-center mb-7">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-pink-soft)] mb-3">
            you won
          </div>
          <div className="font-cash text-[64px] leading-none tracking-tight text-[var(--color-text)]">
            {pendingPrize.label}
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-mute)] mt-1">
            {pendingPrize.sublabel}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-[var(--color-dim)] mb-2">
              your solana address
            </span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="paste address…"
              className="w-full text-[13px] px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-pink)] outline-none"
              style={{ fontFamily: "ui-monospace, SF Mono, Menlo, monospace" }}
            />
          </label>

          <button
            onClick={handlePhantomConnect}
            className="pill w-full text-[12px] tracking-[0.14em] uppercase font-medium"
            style={{
              background: "rgb(255 255 255 / 0.04)",
              color: "var(--color-pink-soft)",
              border: "1px solid var(--color-border)",
              padding: "10px 18px",
            }}
          >
            <span style={{ fontSize: 11 }}>◆</span>
            connect phantom <span className="text-[10px] text-[var(--color-dim)]">(optional)</span>
          </button>

          <motion.button
            onClick={handleSubmit}
            whileTap={{ scale: 0.97 }}
            disabled={!address.trim() || submitting}
            className="pill w-full text-[13px] tracking-[0.16em] uppercase font-medium mt-2"
            style={{
              background: address.trim()
                ? "linear-gradient(135deg, var(--color-pink-300), var(--color-pink-500))"
                : "var(--color-surface-2)",
              color: address.trim() ? "#1a0a12" : "var(--color-dim)",
              padding: "14px 22px",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "queueing…" : "claim payout"}
          </motion.button>
        </div>

        <p className="font-book text-[11px] text-center text-[var(--color-dim)] mt-5 leading-[1.5]" style={{ fontWeight: 350 }}>
          payouts batch hourly. session has no account — bookmark to keep streak.
        </p>
      </motion.div>
    </motion.div>
  );
}
