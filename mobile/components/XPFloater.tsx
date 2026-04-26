"use client";

import { motion, AnimatePresence } from "motion/react";

export type FloatEvent = {
  id: number;
  amount: number;
  rare: boolean;
  x: number; // px relative to deck center
  y: number;
};

export function XPFloaterStack({ events }: { events: FloatEvent[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {events.map((e) => (
          <motion.div
            key={e.id}
            initial={{ y: 0, scale: 0.8 }}
            animate={{ y: -90, scale: [0.8, 1.1, 1, 0.95] }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], times: [0, 0.15, 0.7, 1] }}
            className="absolute"
            style={{ left: "50%", top: "50%", x: e.x, y: e.y }}
          >
            <div
              className="font-cash-fat tracking-[-0.04em]"
              style={{
                fontSize: 40,
                color: e.rare ? "var(--color-gold)" : "var(--color-pink-300)",
                textShadow: e.rare
                  ? "0 0 26px rgb(255 233 179 / 0.75)"
                  : "0 0 22px rgb(255 184 200 / 0.65)",
              }}
            >
              +{e.amount}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
