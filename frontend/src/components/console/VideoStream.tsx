'use client';

import { useState, useRef, useCallback } from 'react';
import SpotlightCard from '@/src/components/ui/spotlight-card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765';

interface AnalysisEvent {
  event_id: string;
  timestamp_s: number;
  timestamp: string;
  result: {
    spatial_analysis?: {
      summary?: string;
      hazards?: string[];
    };
  } | null;
  status: 'pending' | 'complete' | 'error';
}

export default function VideoStream() {
  const [analyzing, setAnalyzing] = useState(false);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [selectedTimestamp, setSelectedTimestamp] = useState('15.0');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeTimestamp = useCallback(async () => {
    const ts = parseFloat(selectedTimestamp);
    if (isNaN(ts)) return;

    const eventId = `NC_${ts.toFixed(0)}s_${Date.now()}`;
    const newEvent: AnalysisEvent = {
      event_id: eventId,
      timestamp_s: ts,
      timestamp: new Date().toISOString(),
      result: null,
      status: 'pending',
    };

    setEvents((prev) => [newEvent, ...prev].slice(0, 20));
    setAnalyzing(true);

    try {
      const res = await fetch(
        `${API_BASE}/analyze/timestamp?timestamp=${ts}&event_id=${encodeURIComponent(eventId)}`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === eventId ? { ...e, result: data, status: 'complete' as const } : e
        )
      );
    } catch {
      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === eventId ? { ...e, status: 'error' as const } : e
        )
      );
    } finally {
      setAnalyzing(false);
    }
  }, [selectedTimestamp]);

  const analyzeFrame = useCallback(async (file: File) => {
    const eventId = `FRAME_${Date.now()}`;
    const newEvent: AnalysisEvent = {
      event_id: eventId,
      timestamp_s: 0,
      timestamp: new Date().toISOString(),
      result: null,
      status: 'pending',
    };

    setEvents((prev) => [newEvent, ...prev].slice(0, 20));
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('event_id', eventId);

      const res = await fetch(`${API_BASE}/analyze/frame`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === eventId ? { ...e, result: data, status: 'complete' as const } : e
        )
      );
    } catch {
      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === eventId ? { ...e, status: 'error' as const } : e
        )
      );
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const runDemo = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/demo`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const demoEvents: AnalysisEvent[] = (Array.isArray(data) ? data : [data]).map(
        (d: Record<string, unknown>, i: number) => ({
          event_id: `DEMO_${i}_${Date.now()}`,
          timestamp_s: (d.timestamp_s as number) || i * 15,
          timestamp: new Date().toISOString(),
          result: d,
          status: 'complete' as const,
        })
      );

      setEvents((prev) => [...demoEvents, ...prev].slice(0, 20));
    } catch {
      // silently fail
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return (
    <SpotlightCard className="h-full flex flex-col" spotlightColor="rgba(250, 204, 21, 0.04)">
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-[0.08em] text-neutral-500">
            video analysis
          </h2>
          {analyzing && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[9px] text-yellow-400 tracking-wider">analyzing</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="text"
              value={selectedTimestamp}
              onChange={(e) => setSelectedTimestamp(e.target.value)}
              placeholder="t (sec)"
              className="w-20 px-2 py-1.5 text-xs bg-neutral-800/80 border border-white/[0.06] rounded text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-yellow-400/30"
            />
            <button
              onClick={analyzeTimestamp}
              disabled={analyzing}
              className="px-3 py-1.5 text-[10px] font-bold tracking-wider bg-neutral-800 hover:bg-neutral-700 border border-white/[0.08] rounded text-white disabled:opacity-40 transition-colors"
            >
              analyze
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider bg-neutral-800 hover:bg-neutral-700 border border-white/[0.08] rounded text-white disabled:opacity-40 transition-colors"
          >
            upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) analyzeFrame(file);
            }}
          />

          <button
            onClick={runDemo}
            disabled={analyzing}
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 rounded text-yellow-400 disabled:opacity-40 transition-colors"
          >
            demo
          </button>
        </div>

        {/* Event log placeholder */}
        {events.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-neutral-600 text-xs mb-1">No analysis events yet</div>
              <div className="text-neutral-700 text-[10px]">
                Enter a timestamp, upload a frame, or run the demo
              </div>
            </div>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
