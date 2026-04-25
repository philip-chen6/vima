'use client';

import Header from '@/src/components/console/Header';
import CIIGauge from '@/src/components/console/CIIGauge';
import VideoStream from '@/src/components/console/VideoStream';
import EventRail from '@/src/components/console/EventRail';
import EvidenceLedger from '@/src/components/console/EvidenceLedger';
import { useApi } from '@/src/hooks/use-api';
import type { HealthResponse, CIISummary, CIIFrame } from '@/src/hooks/use-api';

export default function Home() {
  const health = useApi<HealthResponse>('/health', 10000);
  const ciiSummary = useApi<CIISummary>('/cii/summary', 15000);
  const ciiFrames = useApi<CIIFrame[]>('/cii/frames', 15000);

  const isConnected = !!health.data && health.data.status === 'ok';

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 construction-grid">
      <Header connected={isConnected} lastUpdated={health.lastUpdated} />

      {/* Main console grid — mobile-first single column, desktop 2-col */}
      <main className="flex-1 p-3 sm:p-4 gap-3 sm:gap-4 grid grid-cols-1 lg:grid-cols-12 grid-rows-[auto] auto-rows-min">
        {/* Video Stream — spans 8 cols on desktop */}
        <div className="lg:col-span-8 min-h-[280px] sm:min-h-[340px]">
          <VideoStream />
        </div>

        {/* CII Gauge — spans 4 cols on desktop */}
        <div className="lg:col-span-4 min-h-[280px]">
          <CIIGauge
            data={ciiSummary.data}
            loading={ciiSummary.loading}
            error={ciiSummary.error}
          />
        </div>

        {/* Event Rail — spans 6 cols on desktop */}
        <div className="lg:col-span-6 min-h-[300px] max-h-[500px]">
          <EventRail
            frames={ciiFrames.data}
            loading={ciiFrames.loading}
            error={ciiFrames.error}
          />
        </div>

        {/* Evidence Ledger — spans 6 cols on desktop */}
        <div className="lg:col-span-6 min-h-[300px] max-h-[500px]">
          <EvidenceLedger
            frames={ciiFrames.data}
            summary={ciiSummary.data}
            loading={ciiFrames.loading}
            error={ciiFrames.error}
          />
        </div>
      </main>

      {/* Footer bar */}
      <footer className="px-4 py-2 border-t border-white/[0.04] bg-neutral-950/80 flex items-center justify-between">
        <span className="text-[9px] tracking-[0.2em] text-neutral-600">
          VINNA v1.0 / IRONSITE SPATIAL / HACKTECH 2026
        </span>
        <span className="text-[9px] tracking-[0.2em] text-neutral-600">
          {isConnected ? `API: ${health.data?.video_exists ? 'VIDEO LOADED' : 'NO VIDEO'}` : 'API OFFLINE'}
        </span>
      </footer>
    </div>
  );
}
