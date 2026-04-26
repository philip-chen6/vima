"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  SkipForward,
  X,
} from "lucide-react";

type SpatialClaim = {
  object: string;
  location: string;
  distance_m: number | null;
};

type Episode = {
  episode: number;
  frames: string[];
  ts_start: number;
  ts_end: number;
  confidence: number;
  summary: string;
  spatial_claims: SpatialClaim[];
};

type FrameManifest = {
  filename: string;
  timestamp_s: number;
};

type InferenceSegment = {
  id: number;
  score: number;
  area_frac: number;
  bbox_px: [number, number, number, number];
};

type InferenceEntry = {
  frame_id: string;
  filename: string;
  timestamp_s: number;
  depth: {
    url: string;
    depth_min: number;
    depth_max: number;
    depth_mean: number;
    shape: [number, number];
  };
  mask: {
    url: string;
    n_masks: number;
    shape: [number, number];
    segments?: InferenceSegment[];
  };
};

type ReviewStatus = "pending" | "accepted" | "rejected" | "skipped";

const INK = "#080503";
const WASHI = "#f7ecef";
const TEXT_SECONDARY = "rgba(247,236,239,0.68)";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const LINE = "rgba(166,77,121,0.18)";
const SAKURA = "#A64D79";
const SAKURA_HOT = "#f2a7b8";
const PANEL = "rgba(12,7,10,0.72)";
const PANEL_SOFT = "rgba(166,77,121,0.07)";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";
const GREEN = "#78d7a3";
const HEADING_FONT = '"Times New Roman", Times, serif';

function inferSeverity(episode: Episode): "info" | "warning" | "critical" {
  const text = `${episode.summary} ${episode.spatial_claims
    .map((claim) => `${claim.object} ${claim.location}`)
    .join(" ")}`.toLowerCase();
  if (text.includes("absent") && text.includes("guardrail")) return "critical";
  if (text.includes("open_edge") || text.includes("open edge") || text.includes("unguarded")) return "warning";
  return "info";
}

function severityColor(severity: ReturnType<typeof inferSeverity>) {
  if (severity === "critical") return RED;
  if (severity === "warning") return LANTERN;
  return SAKURA;
}

function closestFrame(ts: number, manifest: FrameManifest[]): FrameManifest | null {
  if (!manifest.length) return null;
  return manifest.reduce((best, frame) =>
    Math.abs(frame.timestamp_s - ts) < Math.abs(best.timestamp_s - ts) ? frame : best,
  );
}

