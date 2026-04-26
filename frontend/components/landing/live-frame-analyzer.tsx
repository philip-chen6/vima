"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ImagePlus, AlertTriangle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
// Mirrors the structured JSON returned by /analyze/frame (see backend/judge.py
// SYSTEM prompt). Optional fields are present because the model occasionally
// omits low-signal sections.
type SpatialClaim = {
  object: string;
  location: string;
  distance_m: number | null;
};

type ViolationFlag = {
  rule: string;
  severity: "high" | "medium" | "low";
  evidence: string;
};

type FrameAnalysis = {
  pnc?: "P" | "C" | "NC";
  activity?: string;
  spatial_claims?: SpatialClaim[];
  violation_flags?: ViolationFlag[];
  confidence?: number;
  reasoning?: string;
  event_id?: string;
  timestamp_s?: number;
  model?: string;
  cloud_stub?: boolean;
  cloud_n_points?: number;
};

type Phase = "idle" | "loading" | "result" | "error";

// CII semantic color tokens from DESIGN.md
const CII_COLORS: Record<string, { fg: string; label: string }> = {
  P: { fg: "#A64D79", label: "productive" }, // sakura
  C: { fg: "#ffd3a6", label: "contributory" }, // lantern
  NC: { fg: "#ef476f", label: "non-contributory" }, // red
};

const SAMPLE_FRAMES = [
  { id: "frame_007", src: "/vima-yozakura-frames/frame_007.jpg", label: "frame 007" },
  { id: "frame_022", src: "/vima-yozakura-frames/frame_022.jpg", label: "frame 022" },
  { id: "frame_045", src: "/vima-yozakura-frames/frame_045.jpg", label: "frame 045" },
  { id: "frame_073", src: "/vima-yozakura-frames/frame_073.jpg", label: "frame 073" },
];

