"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import VimaNavbar from "@/components/landing/vima-navbar";
import { LiveFrameAnalyzer } from "@/components/landing/live-frame-analyzer";
import dynamic from "next/dynamic";

// Point cloud viewer is r3f-heavy — defer to client only so the dashboard
// doesn't pay the three.js parse cost on the SSR pass.
const PointCloudViewer = dynamic(
  () => import("@/components/landing/point-cloud-viewer").then((m) => m.PointCloudViewer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          background: "linear-gradient(180deg, #0c0508 0%, #050203 100%)",
          border: "1px solid rgba(242,167,184,0.18)",
        }}
      />
    ),
  }
);

// ── Yozakura terminal palette — must match landing tokens exactly ────────
const INK = "#080503";
const WASHI = "#f7ecef";
const TEXT_SECONDARY = "rgba(247,236,239,0.68)";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const SAKURA = "#A64D79";
const SAKURA_HOT = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";
const LINE = "rgba(242,167,184,0.18)";
const HEADING_FONT = '"Times New Roman", Times, serif';

// ── API response types — mirror backend/api.py output shapes ─────────────
type Summary = {
  total_frames: number;
  productive: number;
  contributory: number;
  non_contributory: number;
  wrench_time_pct: number;
  baseline_pct: number;
  raffle_tickets: number;
  model: string;
};

type Frame = {
  category: "P" | "C" | "NC" | string;
  confidence: number;
  activity: string;
  frame: string;
  timestamp_s: number;
  finish_reason?: string;
};

function categoryColor(c: string) {
  if (c === "P") return SAKURA_HOT;
  if (c === "C") return LANTERN;
  return RED;
}

