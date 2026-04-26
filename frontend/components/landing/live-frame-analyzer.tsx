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
      setPreviewUrl(displayUrl);
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
            "Live analyzer is paused. Cached evidence below remains valid.";
          setError(`PAUSED: ${msg}`);
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
    [startTimer, stopTimer],
  );

  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
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
        setError("File must be an image (jpg, png).");
        setPhase("error");
      }
    },
    [handleFile],
  );

  const reset = () => {
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
      className="relative border-y border-[#f2a7b8]/35 bg-[#0a0507] px-5 py-16 sm:px-8 lg:px-12"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              className="text-xs tracking-[0.28em] text-[#f2a7b8]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              live · claude vision
            </p>
            <h2 className="mt-3 text-3xl font-light tracking-normal text-[#f7ecef] md:text-5xl">
              drop a frame. see the spatial claim.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#9c8d78]">
            This hits the real backend. Claude Sonnet reads the frame, returns a
            CII verdict, spatial claims, and any OSHA violations in roughly two
            seconds.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          {/* ── Drop zone ─────────────────────────────────────────────── */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center border bg-[#100b07] p-6 transition ${
              dragActive
                ? "border-[#A64D79] bg-[#15090f]"
                : "border-[#f2a7b8]/45 hover:border-[#f2a7b8]/70"
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
                  className="mx-auto max-h-[280px] w-auto border border-[#f2a7b8]/40 object-contain"
                />
                {phase === "loading" && (
                  <div className="absolute inset-0 grid place-items-center bg-[#080604]/72 backdrop-blur-sm">
                    <ThinkingPulse elapsed={elapsed} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <Upload className="h-7 w-7 text-[#f2a7b8]" />
                <p className="mt-4 text-base text-[#f7ecef]">
                  Drop an image here, or click to upload.
                </p>
                <p
                  className="mt-2 text-[11px] tracking-[0.18em] text-[#a89292]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  jpg · png · webp
                </p>
              </div>
            )}
          </div>

          {/* ── Result panel ──────────────────────────────────────────── */}
          <div className="border border-[#f2a7b8]/45 bg-[#0d0608] p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#f2a7b8]/30 pb-3">
              <span
                className="text-xs tracking-[0.24em] text-[#f2a7b8]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                spatial claim
              </span>
              <span
                className="flex items-center gap-2 text-xs text-[#76c7ae]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span
                  className="h-2 w-2 rounded-full bg-[#76c7ae]"
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
                {/* CII verdict + confidence */}
                <div className="flex items-baseline justify-between gap-4 border-b border-[#2a1d14] pb-4">
                  <div>
                    <p
                      className="text-[10px] tracking-[0.24em] text-[#a89292]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      cii verdict
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span
                        className="text-4xl font-semibold"
                        style={{
                          color: cii?.fg ?? "#f7ecef",
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
                        className="text-sm text-[#a99a86]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {cii?.label ?? ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-[10px] tracking-[0.24em] text-[#a89292]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      confidence
                    </p>
                    <div
                      className="mt-2 text-3xl font-semibold text-[#ffd3a6]"
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
                  <div className="h-1 w-full bg-[#2a1d14]">
                    <div
                      className="h-full"
                      style={{
                        width: `${confidencePct}%`,
                        background: cii?.fg ?? "#ffd3a6",
                        boxShadow: cii ? `0 0 10px ${cii.fg}80` : undefined,
                      }}
                    />
                  </div>
                )}

                {/* activity */}
                {result.activity && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.24em] text-[#a89292]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      activity
                    </p>
                    <p className="mt-2 text-base text-[#f7ecef]">
                      {result.activity}
                    </p>
                  </div>
                )}

                {/* reasoning */}
                {result.reasoning && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.24em] text-[#a89292]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      reasoning
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#a99a86]">
                      {result.reasoning}
                    </p>
                  </div>
                )}

                {/* spatial claims */}
                {result.spatial_claims && result.spatial_claims.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] tracking-[0.24em] text-[#a89292]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      spatial claims
                    </p>
                    <div className="mt-2 space-y-1">
                      {result.spatial_claims.map((c, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[120px_1fr_60px] gap-2 border border-[#2a1d14] bg-[#100b07] px-3 py-2 text-[11px] text-[#b9aa94]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          <span className="text-[#f2a7b8]">{c.object}</span>
                          <span className="truncate text-[#f7ecef]">
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
                      className="text-[10px] tracking-[0.24em] text-[#a89292]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      osha flags
                    </p>
                    <div className="mt-2 space-y-1">
                      {result.violation_flags.map((v, i) => (
                        <div
                          key={i}
                          className="border border-[#2a1d14] bg-[#100b07] px-3 py-2 text-xs text-[#a99a86]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[#f7ecef]">{v.rule}</span>
                            <span
                              className="text-[10px] tracking-[0.18em]"
                              style={{
                                fontFamily: "var(--font-mono)",
                                color:
                                  v.severity === "high"
                                    ? "#ef476f"
                                    : v.severity === "medium"
                                      ? "#ffd3a6"
                                      : "#a89292",
                              }}
                            >
                              {v.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-[#9c8d78]">{v.evidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* meta */}
                <div
                  className="flex items-center justify-between border-t border-[#2a1d14] pt-3 text-[10px] tracking-[0.18em] text-[#a89292]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span>{result.model ?? "claude-sonnet"}</span>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[#f2a7b8] transition hover:text-[#ffd3a6]"
                  >
                    try another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sample frames row (always visible for fast judge access) ── */}
        <div className="mt-6">
          <p
            className="mb-3 text-[10px] tracking-[0.24em] text-[#a89292]"
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
                className="group relative aspect-video overflow-hidden border border-[#f2a7b8]/35 bg-[#100b07] transition hover:border-[#f2a7b8]/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={s.label}
                  className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
                />
                <span
                  className="absolute bottom-1 left-2 text-[10px] tracking-[0.18em] text-[#f7ecef]"
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
      <ImagePlus className="h-7 w-7 text-[#f2a7b8]" />
      <p className="max-w-sm text-sm text-[#a99a86]">
        Upload a frame, or click a sample below. The judge runs Claude Sonnet
        against the same prompt the production pipeline uses.
      </p>
      <button
        type="button"
        onClick={() => onSample(SAMPLE_FRAMES[0].src)}
        className="border border-[#f2a7b8]/60 bg-[#100b07] px-4 py-2 text-xs tracking-[0.22em] text-[#ffd3a6] transition hover:border-[#ffd3a6] hover:text-[#f7ecef]"
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
      <div className="relative h-12 w-12">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(166,77,121,0.55), transparent 65%)",
            animation: "vima-pulse 2s ease-in-out infinite",
          }}
        />
        <span className="absolute inset-3 rounded-full border border-[#A64D79]/60" />
        <span className="absolute inset-5 rounded-full bg-[#A64D79]/80" />
      </div>
      <p
        className="text-[11px] tracking-[0.24em] text-[#f7ecef]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        claude vision is reading the frame…
      </p>
      <p
        className="text-[10px] tracking-[0.18em] text-[#a89292]"
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
      <AlertTriangle className="h-7 w-7 text-[#ef476f]" />
      <p
        className="text-[10px] tracking-[0.24em] text-[#ef476f]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        analyze failed
      </p>
      <pre
        className="max-w-md whitespace-pre-wrap break-words border border-[#ef476f]/30 bg-[#15090c] px-4 py-3 text-left text-[11px] leading-5 text-[#f7ecef]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {message}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="border border-[#f2a7b8]/60 bg-[#100b07] px-4 py-2 text-xs tracking-[0.22em] text-[#f2a7b8] transition hover:border-[#ffd3a6] hover:text-[#ffd3a6]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        try again
      </button>
    </div>
  );
}

export default LiveFrameAnalyzer;