export function LiveFrameAnalyzer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FrameAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const elapsedTimer = useRef<number | null>(null);
  // Track every blob: URL we mint so we can revoke them. Without this we
  // leak one ObjectURL per upload, and iOS Safari caps these per-tab.
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Revoke a blob URL we created earlier. No-op for sample frames (which
  // are static /vima-yozakura-frames/ paths, not blob: URLs).
  const revokeBlob = useCallback((url: string | null) => {
    if (!url) return;
    if (!url.startsWith("blob:")) return;
    if (!blobUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    blobUrlsRef.current.delete(url);
  }, []);

  // On unmount, revoke every leftover blob URL.
  useEffect(() => {
    const created = blobUrlsRef.current;
    return () => {
      for (const u of created) URL.revokeObjectURL(u);
      created.clear();
    };
  }, []);

  const startTimer = useCallback(() => {
    setElapsed(0);
    const start = Date.now();
    elapsedTimer.current = window.setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (elapsedTimer.current !== null) {
      window.clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
  }, []);

  const analyzeBlob = useCallback(
    async (blob: Blob, filename: string, displayUrl: string) => {
      setPhase("loading");
      setError(null);
      setResult(null);
      setPreviewUrl((prev) => {
        if (prev !== displayUrl) revokeBlob(prev);
        return displayUrl;
      });
      startTimer();

      try {
        const fd = new FormData();
        fd.append("file", blob, filename);
        const params = new URLSearchParams({
          timestamp: "0",
          event_id: `live upload ${new Date().toISOString().slice(11, 19)}`,
        });
        const res = await fetch(`/api/analyze/frame?${params.toString()}`, {
          method: "POST",
          body: fd,
        });
        // 503 = backend is up but Anthropic upstream is paused (auth /
        // rate limit / connection). The body is structured JSON. Render
        // a calm paused state instead of a generic error.
        if (res.status === 503 || res.status === 502) {
          const body = await res.json().catch(() => ({}));
          const msg =
            body.message ||
            "live analyzer is paused. cached evidence below remains valid.";
          setError(`paused: ${msg}`);
          setPhase("error");
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 240)}` : ""}`,
          );
        }
        const json = (await res.json()) as FrameAnalysis;
        setResult(json);
        setPhase("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      } finally {
        stopTimer();
      }
    },
    [revokeBlob, startTimer, stopTimer],
  );

  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.add(url);
      void analyzeBlob(file, file.name || "upload.jpg", url);
    },
    [analyzeBlob],
  );

  const handleSample = useCallback(
    async (src: string) => {
      try {
        setPhase("loading");
        const res = await fetch(src);
        const blob = await res.blob();
        const filename = src.split("/").pop() || "sample.jpg";
        await analyzeBlob(blob, filename, src);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    },
    [analyzeBlob],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFile(file);
      } else if (file) {
        setError("file must be an image (jpg, png).");
        setPhase("error");
      }
    },
    [handleFile],
  );

  const reset = () => {
    revokeBlob(previewUrl);
    setPhase("idle");
    setError(null);
    setResult(null);
    setPreviewUrl(null);
  };

  const cii = result?.pnc ? CII_COLORS[result.pnc] : null;
  const confidencePct =
    typeof result?.confidence === "number"
      ? Math.round(result.confidence * 100)
      : null;

  return (
    <section
      id="live-analyze"
      className="relative border-y border-[rgba(166,77,121,0.18)] bg-[var(--color-ink)] px-5 py-12 sm:px-8 lg:px-12"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 border border-[rgba(166,77,121,0.18)] bg-[rgba(27,20,24,0.72)]">
          <div className="grid gap-px bg-[rgba(166,77,121,0.14)] md:grid-cols-[1fr_320px]">
            <div className="bg-[var(--color-ink)] p-4 sm:p-5">
              <p
                className="text-[10px] tracking-[0.04em] text-[var(--color-sakura-hot)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                live frame analyzer · claude vision
              </p>
              <h2 className="mt-2 text-2xl font-light tracking-normal text-[var(--color-washi)] md:text-4xl">
                drop a frame. inspect the claim.
              </h2>
            </div>
            <div className="grid grid-cols-3 bg-[var(--color-ink)] text-[10px] tracking-[0.04em] text-[var(--color-washi-dim)] md:grid-cols-1">
              <div className="border-l border-[rgba(166,77,121,0.14)] px-3 py-2 md:border-l-0 md:border-b md:border-[rgba(166,77,121,0.14)]">
                <span style={{ fontFamily: "var(--font-mono)" }}>input</span>
                <p className="mt-1 text-[var(--color-washi)]">frame</p>
              </div>
              <div className="border-l border-[rgba(166,77,121,0.14)] px-3 py-2 md:border-l-0 md:border-b md:border-[rgba(166,77,121,0.14)]">
                <span style={{ fontFamily: "var(--font-mono)" }}>output</span>
                <p className="mt-1 text-[var(--color-washi)]">cii + spatial</p>
              </div>
              <div className="border-l border-[rgba(166,77,121,0.14)] px-3 py-2 md:border-l-0">
                <span style={{ fontFamily: "var(--font-mono)" }}>latency</span>
                <p
                  className="mt-1 text-[var(--color-washi)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  ~2s
                </p>
              </div>
            </div>
          </div>
          <p className="border-t border-[rgba(166,77,121,0.14)] px-4 py-3 text-sm leading-6 text-[var(--color-washi-dim)] sm:px-5">
            this hits the real backend: the model reads a construction frame,
            returns a cii verdict, extracts spatial claims, and flags safety
            evidence without rerunning the whole memory pipeline.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          {/* drop zone */}
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className={`group relative flex min-h-[328px] cursor-pointer flex-col items-center justify-center border p-4 transition ${
                dragActive
                  ? "border-[var(--color-sakura)] bg-[var(--color-sakura-soft)]"
                  : "border-[rgba(166,77,121,0.18)] bg-[var(--color-sumi)] hover:border-[rgba(242,167,184,0.42)]"
              }`}
              role="button"
              tabIndex={0}
              aria-label="upload frame for analysis"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {previewUrl ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="uploaded frame"
                    className="mx-auto max-h-[288px] w-auto border border-[rgba(166,77,121,0.24)] object-contain"
                  />
                  {phase === "loading" && (
                    <div className="absolute inset-0 grid place-items-center bg-[rgba(8,5,3,0.78)] backdrop-blur-sm">
                      <ThinkingPulse elapsed={elapsed} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <Upload className="h-7 w-7 text-[var(--color-sakura-hot)]" />
                  <p className="mt-4 text-sm text-[var(--color-washi)]">
                    drop an image here, or click to upload
                  </p>
                  <p
                    className="mt-2 text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    jpg · png · webp
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* result panel */}
          <div className="border border-[rgba(166,77,121,0.18)] bg-[var(--color-ink)] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[rgba(166,77,121,0.18)] pb-3">
              <span
                className="text-[10px] tracking-[0.04em] text-[var(--color-sakura-hot)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                spatial claim
              </span>
              <span
                className="flex items-center gap-2 text-[10px] tracking-[0.04em] text-[var(--color-green)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span
                  className="h-2 w-2 rounded-full bg-[var(--color-green)]"
                  style={{ animation: "vima-pulse 2s ease-in-out infinite" }}
                />
                {phase === "loading" ? "analyzing" : "ready"}
              </span>
            </div>

            {phase === "idle" && (
              <EmptyState onSample={handleSample} />
            )}

            {phase === "loading" && (
              <div className="grid min-h-[260px] place-items-center">
                <ThinkingPulse elapsed={elapsed} />
              </div>
            )}

            {phase === "error" && error && (
              <ErrorState message={error} onRetry={reset} />
            )}

            {phase === "result" && result && (
              <div className="space-y-5">
                {/* cii verdict + confidence */}
                <div className="grid gap-px border border-[rgba(166,77,121,0.14)] bg-[rgba(166,77,121,0.14)] sm:grid-cols-2">
                  <div className="bg-[var(--color-sumi)] p-3">
                    <p
                      className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      cii verdict
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span
                        className="text-4xl font-semibold"
                        style={{
                          color: cii?.fg ?? "var(--color-washi)",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                          textShadow: cii
                            ? `0 0 18px ${cii.fg}55`
                            : undefined,
                        }}
                      >
                        {result.pnc ?? "—"}
                      </span>
                      <span
                        className="text-xs text-[var(--color-washi-dim)]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {cii?.label ?? ""}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[var(--color-sumi)] p-3 text-left sm:text-right">
                    <p
                      className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      confidence
                    </p>
                    <div
                      className="mt-2 text-3xl font-semibold text-[var(--color-sakura-hot)]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {confidencePct !== null ? `${confidencePct}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* confidence bar */}
                {confidencePct !== null && (
                  <div className="h-1 w-full bg-[rgba(247,236,239,0.08)]">
                    <div
                      className="h-full"
                      style={{
                        width: `${confidencePct}%`,
                        background: cii?.fg ?? "var(--color-sakura-hot)",
                        boxShadow: cii ? `0 0 10px ${cii.fg}80` : undefined,
                      }}
                    />
                  </div>
                )}

                {/* activity */}
                {result.activity && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      activity
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-washi)]">
                      {result.activity}
                    </p>
                  </div>
                )}

                {/* reasoning */}
                {result.reasoning && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      reasoning
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-washi-dim)]">
                      {result.reasoning}
                    </p>
                  </div>
                )}

                {/* spatial claims */}
                {result.spatial_claims && result.spatial_claims.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      spatial claims
                    </p>
                    <div className="mt-2 space-y-1">
                      {result.spatial_claims.map((c, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[96px_1fr_60px] gap-2 border border-[rgba(166,77,121,0.14)] bg-[var(--color-sumi)] px-3 py-2 text-[11px] text-[var(--color-washi-dim)] sm:grid-cols-[120px_1fr_60px]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          <span className="truncate text-[var(--color-sakura-hot)]">
                            {c.object}
                          </span>
                          <span className="truncate text-[var(--color-washi)]">
                            {c.location}
                          </span>
                          <span className="text-right">
                            {c.distance_m !== null && c.distance_m !== undefined
                              ? `${c.distance_m.toFixed(1)} m`
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* violations */}
                {result.violation_flags && result.violation_flags.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      osha flags
                    </p>
                    <div className="mt-2 space-y-1">
                      {result.violation_flags.map((v, i) => (
                        <div
                          key={i}
                          className="border border-[rgba(166,77,121,0.14)] bg-[var(--color-sumi)] px-3 py-2 text-xs text-[var(--color-washi-dim)]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--color-washi)]">
                              {v.rule}
                            </span>
                            <span
                              className="text-[10px] tracking-[0.04em]"
                              style={{
                                fontFamily: "var(--font-mono)",
                                color:
                                  v.severity === "high"
                                    ? "var(--color-red)"
                                    : v.severity === "medium"
                                      ? "var(--color-sakura-hot)"
                                      : "var(--color-washi-mute)",
                              }}
                            >
                              {v.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-[var(--color-washi-dim)]">
                            {v.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* meta */}
                <div
                  className="flex items-center justify-between border-t border-[rgba(166,77,121,0.14)] pt-3 text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span>{result.model ?? "claude-sonnet"}</span>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[var(--color-sakura-hot)] transition hover:text-[var(--color-washi)]"
                  >
                    try another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* sample frames row */}
        <div className="mt-6">
          <p
            className="mb-3 text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            try sample frames
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SAMPLE_FRAMES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSample(s.src)}
                disabled={phase === "loading"}
                className="group relative aspect-video overflow-hidden border border-[rgba(166,77,121,0.18)] bg-[var(--color-sumi)] transition hover:border-[rgba(242,167,184,0.48)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={s.label}
                  className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
                />
                <span
                  className="absolute bottom-1 left-2 text-[10px] tracking-[0.04em] text-[var(--color-washi)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                  }}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function EmptyState({ onSample }: { onSample: (src: string) => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
      <ImagePlus className="h-7 w-7 text-[var(--color-sakura-hot)]" />
      <p className="max-w-sm text-sm leading-6 text-[var(--color-washi-dim)]">
        upload a frame, or click a sample below. the judge runs claude sonnet
        against the same prompt the production pipeline uses.
      </p>
      <button
        type="button"
        onClick={() => onSample(SAMPLE_FRAMES[0].src)}
        className="border border-[rgba(166,77,121,0.42)] bg-[var(--color-sumi)] px-4 py-2 text-[10px] tracking-[0.04em] text-[var(--color-sakura-hot)] transition hover:border-[rgba(242,167,184,0.55)] hover:text-[var(--color-washi)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        run sample frame
      </button>
    </div>
  );
}

function ThinkingPulse({ elapsed }: { elapsed: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid h-12 w-12 grid-cols-3 gap-px border border-[rgba(166,77,121,0.28)] bg-[rgba(166,77,121,0.14)] p-1">
        <span
          className="bg-[var(--color-sakura)]"
          style={{
            animation: "vima-pulse 2s ease-in-out infinite",
          }}
        />
        <span className="bg-[rgba(247,236,239,0.08)]" />
        <span className="bg-[rgba(242,167,184,0.22)]" />
        <span className="bg-[rgba(247,236,239,0.08)]" />
        <span className="bg-[var(--color-sakura-hot)]" />
        <span className="bg-[rgba(247,236,239,0.08)]" />
        <span className="bg-[rgba(242,167,184,0.22)]" />
        <span className="bg-[rgba(247,236,239,0.08)]" />
        <span className="bg-[var(--color-sakura)]" />
      </div>
      <p
        className="text-[11px] tracking-[0.04em] text-[var(--color-washi)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        claude vision is reading the frame...
      </p>
      <p
        className="text-[10px] tracking-[0.04em] text-[var(--color-washi-mute)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {elapsed.toFixed(1)}s
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-7 w-7 text-[var(--color-red)]" />
      <p
        className="text-[10px] tracking-[0.04em] text-[var(--color-red)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        analyze failed
      </p>
      <pre
        className="max-w-md whitespace-pre-wrap break-words border border-[rgba(239,71,111,0.3)] bg-[var(--color-sumi)] px-4 py-3 text-left text-[11px] leading-5 text-[var(--color-washi)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {message}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="border border-[rgba(166,77,121,0.42)] bg-[var(--color-sumi)] px-4 py-2 text-[10px] tracking-[0.04em] text-[var(--color-sakura-hot)] transition hover:border-[rgba(242,167,184,0.55)] hover:text-[var(--color-washi)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        try again
      </button>
    </div>
  );
}

export default LiveFrameAnalyzer;
