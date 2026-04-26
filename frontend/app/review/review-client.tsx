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

type ReviewStatus = "pending" | "accepted" | "rejected" | "skipped";

const INK = "#080503";
const WASHI = "#f7ecef";
const TEXT_SECONDARY = "rgba(247,236,239,0.68)";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const LINE = "rgba(242,167,184,0.18)";
const SAKURA = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";
const GREEN = "#4fd1b8";
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

function bracketFrames(ts: number, manifest: FrameManifest[]) {
  if (manifest.length < 2) return null;
  for (let i = 0; i < manifest.length - 1; i += 1) {
    if (manifest[i].timestamp_s <= ts && ts <= manifest[i + 1].timestamp_s) {
      return { before: manifest[i], after: manifest[i + 1] };
    }
  }
  return { before: manifest[manifest.length - 2], after: manifest[manifest.length - 1] };
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
    <div style={{ border: `1px solid ${LINE}`, padding: "14px 16px", background: "rgba(247,236,239,0.035)" }}>
      <div style={{ color: TEXT_MUTED, fontSize: "9px", letterSpacing: "0.06em" }}>{label}</div>
      <div
        style={{
          marginTop: "10px",
          color: accent,
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(1.2rem, 2vw, 1.8rem)",
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
        background: `${color}18`,
        color: WASHI,
        padding: "12px 14px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "9px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.04em",
        cursor: "pointer",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export default function ReviewClient() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [manifest, setManifest] = useState<FrameManifest[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
  const [reviewState, setReviewState] = useState<Record<number, ReviewStatus>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
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
  const activeFrame = activeEpisode ? closestFrame(activeEpisode.ts_start, manifest) : null;
  const bracket = activeEpisode ? bracketFrames(activeEpisode.ts_start, manifest) : null;

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
          "radial-gradient(circle at 72% 8%, rgba(242,167,184,0.13), transparent 30%), linear-gradient(180deg, #080503 0%, #120811 48%, #080503 100%)",
        color: WASHI,
        fontFamily: "var(--font-mono)",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: `1px solid ${LINE}`,
          background: "rgba(8,5,3,0.84)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            maxWidth: "1500px",
            margin: "0 auto",
            padding: "14px clamp(18px, 4vw, 42px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
          }}
        >
          <Link href="/" style={{ color: WASHI, textDecoration: "none", letterSpacing: "0.08em" }}>
            vima review
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

      <section style={{ maxWidth: "1500px", margin: "0 auto", padding: "clamp(34px, 5vw, 64px) clamp(18px, 4vw, 42px)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: "clamp(22px, 4vw, 56px)",
            alignItems: "end",
          }}
        >
          <div>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>
              product flow · claim review workspace
            </p>
            <h1
              style={{
                margin: "16px 0 0",
                maxWidth: "860px",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(2.4rem, 6vw, 5.8rem)",
                lineHeight: 0.92,
                fontWeight: 400,
                letterSpacing: 0,
              }}
            >
              review the work claims before they become the ledger.
            </h1>
            <p
              style={{
                margin: "22px 0 0",
                maxWidth: "660px",
                color: TEXT_SECONDARY,
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.98rem, 1.2vw, 1.1rem)",
                lineHeight: 1.6,
              }}
            >
              this is the actual operator loop: vima generated spatial claims from the masonry capture, and a reviewer accepts,
              rejects, or skips each one while the source evidence stays visible.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
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
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          padding: "0 clamp(18px, 4vw, 42px) clamp(48px, 6vw, 80px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <aside style={{ border: `1px solid ${LINE}`, background: "rgba(8,5,3,0.48)", minHeight: "720px" }}>
          <div style={{ padding: "16px", borderBottom: `1px solid ${LINE}` }}>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>1 · claim queue</p>
            <h2 style={{ margin: "8px 0 0", fontFamily: HEADING_FONT, fontSize: "1.6rem", fontWeight: 400 }}>
              pending review
            </h2>
          </div>
          <div style={{ maxHeight: "650px", overflowY: "auto" }}>
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
                    gap: "8px",
                    padding: "14px 16px",
                    borderBottom: `1px solid ${LINE}`,
                    background: active ? "rgba(166,77,121,0.16)" : "transparent",
                  }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <span style={{ color: severityColor(severity), fontSize: "10px", letterSpacing: "0.05em" }}>
                      ep {episode.episode.toString().padStart(3, "0")} · {severity}
                    </span>
                    <span style={{ color: statusColor(status), fontSize: "9px", letterSpacing: "0.05em" }}>{status}</span>
                  </span>
                  <strong style={{ color: WASHI, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.35 }}>
                    {episode.summary}
                  </strong>
                  <span style={{ color: TEXT_FAINT, fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>{episode.ts_start.toFixed(1)}s</span>
                    <span>{episode.spatial_claims.length} spatial claims</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ border: `1px solid ${LINE}`, background: "rgba(8,5,3,0.54)", minHeight: "720px" }}>
          <div style={{ padding: "16px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>2 · evidence viewer</p>
              <h2 style={{ margin: "8px 0 0", fontFamily: HEADING_FONT, fontSize: "1.7rem", fontWeight: 400 }}>
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

          <div style={{ padding: "18px" }}>
            <div
              style={{
                position: "relative",
                aspectRatio: "16 / 10",
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
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  padding: "8px 10px",
                  color: WASHI,
                  background: "rgba(8,5,3,0.76)",
                  border: `1px solid ${LINE}`,
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                }}
              >
                source frame · {activeFrame?.timestamp_s.toFixed(1) ?? "--"}s
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
          <section style={{ border: `1px solid ${LINE}`, background: "rgba(8,5,3,0.52)" }}>
            <div style={{ padding: "16px", borderBottom: `1px solid ${LINE}` }}>
              <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>3 · reviewer action</p>
              <h2 style={{ margin: "8px 0 0", fontFamily: HEADING_FONT, fontSize: "1.6rem", fontWeight: 400 }}>
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

          <section style={{ border: `1px solid ${LINE}`, background: "rgba(8,5,3,0.52)" }}>
            <div style={{ padding: "16px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.06em" }}>4 · accepted ledger</p>
                <h2 style={{ margin: "8px 0 0", fontFamily: HEADING_FONT, fontSize: "1.6rem", fontWeight: 400 }}>
                  audit output
                </h2>
              </div>
              <ClipboardCheck size={22} color={SAKURA} strokeWidth={1.5} />
            </div>
            <div style={{ padding: "0 16px 16px", maxHeight: "260px", overflowY: "auto" }}>
              {acceptedEpisodes.length === 0 ? (
                <p style={{ color: TEXT_MUTED, fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.5 }}>
                  accepted claims will appear here as an exportable receipt.
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

          <section style={{ border: `1px solid ${LINE}`, background: "rgba(8,5,3,0.52)", padding: "16px" }}>
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
