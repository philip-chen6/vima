'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import SpotlightCard from '@/src/components/ui/spotlight-card';
import type { CIIFrame, CIISummary } from '@/src/hooks/use-api';

interface EvidenceLedgerProps {
  frames: CIIFrame[] | null;
  summary: CIISummary | null;
  loading: boolean;
  error: string | null;
}

export default function EvidenceLedger({ frames, summary, loading, error }: EvidenceLedgerProps) {
  // Build a timeline bar visualization
  const timeline = useMemo(() => {
    if (!frames || frames.length === 0) return null;

    const sorted = [...frames].sort((a, b) => a.timestamp_s - b.timestamp_s);
    const maxT = sorted[sorted.length - 1].timestamp_s;
    const minT = sorted[0].timestamp_s;
    const range = maxT - minT || 1;

    return sorted.map((f) => ({
      x: ((f.timestamp_s - minT) / range) * 100,
      category: f.category,
    }));
  }, [frames]);

  // NC events with descriptions as "evidence"
  const ncEvents = useMemo(() => {
    if (!frames) return [];
    return frames
      .filter((f) => f.category === 'NC' && f.description)
      .sort((a, b) => b.timestamp_s - a.timestamp_s)
      .slice(0, 10);
  }, [frames]);

  return (
    <SpotlightCard className="h-full flex flex-col" spotlightColor="rgba(250, 204, 21, 0.04)">
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
            Evidence Ledger
          </h2>
          {summary && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 tracking-wider tabular-nums">
              {summary.total_frames} CLASSIFIED
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
            Evidence data unavailable
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Timeline bar */}
            {timeline && (
              <div className="mb-4">
                <div className="text-[9px] text-neutral-600 mb-1.5 tracking-wider">TIMELINE</div>
                <div className="relative h-6 bg-neutral-800/50 rounded overflow-hidden border border-white/[0.04]">
                  {timeline.map((t, i) => {
                    const color =
                      t.category === 'P'
                        ? 'bg-emerald-400'
                        : t.category === 'C'
                        ? 'bg-yellow-400'
                        : 'bg-red-400';
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.005, duration: 0.2 }}
                        className={`absolute bottom-0 w-[2px] ${color}`}
                        style={{
                          left: `${t.x}%`,
                          height: '100%',
                          opacity: 0.7,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-neutral-600">0:00</span>
                  <div className="flex gap-3">
                    <span className="text-[8px] text-emerald-400/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" /> P
                    </span>
                    <span className="text-[8px] text-yellow-400/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" /> C
                    </span>
                    <span className="text-[8px] text-red-400/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" /> NC
                    </span>
                  </div>
                  <span className="text-[8px] text-neutral-600">END</span>
                </div>
              </div>
            )}

            {/* NC Evidence list */}
            <div className="flex-1 min-h-0">
              <div className="text-[9px] text-neutral-600 mb-1.5 tracking-wider">
                NON-CONTRIBUTORY EVIDENCE ({ncEvents.length})
              </div>
              {ncEvents.length === 0 ? (
                <div className="text-[10px] text-neutral-600 py-2">
                  No NC events with descriptions found
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-48">
                  {ncEvents.map((ev, i) => (
                    <motion.div
                      key={`${ev.frame_index}-${ev.timestamp_s}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className="flex gap-2 px-2 py-1.5 rounded border border-red-400/10 bg-red-400/[0.03]"
                    >
                      <span className="text-[10px] font-mono text-neutral-500 tabular-nums shrink-0">
                        {Math.floor(ev.timestamp_s / 60)}:{String(Math.floor(ev.timestamp_s % 60)).padStart(2, '0')}
                      </span>
                      <p className="text-[10px] text-neutral-400 leading-tight">
                        {ev.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SpotlightCard>
  );
}