function frameNumber(filename: string | undefined): number | null {
  const match = filename?.match(/frame_(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxEpisodeFrame(episodes: Episode[]) {
  return episodes.reduce((maxFrame, episode) => {
    for (const frame of episode.frames) {
      const parsed = frameNumber(frame);
      if (parsed !== null) maxFrame = Math.max(maxFrame, parsed);
    }
    return maxFrame;
  }, 0);
}

function frameForEpisode(episode: Episode, manifest: FrameManifest[], maxSourceFrame: number): FrameManifest | null {
  if (!manifest.length) return null;
  const sourceFrame = frameNumber(episode.frames[0]);
  if (sourceFrame === null || maxSourceFrame <= 1) return closestFrame(episode.ts_start, manifest);

  const normalized = Math.max(0, Math.min(1, (sourceFrame - 1) / (maxSourceFrame - 1)));
  const index = Math.round(normalized * (manifest.length - 1));
  return manifest[index] ?? closestFrame(episode.ts_start, manifest);
}

function bracketFramesAround(frame: FrameManifest | null, manifest: FrameManifest[]) {
  if (!frame || manifest.length < 2) return null;
  const index = manifest.findIndex((candidate) => candidate.filename === frame.filename);
  if (index < 0) return null;
  return {
    before: manifest[Math.max(0, index - 1)],
    after: manifest[Math.min(manifest.length - 1, index + 1)],
  };
}

function statusColor(status: ReviewStatus) {
  if (status === "accepted") return GREEN;
  if (status === "rejected") return RED;
  if (status === "skipped") return LANTERN;
  return TEXT_MUTED;
}

function summarizeObject(claims: SpatialClaim[]) {
  const names = Array.from(new Set(claims.map((claim) => claim.object))).slice(0, 3);
  return names.join(" · ");
}

function ProcessedEvidenceOverlay({
  episode,
  status,
  inference,
}: {
  episode: Episode;
  status: ReviewStatus;
  inference: InferenceEntry | null;
}) {
  const severity = inferSeverity(episode);
  const accent = severityColor(severity);
  const segments = (inference?.mask.segments ?? [])
    .slice()
    .sort((a, b) => b.score * b.area_frac - a.score * a.area_frac)
    .slice(0, 5);
  const [shapeH = 480, shapeW = 640] = inference?.mask.shape ?? [480, 640];
  const statusText = status === "pending" ? "needs review" : status;

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {inference && (
        <>
          <img
            src={inference.depth.url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.42,
              mixBlendMode: "screen",
            }}
          />
          <img
            src={inference.mask.url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.78,
            }}
          />
        </>
      )}

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="review-grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(247,236,239,0.14)" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#review-grid)" opacity="0.55" />
        <path d="M5 18 H95 M5 50 H95 M5 82 H95" stroke="rgba(242,167,184,0.20)" strokeWidth="0.22" strokeDasharray="1.2 1.8" />
        {segments.map((segment, index) => {
          const [x0, y0, x1, y1] = segment.bbox_px;
          const box = {
            x: (x0 / shapeW) * 100,
            y: (y0 / shapeH) * 100,
            w: ((x1 - x0) / shapeW) * 100,
            h: ((y1 - y0) / shapeH) * 100,
          };
          const stroke = index === 0 ? accent : SAKURA_HOT;
          const labelY = box.y > 8 ? box.y - 1.8 : box.y + box.h + 3.2;
          return (
            <g key={`${segment.id}-${index}`}>
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                fill={index === 0 ? "rgba(242,167,184,0.13)" : "rgba(166,77,121,0.10)"}
                stroke={stroke}
                strokeWidth="0.55"
                strokeDasharray={index === 0 ? "0" : "1.2 0.9"}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={`M${box.x} ${box.y + box.h * 0.52} L${box.x + box.w} ${box.y + box.h * 0.46}`}
                stroke={stroke}
                strokeWidth="0.35"
                vectorEffect="non-scaling-stroke"
                opacity="0.8"
              />
              <circle cx={box.x + box.w * 0.5} cy={box.y + box.h * 0.5} r="1.15" fill={stroke} opacity="0.85" />
              <text
                x={box.x}
                y={labelY}
                fill={WASHI}
                fontSize="2.15"
                fontFamily="monospace"
                letterSpacing="0.04"
                style={{ paintOrder: "stroke", stroke: INK, strokeWidth: 0.7 }}
              >
                {`sam segment ${segment.id}`}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        className="vima-review-scan"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "22%",
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${SAKURA_HOT}, transparent)`,
          opacity: 0.65,
          boxShadow: `0 0 18px ${SAKURA_HOT}55`,
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          padding: "8px 10px",
          color: WASHI,
          background: "rgba(8,5,3,0.82)",
          border: `1px solid ${accent}88`,
          fontSize: "10px",
          letterSpacing: "0.04em",
          display: "grid",
          gap: "4px",
          textAlign: "right",
        }}
      >
        <span style={{ color: accent }}>{statusText}</span>
        <span style={{ color: TEXT_MUTED }}>
          {inference ? `${inference.mask.n_masks} sam masks · depth μ ${inference.depth.depth_mean.toFixed(1)}` : "processing assets unavailable"}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {["source frame", inference ? "real depth" : "no depth", inference ? "real sam mask" : "no sam mask", "human eval"].map((label, index) => (
          <span
            key={label}
            style={{
              color: index === 3 && status === "pending" ? accent : TEXT_SECONDARY,
              background: "rgba(8,5,3,0.76)",
              border: `1px solid ${index === 3 && status === "pending" ? `${accent}88` : LINE}`,
              padding: "6px 8px",
              fontSize: "9px",
              letterSpacing: "0.04em",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = WASHI,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={{ borderRight: `1px solid ${LINE}`, padding: "12px 16px", background: PANEL_SOFT }}>
      <div style={{ color: TEXT_MUTED, fontSize: "9px", letterSpacing: "0.04em" }}>{label}</div>
      <div
        style={{
          marginTop: "8px",
          color: accent,
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(1.05rem, 1.7vw, 1.45rem)",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  tone,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  tone: "accept" | "reject" | "skip";
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const color = tone === "accept" ? GREEN : tone === "reject" ? RED : LANTERN;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${color}66`,
        background: `${color}12`,
        color: WASHI,
        padding: "11px 12px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "9px",
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.04em",
        cursor: "pointer",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export default function ReviewClient({
  initialEpisodes = [],
  initialManifest = [],
}: {
  initialEpisodes?: Episode[];
  initialManifest?: FrameManifest[];
}) {
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
  const [manifest, setManifest] = useState<FrameManifest[]>(initialManifest);
  const [inferenceManifest, setInferenceManifest] = useState<InferenceEntry[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(initialEpisodes[0]?.episode ?? null);
  const [reviewState, setReviewState] = useState<Record<number, ReviewStatus>>({});
  const [loaded, setLoaded] = useState(initialEpisodes.length > 0);

  useEffect(() => {
    if (initialEpisodes.length && initialManifest.length) return;
    let cancelled = false;
    Promise.all([
      fetch("/data/episodes.json").then((res) => res.json()),
      fetch("/masonry-frames-raw/manifest.json").then((res) => res.json()),
    ])
      .then(([episodeRows, frameRows]) => {
        if (cancelled) return;
        const usableEpisodes = (episodeRows as Episode[]).filter(
          (episode) => episode.summary && episode.spatial_claims?.length,
        );
        setEpisodes(usableEpisodes);
        setManifest(frameRows as FrameManifest[]);
        setActiveEpisodeId(usableEpisodes[0]?.episode ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [initialEpisodes.length, initialManifest.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/inference/manifest.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: InferenceEntry[]) => {
        if (!cancelled) setInferenceManifest(rows);
      })
      .catch(() => {
        if (!cancelled) setInferenceManifest([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem("vima-review-state");
    if (!raw) return;
    try {
      setReviewState(JSON.parse(raw) as Record<number, ReviewStatus>);
    } catch {
      setReviewState({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("vima-review-state", JSON.stringify(reviewState));
  }, [reviewState]);

  const activeEpisode = useMemo(
    () => episodes.find((episode) => episode.episode === activeEpisodeId) ?? episodes[0] ?? null,
    [activeEpisodeId, episodes],
  );
  const maxSourceFrame = useMemo(() => maxEpisodeFrame(episodes), [episodes]);
  const activeFrame = activeEpisode ? frameForEpisode(activeEpisode, manifest, maxSourceFrame) : null;
  const activeInference = useMemo(
    () => inferenceManifest.find((entry) => entry.filename === activeFrame?.filename) ?? null,
    [activeFrame?.filename, inferenceManifest],
  );
  const bracket = bracketFramesAround(activeFrame, manifest);
  const sourceFrameLabel = activeEpisode?.frames[0]?.replace(/\.jpg$/i, "") ?? null;

  const counts = useMemo(() => {
    const base = { pending: 0, accepted: 0, rejected: 0, skipped: 0 };
    for (const episode of episodes) {
      base[reviewState[episode.episode] ?? "pending"] += 1;
    }
    return base;
  }, [episodes, reviewState]);

  const acceptedEpisodes = useMemo(
    () => episodes.filter((episode) => reviewState[episode.episode] === "accepted"),
    [episodes, reviewState],
  );

  const setDecision = (episodeId: number, status: ReviewStatus) => {
    setReviewState((current) => ({ ...current, [episodeId]: status }));
    const next = episodes.find(
      (episode) => episode.episode !== episodeId && (reviewState[episode.episode] ?? "pending") === "pending",
    );
    if (next) setActiveEpisodeId(next.episode);
  };

  const exportPayload = {
    jobsite: "ironsite masonry capture",
    reviewed_at: "local browser session",
    accepted_claims: acceptedEpisodes.map((episode) => ({
      episode: episode.episode,
      ts_start: episode.ts_start,
      ts_end: episode.ts_end,
      confidence: episode.confidence,
      summary: episode.summary,
      spatial_claims: episode.spatial_claims,
    })),
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at 78% 0%, rgba(166,77,121,0.16), transparent 28%), linear-gradient(180deg, #080503 0%, #130910 48%, #080503 100%)",
        color: WASHI,
        fontFamily: "var(--font-mono)",
      }}
    >
      <style jsx global>{`
        @media (max-width: 1120px) {
          .vima-review-hero {
            grid-template-columns: 1fr !important;
          }

          .vima-review-shell {
            grid-template-columns: 1fr !important;
          }

          .vima-review-shell > aside,
          .vima-review-shell > section {
            min-height: 0 !important;
          }
        }

        @media (max-width: 680px) {
          .vima-review-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .vima-review-stats > div:nth-child(2n) {
            border-right: 0 !important;
          }
        }

        @keyframes vima-review-scan {
          0% {
            transform: translateY(-80px);
            opacity: 0;
          }

          18% {
            opacity: 0.7;
          }

          100% {
            transform: translateY(290px);
            opacity: 0;
          }
        }

        .vima-review-scan {
          animation: vima-review-scan 3.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .vima-review-scan {
            animation: none;
          }
        }
      `}</style>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: `1px solid ${LINE}`,
          background: "rgba(8,5,3,0.88)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "12px clamp(20px, 5vw, 48px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
          }}
        >
          <Link href="/" style={{ color: WASHI, textDecoration: "none", letterSpacing: "0.02em", fontFamily: HEADING_FONT, fontSize: "18px" }}>
            v i m a. <span style={{ color: TEXT_MUTED, fontFamily: "var(--font-mono)", fontSize: "10px" }}>review</span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/demo" style={{ color: TEXT_MUTED, textDecoration: "none", fontSize: "11px" }}>
              dashboard
            </Link>
            <Link href="/eval" style={{ color: TEXT_MUTED, textDecoration: "none", fontSize: "11px" }}>
              eval
            </Link>
            <Link href="/paper.pdf" target="_blank" style={{ color: TEXT_MUTED, textDecoration: "none", fontSize: "11px" }}>
              paper
            </Link>
          </nav>
        </div>
      </header>

      <section style={{ maxWidth: "1400px", margin: "0 auto", padding: "clamp(30px, 5vw, 56px) clamp(20px, 5vw, 48px) 18px" }}>
        <div
          className="vima-review-hero"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.95fr) minmax(360px, 0.75fr)",
            gap: "clamp(24px, 4vw, 56px)",
            alignItems: "start",
          }}
        >
          <div>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>
              product flow · claim review workspace
            </p>
            <h1
              style={{
                margin: "14px 0 0",
                maxWidth: "720px",
                fontFamily: "var(--font-semimono)",
                fontSize: "clamp(1.9rem, 4vw, 3.5rem)",
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
            >
              review field claims before they become the ledger.
            </h1>
            <p
              style={{
                margin: "18px 0 0",
                maxWidth: "620px",
                color: TEXT_SECONDARY,
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.98rem, 1.2vw, 1.1rem)",
                lineHeight: 1.55,
                letterSpacing: "0.005em",
              }}
            >
              This is the operator loop: Vima generates spatial claims from the masonry capture, then a reviewer accepts,
              rejects, or skips each claim while the cited frame evidence stays in view.
            </p>
          </div>

          <div
            className="vima-review-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              border: `1px solid ${LINE}`,
              background: PANEL,
            }}
          >
            <Stat label="claims found" value={episodes.length ? episodes.length.toString() : loaded ? "0" : "..."} accent={WASHI} />
            <Stat label="pending" value={counts.pending.toString()} accent={SAKURA} />
            <Stat label="accepted" value={counts.accepted.toString()} accent={GREEN} />
            <Stat label="rejected / skipped" value={`${counts.rejected} / ${counts.skipped}`} accent={LANTERN} />
          </div>
        </div>
      </section>

      <section
        className="vima-review-shell"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "14px clamp(20px, 5vw, 48px) clamp(48px, 6vw, 80px)",
          display: "grid",
          gridTemplateColumns: "340px minmax(0, 1fr) 330px",
          gap: "12px",
          alignItems: "start",
        }}
      >
        <aside style={{ border: `1px solid ${LINE}`, background: PANEL, minHeight: "680px" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${LINE}` }}>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>1 · claim queue</p>
            <h2 style={{ margin: "6px 0 0", fontFamily: "var(--font-semimono)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.04em" }}>
              pending review
            </h2>
          </div>
          <div style={{ maxHeight: "610px", overflowY: "auto" }}>
            {episodes.slice(0, 48).map((episode) => {
              const status = reviewState[episode.episode] ?? "pending";
              const active = episode.episode === activeEpisode?.episode;
              const severity = inferSeverity(episode);
              return (
                <button
                  key={episode.episode}
                  type="button"
                  onClick={() => setActiveEpisodeId(episode.episode)}
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    width: "100%",
                    cursor: "pointer",
                    display: "grid",
                    gap: "7px",
                    padding: "13px 16px",
                    borderBottom: `1px solid ${LINE}`,
                    background: active ? "rgba(166,77,121,0.16)" : "transparent",
                  }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <span style={{ color: severityColor(severity), fontSize: "9px", letterSpacing: "0.04em" }}>
                      ep {episode.episode.toString().padStart(3, "0")} · {severity}
                    </span>
                    <span style={{ color: statusColor(status), fontSize: "9px", letterSpacing: "0.04em" }}>{status}</span>
                  </span>
                  <strong style={{ color: WASHI, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.35 }}>
                    {episode.summary}
                  </strong>
                  <span style={{ color: TEXT_FAINT, fontSize: "10px", display: "flex", justifyContent: "space-between", fontVariantNumeric: "tabular-nums" }}>
                    <span>{episode.ts_start.toFixed(1)}s</span>
                    <span>{episode.spatial_claims.length} spatial claims</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ border: `1px solid ${LINE}`, background: PANEL, minHeight: "680px" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>2 · evidence viewer</p>
              <h2 style={{ margin: "6px 0 0", fontFamily: "var(--font-semimono)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1.35 }}>
                {activeEpisode?.summary ?? "loading claim"}
              </h2>
            </div>
            {activeEpisode && (
              <div style={{ color: TEXT_MUTED, textAlign: "right", fontSize: "10px", lineHeight: 1.6 }}>
                <div>confidence {(activeEpisode.confidence * 100).toFixed(0)}%</div>
                <div>{activeEpisode.ts_start.toFixed(1)}s - {activeEpisode.ts_end.toFixed(1)}s</div>
              </div>
            )}
          </div>

          <div style={{ padding: "16px" }}>
            <div
              style={{
                position: "relative",
                aspectRatio: activeInference
                  ? `${activeInference.mask.shape[1]} / ${activeInference.mask.shape[0]}`
                  : "16 / 9",
                border: `1px solid ${LINE}`,
                overflow: "hidden",
                background: "#000",
              }}
            >
              {activeFrame ? (
                <img
                  src={`/masonry-frames-raw/${activeFrame.filename}`}
                  alt="selected masonry source frame"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ color: TEXT_MUTED, display: "grid", placeItems: "center", height: "100%" }}>
                  loading source frame
                </div>
              )}
              {activeEpisode && (
                <ProcessedEvidenceOverlay
                  episode={activeEpisode}
                  status={reviewState[activeEpisode.episode] ?? "pending"}
                  inference={activeInference}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  padding: "8px 10px",
                  color: WASHI,
                  background: "rgba(8,5,3,0.82)",
                  border: `1px solid ${LINE}`,
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                }}
              >
                source frame · {sourceFrameLabel ? `${sourceFrameLabel} → ` : ""}{activeFrame?.timestamp_s.toFixed(1) ?? "--"}s
              </div>
            </div>

            {bracket && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                {[
                  { label: "before", frame: bracket.before },
                  { label: "after", frame: bracket.after },
                ].map(({ label, frame }) => (
                  <div key={label} style={{ border: `1px solid ${LINE}`, background: "rgba(247,236,239,0.035)" }}>
                    <img
                      src={`/masonry-frames-raw/${frame.filename}`}
                      alt={`${label} proof frame`}
                      style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: "9px 10px", color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.05em" }}>
                      {label} proof · {frame.timestamp_s.toFixed(1)}s
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
              <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>
                spatial claims · {activeEpisode ? summarizeObject(activeEpisode.spatial_claims) : "loading"}
              </p>
              {activeEpisode?.spatial_claims.map((claim, index) => (
                <div
                  key={`${claim.object}-${claim.location}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(90px, 0.35fr) minmax(0, 1fr) auto",
                    gap: "12px",
                    padding: "12px 0",
                    borderTop: `1px dashed ${LINE}`,
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: SAKURA, fontSize: "11px", letterSpacing: "0.04em" }}>{claim.object}</span>
                  <span style={{ color: TEXT_SECONDARY, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.45 }}>
                    {claim.location}
                  </span>
                  <span style={{ color: WASHI, fontSize: "11px", fontVariantNumeric: "tabular-nums" }}>
                    {claim.distance_m === null ? "n/a" : `${claim.distance_m.toFixed(1)}m`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside style={{ display: "grid", gap: "18px" }}>
          <section style={{ border: `1px solid ${LINE}`, background: PANEL }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${LINE}` }}>
              <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>3 · reviewer action</p>
              <h2 style={{ margin: "6px 0 0", fontFamily: "var(--font-semimono)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.04em" }}>
                resolve this claim
              </h2>
            </div>
            <div style={{ padding: "16px", display: "grid", gap: "10px" }}>
              <ActionButton
                tone="accept"
                icon={<Check size={15} strokeWidth={1.8} />}
                onClick={() => activeEpisode && setDecision(activeEpisode.episode, "accepted")}
              >
                accept into ledger
              </ActionButton>
              <ActionButton
                tone="reject"
                icon={<X size={15} strokeWidth={1.8} />}
                onClick={() => activeEpisode && setDecision(activeEpisode.episode, "rejected")}
              >
                reject claim
              </ActionButton>
              <ActionButton
                tone="skip"
                icon={<SkipForward size={15} strokeWidth={1.8} />}
                onClick={() => activeEpisode && setDecision(activeEpisode.episode, "skipped")}
              >
                skip for later
              </ActionButton>
            </div>
          </section>

          <section style={{ border: `1px solid ${LINE}`, background: PANEL }}>
            <div style={{ padding: "16px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>4 · accepted ledger</p>
                <h2 style={{ margin: "6px 0 0", fontFamily: "var(--font-semimono)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.04em" }}>
                  audit output
                </h2>
              </div>
              <ClipboardCheck size={21} color={SAKURA_HOT} strokeWidth={1.5} />
            </div>
            <div style={{ padding: "0 16px 16px", maxHeight: "260px", overflowY: "auto" }}>
              {acceptedEpisodes.length === 0 ? (
                <p style={{ color: TEXT_MUTED, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.5 }}>
                  Accepted claims will appear here as an exportable receipt.
                </p>
              ) : (
                acceptedEpisodes.map((episode) => (
                  <div key={episode.episode} style={{ padding: "12px 0", borderBottom: `1px solid ${LINE}` }}>
                    <div style={{ color: GREEN, fontSize: "10px", letterSpacing: "0.05em" }}>
                      ep {episode.episode.toString().padStart(3, "0")} · accepted
                    </div>
                    <div style={{ marginTop: "5px", color: WASHI, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.35 }}>
                      {episode.summary}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "16px", borderTop: `1px solid ${LINE}` }}>
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPayload, null, 2))}`}
                download="vima-reviewed-claims.json"
                style={{
                  color: WASHI,
                  border: `1px solid ${LINE}`,
                  background: "rgba(247,236,239,0.045)",
                  padding: "11px 12px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                }}
              >
                <Download size={14} strokeWidth={1.7} />
                export ledger json
              </a>
            </div>
          </section>

          <section style={{ border: `1px solid ${LINE}`, background: PANEL, padding: "16px" }}>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>
              product surface
            </p>
            <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
              <Link href="/eval" style={{ color: TEXT_SECONDARY, textDecoration: "none", display: "flex", gap: "8px", alignItems: "center", fontSize: "12px" }}>
                <Eye size={14} /> inspect temporal proof <ChevronRight size={13} />
              </Link>
              <Link href="/demo" style={{ color: TEXT_SECONDARY, textDecoration: "none", display: "flex", gap: "8px", alignItems: "center", fontSize: "12px" }}>
                <ExternalLink size={14} /> open system dashboard <ChevronRight size={13} />
              </Link>
              <Link href="/paper.pdf" target="_blank" style={{ color: TEXT_SECONDARY, textDecoration: "none", display: "flex", gap: "8px", alignItems: "center", fontSize: "12px" }}>
                <FileText size={14} /> read paper <ChevronRight size={13} />
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
