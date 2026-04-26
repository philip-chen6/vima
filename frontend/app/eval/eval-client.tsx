"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronRight } from "lucide-react";
import VimaNavbar from "@/components/landing/vima-navbar";

// Lazy-load the comparison slider — it pulls in gsap Draggable + Inertia
// which are heavy. Server doesn't need it.
const ComparisonSlider = dynamic(() => import("@/components/react-bits/comparison-slider"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        aspectRatio: "16/10",
        background: "linear-gradient(180deg, rgba(247,236,239,0.04), rgba(8,5,3,0.4))",
        border: "1px solid rgba(242,167,184,0.18)",
      }}
    />
  ),
});

// ── Types matching backend/temporal_v1.py output schema ───────────────────
type Severity = "info" | "warning" | "critical";

type Claim = {
  type: string;
  description: string;
  start_frame: number;
  end_frame: number;
  evidence: string;
  confidence: number;
  severity: Severity;
};

type Refusal = { between_frames: [number, number]; reason: string };

type FrameMeta = {
  timestamp_s?: number;
  activity?: string;
  category?: string;
  confidence?: number;
};

type Vima = {
  n_frames_examined: number;
  elapsed_s: number;
  model: string;
  claims: Claim[];
  refusals: Refusal[];
  frame_paths: string[];
  frame_meta: FrameMeta[];
};

type BaselineFlat = {
  method?: string;
  n_frames_examined?: number;
  elapsed_s?: number;
  per_frame_claims?: Array<{ frame: number; claim: string }>;
  _note?: string;
};

type Payload = {
  source?: "live" | "reference";
  vima?: Vima;
  baseline?: BaselineFlat;
};

// ── Yozakura terminal palette + tokens ────────────────────────────────────
const INK = "#080503";
const WASHI = "#f7ecef";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const SAKURA = "#A64D79";
const SAKURA_HOT = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";
const LINE = "rgba(242,167,184,0.18)";
const HEADING_FONT = '"Times New Roman", Times, serif';

const SEVERITY_COLOR: Record<Severity, string> = {
  info: SAKURA_HOT,
  warning: LANTERN,
  critical: RED,
};