export default function DemoClient({
  initialSummary,
  initialFrames,
}: {
  initialSummary: Summary | null;
  initialFrames: Frame[] | null;
}) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [frames, setFrames] = useState<Frame[] | null>(initialFrames);
  const [loading, setLoading] = useState(initialSummary === null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "P" | "NC">("all");
  // Frame highlighted by clicking a camera frustum in the 3D viewer.
  // Undefined until first click. Drives the thumbnail panel below the cloud.
  const [pickedFrame, setPickedFrame] = useState<string | null>(null);

  const reload = async () => {
    setRefreshing(true);
    try {
      const [s, f] = await Promise.all([
        fetch("/api/cii/summary", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/cii/frames", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (s) setSummary(s);
      if (f) setFrames(f);
    } catch {
      // swallowed — UI shows existing data + an error in the console
    } finally {
      setRefreshing(false);
    }
  };

  // Client fallback if SSR couldn't reach the backend
  useEffect(() => {
    if (initialSummary === null || initialFrames === null) {
      reload().finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!frames) return [];
    if (filter === "all") return frames;
    return frames.filter((f) => f.category === filter);
  }, [frames, filter]);

  // Stats ribbon — six cells matching the landing's grid pattern. Numbers
  // come from the live API, not hardcoded prose.
  const cells: Array<[string, string, string]> = summary
    ? [
        ["sampled frames", summary.total_frames.toString(), "live"],
        ["productive", summary.productive.toString(), "P frames"],
        ["contributory", summary.contributory.toString(), "C frames"],
        ["non-contributory", summary.non_contributory.toString(), "NC frames"],
        ["wrench time", `${summary.wrench_time_pct.toFixed(1)}%`, "P / total"],
        ["raffle tickets", summary.raffle_tickets.toString(), "above 30% baseline"],
      ]
    : [];

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: INK,
        color: WASHI,
        fontFamily: "var(--font-mono)",
        position: "relative",
      }}
    >
      <VimaNavbar />

      {/* ── HEADER STRIP ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(120px, 14vw, 160px) clamp(20px, 5vw, 48px) clamp(28px, 3vw, 40px)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "clamp(12px, 2vw, 28px)",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: TEXT_MUTED,
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              dashboard · live spatial-claim workspace
            </p>
            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(2.4rem, 5vw, 4.4rem)",
                fontWeight: 400,
                lineHeight: 0.96,
                background: `linear-gradient(135deg, ${WASHI} 0%, ${SAKURA_HOT} 50%, ${WASHI} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: 0,
              }}
            >
              vima · operating now.
            </h1>
            <p
              style={{
                margin: "18px 0 0",
                maxWidth: "640px",
                color: TEXT_SECONDARY,
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.95rem, 1.1vw, 1.05rem)",
                lineHeight: 1.55,
                letterSpacing: "0.005em",
              }}
            >
              Drop a construction frame and the model returns a structured
              spatial claim. The ledger below is the same data the landing
              cites, served live from the backend so you can pull the
              receipts yourself.
            </p>
          </div>

          <button
            onClick={reload}
            disabled={refreshing}
            type="button"
            style={{
              all: "unset",
              cursor: refreshing ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              border: `1px solid ${LINE}`,
              background: refreshing ? "rgba(166,77,121,0.10)" : "rgba(247,236,239,0.04)",
              color: WASHI,
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.04em",
              transition: "background 160ms ease",
            }}
            aria-label="reload data from backend"
          >
            <RefreshCw size={12} strokeWidth={1.6} className={refreshing ? "spin" : ""} />
            {refreshing ? "syncing" : "reload"}
          </button>
        </div>
      </section>

      {/* ── STATS RIBBON ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 clamp(20px, 5vw, 48px) clamp(40px, 5vw, 64px)",
        }}
      >
        {summary ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              borderTop: `1px solid ${LINE}`,
              borderBottom: `1px solid ${LINE}`,
            }}
            className="vima-stats-grid"
          >
            {cells.map(([label, value, sub], i) => (
              <div
                key={label}
                style={{
                  padding: "16px 14px",
                  borderRight: i === cells.length - 1 ? "0" : `1px solid rgba(242,167,184,0.12)`,
                  minHeight: "104px",
                }}
              >
                <div
                  style={{
                    color: TEXT_MUTED,
                    fontSize: "9px",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    marginTop: "18px",
                    color: label === "wrench time" ? SAKURA_HOT : WASHI,
                    fontSize: "clamp(1.18rem, 1.8vw, 1.6rem)",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    textShadow: label === "wrench time" ? "0 0 18px rgba(242,167,184,0.18)" : "none",
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    color: TEXT_FAINT,
                    fontSize: "9px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div
            style={{
              padding: "40px 0",
              borderTop: `1px solid ${LINE}`,
              borderBottom: `1px solid ${LINE}`,
              color: TEXT_MUTED,
              fontSize: "11px",
              letterSpacing: "0.04em",
            }}
          >
            connecting to backend...
          </div>
        ) : (
          <div
            style={{
              padding: "20px",
              border: `1px solid ${RED}`,
              color: RED,
              fontSize: "11px",
              letterSpacing: "0.04em",
            }}
          >
            backend unreachable. /api/cii/summary returned no data — check the
            container at vimaspatial.tech.
          </div>
        )}

        <p
          style={{
            margin: "10px 0 0",
            color: TEXT_FAINT,
            fontSize: "9px",
            letterSpacing: "0.05em",
            fontFamily: "var(--font-mono)",
          }}
        >
          {summary
            ? `· ${summary.model} · ${summary.total_frames} frames · ${summary.productive}P / ${summary.contributory}C / ${summary.non_contributory}NC`
            : ""}
        </p>
      </section>

      {/* ── COLDPATH REEL ─────────────────────────────────────────────
          The 30s walkthrough captured offline. Lives at the top of the
          workspace because judges should see vima moving before they read
          about it. Muted, looping, autoplay so it acts like a desk-side
          monitor rather than a video player. */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 clamp(20px, 5vw, 48px) clamp(40px, 5vw, 64px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: TEXT_MUTED,
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              cold-path reel · 30 seconds, recorded offline
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              the pipeline, end to end.
            </h2>
          </div>
          <p
            style={{
              margin: 0,
              maxWidth: "420px",
              color: TEXT_MUTED,
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Bodycam frame goes in. Depth-delta filter, MASt3R reconstruction,
            episodic memory, structured spatial claim out. Same path the live
            analyzer below traces, condensed to 30s.
          </p>
        </div>

        <div
          style={{
            position: "relative",
            border: `1px solid ${LINE}`,
            background: "linear-gradient(180deg, rgba(247,236,239,0.025), rgba(8,5,3,0.45))",
            overflow: "hidden",
          }}
        >
          <video
            src="/demo/coldpath.mp4"
            poster="/demo/coldpath-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            controls
            style={{
              width: "100%",
              display: "block",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              background: "#000",
            }}
            aria-label="vima cold-path pipeline walkthrough"
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              padding: "5px 10px",
              border: `1px solid ${LINE}`,
              background: "rgba(8,5,3,0.78)",
              color: SAKURA_HOT,
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              backdropFilter: "blur(6px)",
            }}
          >
            REC · 30s loop
          </div>
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: TEXT_FAINT,
            fontSize: "9px",
            letterSpacing: "0.05em",
            fontFamily: "var(--font-mono)",
          }}
        >
          source · /demo/coldpath.mp4 · captured during a real run, no scripted UI states
        </p>
      </section>

      {/* ── LIVE FRAME ANALYZER (the real demo) ───────────────────────── */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 clamp(20px, 5vw, 48px) clamp(40px, 5vw, 64px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: TEXT_MUTED,
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              live · drop a frame, get a structured claim
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              the analyzer.
            </h2>
          </div>
          <p
            style={{
              margin: 0,
              maxWidth: "420px",
              color: TEXT_MUTED,
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Same endpoint the production pipeline uses. Sub-5-second latency.
            Returns confidence, episode type, OSHA flags, spatial claims with
            distance estimates.
          </p>
        </div>

        <LiveFrameAnalyzer />
      </section>

      {/* ── DEPTH-DELTA FILTER ACTIVITY ─────────────────────────────
          The pre-pass that drops frame pairs whose depth-delta RMSE
          exceeds threshold. Paper claims 57% drop rate; current run is
          39/59 = 66%. Reads /data/depth-filter-log.json directly. */}
      <DepthFilterPanel />

      {/* ── 3D RECONSTRUCTION ─────────────────────────────────────────
          The COLMAP sparse cloud from the masonry video — the same 1770
          vertices the paper benchmarks at 1.199px reprojection error.
          Renders the moment frontend/public/reconstruction/sparse.ply
          lands on disk; until then it shows a "pending export" empty
          state with the path so josh's handoff is unambiguous. */}
      <section
        id="reconstruction"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 64px) clamp(20px, 5vw, 48px)",
          borderTop: `1px solid ${LINE}`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
            gap: "clamp(24px, 4vw, 56px)",
            alignItems: "start",
          }}
          className="vima-recon-grid"
        >
          <div>
            <p
              style={{
                margin: 0,
                color: TEXT_MUTED,
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              reconstruction · COLMAP sparse map
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                fontWeight: 400,
                lineHeight: 1.04,
                letterSpacing: 0,
              }}
            >
              the cloud the claims live in.
            </h2>
            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "480px",
                color: TEXT_SECONDARY,
                fontFamily: "var(--font-sans)",
                fontSize: "13.5px",
                lineHeight: 1.55,
              }}
            >
              19 of 31 frames register through COLMAP into a 1,770-point sparse
              map at 1.199px mean reprojection error — the same numbers the
              paper benchmarks. Drag to orbit, scroll to zoom. Every frame in
              the ledger anchors somewhere in this volume.
            </p>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "24px 0 0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "10px 18px",
                color: TEXT_MUTED,
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.04em",
              }}
            >
              <li>· 1,770 sparse vertices</li>
              <li>· 19 / 31 frames registered</li>
              <li>· 1.199 px reprojection error</li>
              <li>· depth-delta filter pre-pass</li>
            </ul>
          </div>

          <div>
            <PointCloudViewer
              src="/reconstruction/sparse.ply"
              camerasSrc="/data/cameras.json"
              label="colmap sparse · masonry capture"
              autoRotate
              onSelectFrame={setPickedFrame}
            />

            {/* Thumbnail panel — populated when a frustum is clicked.
                The frustum-name is the COLMAP image filename like
                "frame_0013_00026000.jpg". We mount the corresponding
                raw frame from /masonry-frames-raw so judges see the
                actual bodycam still that camera was capturing. */}
            {pickedFrame && (
              <div
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)",
                  gap: "12px",
                  padding: "12px",
                  border: `1px solid ${LINE}`,
                  background: "rgba(8,5,3,0.55)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/masonry-frames-raw/${pickedFrame}`}
                  alt={`bodycam frame ${pickedFrame}`}
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    objectFit: "cover",
                    border: `1px solid ${LINE}`,
                    background: "#000",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: SAKURA_HOT,
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    selected frame
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: WASHI,
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      fontVariantNumeric: "tabular-nums",
                      wordBreak: "break-all",
                    }}
                  >
                    {pickedFrame}
                  </p>
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: TEXT_MUTED,
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    Bodycam still at this camera pose. Click another frustum
                    to swap the view.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── EVIDENCE LEDGER ───────────────────────────────────────────── */}
      <section
        id="ledger"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 64px) clamp(20px, 5vw, 48px)",
          borderTop: `1px solid ${LINE}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: TEXT_MUTED,
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              evidence ledger · live data
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              every frame. every claim.
            </h2>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {/* C filter dropped — current cii-results.json is 26P + 4NC + 0C
                so the "C only" button would return zero rows and read as
                broken. If josh re-runs the classifier and emits C frames,
                add it back here. */}
            {(["all", "P", "NC"] as const).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    padding: "8px 12px",
                    border: `1px solid ${active ? SAKURA : LINE}`,
                    background: active ? "rgba(166,77,121,0.14)" : "rgba(247,236,239,0.03)",
                    color: active ? WASHI : TEXT_MUTED,
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.05em",
                    transition: "background 160ms ease, color 160ms ease",
                  }}
                >
                  {f === "all" ? "all" : `${f} only`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ledger as a real table — no rounded card chrome, hairlines only.
            Matches the landing's evidence-ledger pattern from page.tsx. */}
        <div
          style={{
            border: `1px solid ${LINE}`,
            background: "linear-gradient(180deg, rgba(247,236,239,0.025), rgba(8,5,3,0.40))",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 80px minmax(0, 2fr) 80px 80px",
              gap: "clamp(10px, 1.4vw, 18px)",
              padding: "12px clamp(14px, 1.6vw, 22px)",
              borderBottom: `1px solid ${LINE}`,
              color: TEXT_FAINT,
              fontSize: "9px",
              letterSpacing: "0.06em",
            }}
          >
            <span>frame</span>
            <span>time</span>
            <span>activity</span>
            <span>cii</span>
            <span style={{ textAlign: "right" }}>conf</span>
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: "32px",
                color: TEXT_MUTED,
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}
            >
              {frames === null ? "no data — backend unreachable" : "no rows match the active filter"}
            </div>
          ) : (
            filtered.map((row, i) => (
              <div
                key={row.frame || i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 80px minmax(0, 2fr) 80px 80px",
                  gap: "clamp(10px, 1.4vw, 18px)",
                  alignItems: "center",
                  padding: "10px clamp(14px, 1.6vw, 22px)",
                  borderTop: i === 0 ? "0" : `1px solid rgba(242,167,184,0.10)`,
                  background: i % 2 === 1 ? "rgba(247,236,239,0.015)" : "transparent",
                }}
              >
                <span
                  style={{
                    color: TEXT_FAINT,
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {(row.frame || "").replace(".jpg", "").replace("frame_", "f-")}
                </span>
                <span
                  style={{
                    color: WASHI,
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.timestamp_s.toFixed(1)}s
                </span>
                <span
                  style={{
                    color: TEXT_SECONDARY,
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={row.activity}
                >
                  {row.activity}
                </span>
                <span
                  style={{
                    color: categoryColor(row.category),
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                  }}
                >
                  {row.category}
                </span>
                <span
                  style={{
                    color: WASHI,
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {row.confidence.toFixed(3)}
                </span>
              </div>
            ))
          )}
        </div>

        <p
          style={{
            margin: "12px 0 0",
            color: TEXT_FAINT,
            fontSize: "9px",
            letterSpacing: "0.05em",
            fontFamily: "var(--font-mono)",
          }}
        >
          source · /api/cii/frames · {filtered.length} of {frames?.length ?? 0} rows shown
        </p>
      </section>

      {/* ── PIVOT TO TEMPORAL EVAL PAGE ───────────────────────────────── */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 64px) clamp(20px, 5vw, 48px) clamp(80px, 10vw, 140px)",
          borderTop: `1px solid ${LINE}`,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "clamp(18px, 4vw, 56px)",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: TEXT_MUTED,
              fontSize: "10px",
              letterSpacing: "0.05em",
            }}
          >
            next · vima sees time
          </p>
          <h2
            style={{
              margin: "10px 0 12px",
              fontFamily: HEADING_FONT,
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 400,
              lineHeight: 1.05,
            }}
          >
            single-frame is a starting point. multi-frame is the contribution.
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: "560px",
              color: TEXT_SECONDARY,
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            The analyzer above runs vima-prompt-v1 on a single frame. The /eval
            page runs vima-temporal-v1 across a sequence: every state-change
            claim cites two proof frames, refusals are explicit, and the
            comparison slider lets you verify each claim by eye.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 18px",
              border: `1px solid ${LINE}`,
              background: "rgba(247,236,239,0.04)",
              color: WASHI,
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            ← landing
          </Link>
          <Link
            href="/eval"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "14px 18px",
              border: `1px solid ${SAKURA}`,
              background: "rgba(166,77,121,0.12)",
              color: WASHI,
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            open /eval <ChevronRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
      </section>

      {/* tiny CSS for the spinning reload icon — keep inline, no global slop */}
      <style jsx>{`
        :global(.spin) {
          animation: vima-spin 0.9s linear infinite;
        }
        @keyframes vima-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @media (max-width: 880px) {
          :global(.vima-stats-grid) {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          :global(.vima-stats-grid) > div {
            border-right: 0 !important;
            border-top: 1px solid rgba(242, 167, 184, 0.12);
          }
        }
        /* Below 540px the 6 stat cells crush to ~50px each at 3-up. Drop
           to 2-up so each cell can breathe and the value+label both fit. */
        @media (max-width: 540px) {
          :global(.vima-stats-grid) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 380px) {
          :global(.vima-stats-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

// ── DepthFilterPanel ─────────────────────────────────────────────────────
// Renders the depth-delta filter log as a live activity feed. Each row is
// one frame pair the filter examined, with RMSE-style decision (passed /
// dropped) + reason. Aggregate metrics float at top.

type DepthRow = {
  frame_a: string;
  frame_b: string;
  ts_a: number;
  ts_b: number;
  n_points_a: number | null;
  n_points_b: number | null;
  dropped: boolean;
  reason: string;
};

function DepthFilterPanel() {
  const [rows, setRows] = useState<DepthRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/depth-filter-log.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((d) => !cancelled && setRows(d))
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const aggregate = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const dropped = rows.filter((r) => r.dropped).length;
    const passed = rows.length - dropped;
    return {
      total: rows.length,
      dropped,
      passed,
      pct: ((dropped / rows.length) * 100).toFixed(0),
    };
  }, [rows]);

  return (
    <section
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "clamp(40px, 5vw, 64px) clamp(20px, 5vw, 48px)",
        borderTop: `1px solid ${LINE}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: TEXT_MUTED,
              fontSize: "10px",
              letterSpacing: "0.05em",
            }}
          >
            depth-delta filter · pre-pass activity log
          </p>
          <h2
            style={{
              margin: "12px 0 0",
              fontFamily: HEADING_FONT,
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            half the frames never reach the model.
          </h2>
        </div>
        {aggregate && (
          <div style={{ display: "flex", gap: "clamp(18px, 3vw, 36px)" }}>
            <div>
              <p style={{ margin: 0, color: TEXT_FAINT, fontSize: "9px", letterSpacing: "0.06em" }}>
                examined
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: WASHI,
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(1.05rem, 1.4vw, 1.35rem)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                }}
              >
                {aggregate.total}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: TEXT_FAINT, fontSize: "9px", letterSpacing: "0.06em" }}>
                dropped
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: SAKURA_HOT,
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(1.05rem, 1.4vw, 1.35rem)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                  textShadow: `0 0 14px ${SAKURA_HOT}55`,
                }}
              >
                {aggregate.dropped} ({aggregate.pct}%)
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: TEXT_FAINT, fontSize: "9px", letterSpacing: "0.06em" }}>
                passed
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: WASHI,
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(1.05rem, 1.4vw, 1.35rem)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                }}
              >
                {aggregate.passed}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ margin: 0, color: RED, fontSize: "11px", fontFamily: "var(--font-mono)" }}>
          could not load depth filter log: {error}
        </p>
      )}

      {rows && (
        <div
          style={{
            border: `1px solid ${LINE}`,
            background: "linear-gradient(180deg, rgba(247,236,239,0.025), rgba(8,5,3,0.40))",
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 90px minmax(0, 1fr) 90px 80px",
              gap: "clamp(10px, 1.4vw, 18px)",
              padding: "12px clamp(14px, 1.6vw, 22px)",
              borderBottom: `1px solid ${LINE}`,
              color: TEXT_FAINT,
              fontSize: "9px",
              letterSpacing: "0.06em",
              position: "sticky",
              top: 0,
              background: "rgba(8,5,3,0.92)",
              backdropFilter: "blur(8px)",
              zIndex: 1,
            }}
          >
            <span>pair</span>
            <span>ts a → ts b</span>
            <span>reason</span>
            <span style={{ textAlign: "right" }}>points</span>
            <span style={{ textAlign: "right" }}>state</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={`${r.frame_a}-${r.frame_b}`}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 90px minmax(0, 1fr) 90px 80px",
                gap: "clamp(10px, 1.4vw, 18px)",
                alignItems: "center",
                padding: "8px clamp(14px, 1.6vw, 22px)",
                borderTop: i === 0 ? "0" : `1px solid rgba(242,167,184,0.08)`,
                background: i % 2 === 1 ? "rgba(247,236,239,0.013)" : "transparent",
                opacity: r.dropped ? 0.62 : 1,
              }}
            >
              <span
                style={{
                  color: TEXT_FAINT,
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                #{(i + 1).toString().padStart(2, "0")}
              </span>
              <span
                style={{
                  color: WASHI,
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.ts_a.toFixed(1)} → {r.ts_b.toFixed(1)}s
              </span>
              <span
                style={{
                  color: r.dropped ? TEXT_MUTED : TEXT_SECONDARY,
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.reason}
              </span>
              <span
                style={{
                  color: TEXT_MUTED,
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                }}
              >
                {r.n_points_a ?? "—"} / {r.n_points_b ?? "—"}
              </span>
              <span
                style={{
                  color: r.dropped ? RED : SAKURA_HOT,
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textAlign: "right",
                }}
              >
                {r.dropped ? "DROP" : "PASS"}
              </span>
            </div>
          ))}
        </div>
      )}
      <p
        style={{
          margin: "10px 0 0",
          color: TEXT_FAINT,
          fontSize: "9px",
          letterSpacing: "0.05em",
          fontFamily: "var(--font-mono)",
        }}
      >
        source · /data/depth-filter-log.json · paper claims 57% drop rate, this run shows{" "}
        {aggregate ? `${aggregate.pct}%` : "—"}
      </p>
    </section>
  );
}
