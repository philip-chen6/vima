'use client';

import { motion, AnimatePresence } from 'motion/react';
import SpotlightCard from '@/src/components/ui/spotlight-card';
import type { CIIFrame } from '@/src/hooks/use-api';

interface EventRailProps {
  frames: CIIFrame[] | null;
  loading: boolean;
  error: string | null;
}

const categoryConfig = {
  P: { label: 'PRODUCTIVE', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
  C: { label: 'CONTRIBUTORY', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', dot: 'bg-yellow-400' },
  NC: { label: 'NON-CONTR', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400' },
} as const;

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EventRail({ frames, loading, error }: EventRailProps) {
  // Show most recent 30 frames, reverse chronological
  const recentFrames = frames ? [...frames].reverse().slice(0, 30) : [];

  return (
    <SpotlightCard className="h-full flex flex-col" spotlightColor="rgba(250, 204, 21, 0.04)">
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
            Event Rail
          </h2>
          {frames && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 tabular-nums tracking-wider">
              {frames.length} FRAMES
            </span>
          )}
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-neutral-700 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 py-4 text-center">
            Event data unavailable
          </div>
        )}

        {!loading && !error && recentFrames.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-xs">
            No frame classifications
          </div>
        )}

        {!loading && !error && recentFrames.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
            <AnimatePresence initial={false}>
              {recentFrames.map((frame, i) => {
                const cfg = categoryConfig[frame.category] || categoryConfig.NC;
                return (
                  <motion.div
                    key={`${frame.frame_index}-${frame.timestamp_s}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.015 }}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded border ${cfg.border} ${cfg.bg}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
                          {formatTimestamp(frame.timestamp_s)}
                        </span>
                        <span className={`text-[9px] font-bold tracking-wider ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {frame.confidence !== undefined && (
                          <span className="text-[9px] text-neutral-600 tabular-nums ml-auto">
                            {(frame.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {frame.description && (
                        <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight truncate">
                          {frame.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