// Resolve a backend frame path ("frontend/public/foo.jpg") to a URL the
// browser can fetch ("/foo.jpg").
function frameUrl(p: string) {
  if (p.startsWith("http")) return p;
  if (p.startsWith("/")) return p;
  // Strip leading "frontend/public/" if present.
  return "/" + p.replace(/^frontend\/public\//, "");
}

export default function EvalClient({ initial }: { initial: Payload | null }) {
  const [data, setData] = useState<Payload | null>(initial);
  const [loading, setLoading] = useState(initial === null);
  const [error, setError] = useState<string | null>(null);
  const [activeClaimIdx, setActiveClaimIdx] = useState(0);

  // Client-side fallback fetch — if SSR fetch failed, try again from the
  // browser. Common in dev where the backend isn't reachable from the
  // server side until docker compose is up.
  useEffect(() => {
    if (initial !== null) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/eval", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`backend returned ${r.status}`);
        const json = await r.json();
        if (!cancelled) setData(json);
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const vima = data?.vima;
  const baseline = data?.baseline;
  const claims = vima?.claims ?? [];
  const grounded = useMemo(
    () => claims.filter((c) => c.type !== "no_change_detected"),
    [claims],
  );
  const activeClaim = grounded[activeClaimIdx] ?? null;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: INK,
        color: WASHI,
        fontFamily: "var(--font-mono)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <VimaNavbar />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(120px, 14vw, 180px) clamp(20px, 5vw, 48px) clamp(40px, 5vw, 64px)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: TEXT_MUTED,
            fontSize: "10px",
            letterSpacing: "0.05em",
          }}
        >
          eval · vima-temporal-v1 · multi-frame state-change detection
        </p>
        <h1
          style={{
            margin: "20px 0 0",
            maxWidth: "920px",
            fontFamily: HEADING_FONT,
            fontSize: "clamp(2.4rem, 6vw, 5.5rem)",
            fontWeight: 400,
            lineHeight: 0.94,
            letterSpacing: 0,
            background: `linear-gradient(135deg, ${WASHI} 0%, ${SAKURA_HOT} 50%, ${WASHI} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          vima sees time.
        </h1>
        <p
          style={{
            margin: "26px 0 0",
            maxWidth: "680px",
            color: "rgba(247,236,239,0.68)",
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(0.98rem, 1.2vw, 1.18rem)",
            lineHeight: 1.55,
            letterSpacing: "0.005em",
          }}
        >
          Single-frame VLMs classify what is in a frame. They cannot tell you
          what changed across frames. Vima sends a sequence of frames to the
          model in one call and constrains the output: every state-change
          claim must cite two proof frames. Drag the slider below to verify
          any claim against its evidence.
        </p>

        {/* Source badge */}
        {data?.source && (
          <p
            style={{
              margin: "28px 0 0",
              fontSize: "9px",
              letterSpacing: "0.06em",
              color: data.source === "live" ? SAKURA_HOT : TEXT_FAINT,
            }}
          >
            {data.source === "live"
              ? `· live results · ${vima?.n_frames_examined ?? 0} frames examined in ${vima?.elapsed_s?.toFixed(1) ?? "?"}s · ${vima?.model ?? ""}`
              : `· reference results · live run pending · same shape, same scoring, same model`}
          </p>
        )}
      </section>

      {/* ── COMPARISON SLIDER + ACTIVE CLAIM ────────────────────────── */}
      {vima && grounded.length > 0 && activeClaim && (
        <section
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 clamp(20px, 5vw, 48px) clamp(40px, 5vw, 64px)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 1fr)",
            gap: "clamp(24px, 4vw, 56px)",
            alignItems: "start",
          }}
          className="vima-eval-grid"
        >
          <div>
            <ComparisonSlider
              beforeImage={frameUrl(vima.frame_paths[activeClaim.start_frame] ?? "")}
              afterImage={frameUrl(vima.frame_paths[activeClaim.end_frame] ?? "")}
              beforeAlt={`frame ${activeClaim.start_frame} — ${vima.frame_meta[activeClaim.start_frame]?.activity ?? ""}`}
              afterAlt={`frame ${activeClaim.end_frame} — ${vima.frame_meta[activeClaim.end_frame]?.activity ?? ""}`}
              labelText={{
                before: `frame ${activeClaim.start_frame} · t=${(vima.frame_meta[activeClaim.start_frame]?.timestamp_s ?? 0).toFixed(1)}s`,
                after: `frame ${activeClaim.end_frame} · t=${(vima.frame_meta[activeClaim.end_frame]?.timestamp_s ?? 0).toFixed(1)}s`,
              }}
              labelClassName="vima-slider-label"
              dividerColor={SAKURA_HOT}
              handleColor={INK}
              showHandle
              enableInertia
              initialPosition={50}
            />
            <p
              style={{
                margin: "16px 0 0",
                color: TEXT_MUTED,
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              drag the divider to compare proof frames · {activeClaimIdx + 1} of {grounded.length}
            </p>
          </div>

          {/* Active claim card */}
          <div
            style={{
              border: `1px solid ${LINE}`,
              padding: "clamp(20px, 2vw, 28px)",
              background: "linear-gradient(180deg, rgba(247,236,239,0.04), rgba(8,5,3,0.4))",
            }}
          >
            <p
              style={{
                margin: 0,
                color: SEVERITY_COLOR[activeClaim.severity],
                fontSize: "9px",
                letterSpacing: "0.08em",
              }}
            >
              {activeClaim.type} · severity {activeClaim.severity}
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
                lineHeight: 1.18,
                color: WASHI,
                letterSpacing: 0,
              }}
            >
              {activeClaim.description}
            </h2>
            <p
              style={{
                margin: "16px 0 0",
                color: "rgba(247,236,239,0.62)",
                fontFamily: "var(--font-sans)",
                fontSize: "13.5px",
                lineHeight: 1.55,
              }}
            >
              {activeClaim.evidence}
            </p>

            <div
              style={{
                marginTop: "22px",
                paddingTop: "18px",
                borderTop: `1px solid ${LINE}`,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <p style={{ margin: 0, color: TEXT_FAINT, fontSize: "9px", letterSpacing: "0.06em" }}>
                  proof frames
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: WASHI,
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {activeClaim.start_frame} → {activeClaim.end_frame}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, color: TEXT_FAINT, fontSize: "9px", letterSpacing: "0.06em" }}>
                  confidence
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: SAKURA_HOT,
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: `0 0 12px ${SAKURA_HOT}33`,
                  }}
                >
                  {(activeClaim.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ALL CLAIMS LIST ─────────────────────────────────────────── */}
      {vima && grounded.length > 0 && (
        <section
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "clamp(40px, 5vw, 80px) clamp(20px, 5vw, 48px)",
            borderTop: `1px solid ${LINE}`,
          }}
        >
          <p
            style={{
              margin: 0,
              color: TEXT_MUTED,
              fontSize: "10px",
              letterSpacing: "0.05em",
            }}
          >
            all claims · click to inspect
          </p>
          <h2
            style={{
              margin: "14px 0 32px",
              fontFamily: HEADING_FONT,
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            every change has a citation.
          </h2>

          <div
            style={{
              display: "grid",
              gap: "1px",
              background: LINE,
              border: `1px solid ${LINE}`,
            }}
          >
            {grounded.map((c, i) => {
              const active = i === activeClaimIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveClaimIdx(i)}
                  data-active={active ? "true" : "false"}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "auto minmax(120px, 0.8fr) minmax(0, 2fr) auto auto",
                    gap: "clamp(12px, 2vw, 28px)",
                    alignItems: "center",
                    padding: "clamp(14px, 1.4vw, 18px) clamp(14px, 1.6vw, 22px)",
                    background: active ? "rgba(166,77,121,0.10)" : "rgba(8,5,3,0.6)",
                    transition: "background 160ms ease",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      background: SEVERITY_COLOR[c.severity],
                      boxShadow: `0 0 10px ${SEVERITY_COLOR[c.severity]}66`,
                    }}
                    aria-hidden
                  />
                  <span
                    style={{
                      color: TEXT_MUTED,
                      fontSize: "10px",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.type}
                  </span>
                  <span
                    style={{
                      color: WASHI,
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      lineHeight: 1.4,
                    }}
                  >
                    {c.description}
                  </span>
                  <span
                    style={{
                      color: TEXT_MUTED,
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.start_frame} → {c.end_frame}
                  </span>
                  <span
                    style={{
                      color: SAKURA_HOT,
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(c.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Refusals are a positive signal — the model knew when not to
              hallucinate. Surface them so judges see the calibration. */}
          {vima.refusals && vima.refusals.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <p
                style={{
                  margin: 0,
                  color: TEXT_FAINT,
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                }}
              >
                refused · model declined to claim a change between these frames
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
                {vima.refusals.map((r, i) => (
                  <li
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderLeft: `2px solid ${TEXT_FAINT}`,
                      marginBottom: "6px",
                      color: TEXT_MUTED,
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: TEXT_FAINT,
                        fontSize: "10px",
                        marginRight: "10px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {r.between_frames[0]} → {r.between_frames[1]}
                    </span>
                    {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── BASELINE FAILURE PANEL ──────────────────────────────────── */}
      {baseline && (
        <section
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "clamp(40px, 5vw, 80px) clamp(20px, 5vw, 48px)",
            borderTop: `1px solid ${LINE}`,
          }}
        >
          <p
            style={{
              margin: 0,
              color: TEXT_MUTED,
              fontSize: "10px",
              letterSpacing: "0.05em",
            }}
          >
            baseline · single-frame VLM, asked the same question
          </p>
          <h2
            style={{
              margin: "14px 0 14px",
              fontFamily: HEADING_FONT,
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              maxWidth: "780px",
            }}
          >
            why a one-frame-at-a-time model can&apos;t do this.
          </h2>
          <p
            style={{
              margin: "0 0 28px",
              maxWidth: "640px",
              color: "rgba(247,236,239,0.62)",
              fontFamily: "var(--font-sans)",
              fontSize: "14.5px",
              lineHeight: 1.6,
            }}
          >
            We asked the same VLM the same question one frame at a time. It cannot ground a
            change without seeing both frames. Every output is structurally a placeholder.
          </p>

          <div
            style={{
              display: "grid",
              gap: "1px",
              background: LINE,
              border: `1px solid ${LINE}`,
              maxWidth: "920px",
            }}
          >
            {(baseline.per_frame_claims ?? []).map((c) => (
              <div
                key={c.frame}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "20px",
                  alignItems: "baseline",
                  padding: "12px 18px",
                  background: "rgba(8,5,3,0.6)",
                }}
              >
                <span
                  style={{
                    color: TEXT_FAINT,
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  frame {c.frame}
                </span>
                <span
                  style={{
                    color: "rgba(247,236,239,0.72)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13.5px",
                    lineHeight: 1.5,
                  }}
                >
                  {c.claim}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EMPTY / LOADING / ERROR ─────────────────────────────────── */}
      {loading && !data && (
        <section
          style={{
            maxWidth: "920px",
            margin: "0 auto",
            padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 48px)",
            color: TEXT_MUTED,
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          loading temporal results...
        </section>
      )}

      {error && !data && (
        <section
          style={{
            maxWidth: "920px",
            margin: "0 auto",
            padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 48px)",
            border: `1px solid ${RED}`,
            color: RED,
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          could not load eval results: {error}
        </section>
      )}

      {/* ── FOOTER NAV ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 80px) clamp(20px, 5vw, 48px) clamp(80px, 10vw, 140px)",
          borderTop: `1px solid ${LINE}`,
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            margin: 0,
            color: TEXT_FAINT,
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.05em",
            maxWidth: "560px",
          }}
        >
          generated by backend/temporal_v1.py · constrained schema with proof-frame citations and explicit refusal · ontology pinned to nine state-change types
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.05em",
              color: WASHI,
              textDecoration: "none",
              padding: "10px 14px",
              border: `1px solid ${LINE}`,
              background: "rgba(247,236,239,0.04)",
            }}
          >
            ← back to landing
          </Link>
          <Link
            href="/demo"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.05em",
              color: WASHI,
              textDecoration: "none",
              padding: "10px 14px",
              border: `1px solid ${SAKURA}`,
              background: "rgba(166,77,121,0.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            open dashboard <ChevronRight size={12} strokeWidth={1.6} />
          </Link>
        </div>
      </section>
    </main>
  );
}
