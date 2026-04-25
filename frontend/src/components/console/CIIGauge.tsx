'use client';

import CountUp from '@/src/components/ui/count-up';
import SpotlightCard from '@/src/components/ui/spotlight-card';
import type { CIISummary } from '@/src/hooks/use-api';

interface CIIGaugeProps {
  data: CIISummary | null;
  loading: boolean;
  error: string | null;
}

function GaugeRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  // Color: green if > 50%, yellow 30-50%, red < 30%
  const color = percent >= 50 ? '#22c55e' : percent >= 30 ? '#facc15' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white tabular-nums">
          <CountUp to={percent} duration={1.5} decimals={1} suffix="%" />
        </span>
        <span className="text-[9px] tracking-[0.2em] text-neutral-500 mt-0.5">WRENCH</span>
      </div>
    </div>
  );
}

export default function CIIGauge({ data, loading, error }: CIIGaugeProps) {
  return (
    <SpotlightCard className="h-full" spotlightColor="rgba(250, 204, 21, 0.05)">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
            CII Wrench-Time
          </h2>
          {data && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 tracking-wider">
              {data.model.toUpperCase()}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-neutral-700 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 py-4 text-center">
            CII unavailable
          </div>
        )}

        {data && !loading && (
          <div className="flex flex-col items-center gap-4">
            <GaugeRing percent={data.wrench_time_pct} />

            <div className="grid grid-cols-3 gap-3 w-full">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-400 tabular-nums">
                  <CountUp to={data.productive} duration={1} />
                </div>
                <div className="text-[9px] tracking-[0.16em] text-neutral-500">PRODUCTIVE</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400 tabular-nums">
                  <CountUp to={data.contributory} duration={1} />
                </div>
                <div className="text-[9px] tracking-[0.16em] text-neutral-500">CONTRIB</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400 tabular-nums">
                  <CountUp to={data.non_contributory} duration={1} />
                </div>
                <div className="text-[9px] tracking-[0.16em] text-neutral-500">NON-CONTR</div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full pt-2 border-t border-white/[0.04]">
              <div className="text-[10px] text-neutral-500">
                Baseline: {data.baseline_pct}%
              </div>
              <div className="flex-1" />
              {data.raffle_tickets > 0 && (
                <div className="text-[10px] px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 tracking-wider">
                  {data.raffle_tickets} RAFFLE TICKETS
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
