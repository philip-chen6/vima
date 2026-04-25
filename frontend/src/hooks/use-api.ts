'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(path: string, refreshMs?: number): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mountedRef.current) {
        setData(json);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [path]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    let interval: ReturnType<typeof setInterval> | undefined;
    if (refreshMs && refreshMs > 0) {
      interval = setInterval(fetchData, refreshMs);
    }

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchData, refreshMs]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}

// API types based on the backend
export interface HealthResponse {
  status: string;
  video: string;
  video_exists: boolean;
}

export interface CIISummary {
  total_frames: number;
  productive: number;
  contributory: number;
  non_contributory: number;
  wrench_time_pct: number;
  baseline_pct: number;
  raffle_tickets: number;
  model: string;
}

export interface CIIFrame {
  frame_index: number;
  timestamp_s: number;
  category: 'P' | 'C' | 'NC';
  confidence: number;
  description: string;
  frame_path?: string;
}

export interface AnalysisResult {
  event_id: string;
  timestamp_s: number;
  spatial_analysis: {
    zones: Array<{
      zone_id: string;
      label: string;
      risk_level: string;
      workers: number;
    }>;
    hazards: string[];
    summary: string;
  };
}
