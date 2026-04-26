import Link from "next/link";
import { ArrowDown, Code2, FileText, Trophy } from "lucide-react";
import HeroShader from "@/components/HeroShader";
import YozakuraBackground from "@/components/YozakuraBackground";
import HexCta from "@/components/landing/hex-cta";
import EvidenceImageTabs from "@/components/landing/evidence-image-tabs";
import FooterBounce from "@/components/landing/footer-bounce";
import VimaNavbar from "@/components/landing/vima-navbar";
import ScrollMotion from "@/components/landing/scroll-motion";
import VimaLoader from "@/components/landing/vima-loader";
import PipelineStepper from "@/components/landing/pipeline-stepper";
import GradientText from "@/components/react-bits/gradient-text";
import SimpleGraph from "@/components/react-bits/simple-graph";
import Logo from "@/components/phosphor/logo";
import Device from "@/components/react-bits/device";
import { Showcase2 } from "@/components/blocks/showcase-2";
import { Features3 } from "@/components/blocks/features-3";
import { absoluteUrl, siteConfig } from "@/lib/seo";

const INK = "#080503";
const WASHI = "#f7ecef";
const TEXT_SECONDARY = "rgba(247,236,239,0.68)";
const TEXT_MUTED = "rgba(247,236,239,0.46)";
const TEXT_FAINT = "rgba(247,236,239,0.34)";
const LINE = "rgba(242,167,184,0.18)";
const SAKURA_HOT = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";
const HEADING_FONT = '"Times New Roman", Times, serif';
const HEADING_GRADIENT = ["#f7ecef", "#f2a7b8", "#f7ecef"];

// Sourced directly from backend/cii-results.json. Every row below is a
// real frame the model classified — labels, timestamps, confidences, and
// activities are not edited. The 4 rows below are picks at i=0, 10, 24, 29
// in the 30-frame run (so they span the full 0–60s timeline including
// the one NC frame the run actually emitted).
const ledgerReceipts = [
  {
    id: "f-000",
    time: "0.0s",
    label: "P",
    claim: "laying concrete blocks",
    zone: "frame_000",
    confidence: "0.95",
    status: "settles",
    weight: "1.00x",
  },
  {
    id: "f-010",
    time: "20.7s",
    label: "P",
    claim: "laying concrete on site",
    zone: "frame_010",
    confidence: "0.95",
    status: "settles",
    weight: "1.00x",
  },
  {
    id: "f-024",
    time: "49.7s",
    label: "NC",
    claim: "no workers visible",
    zone: "frame_024",
    confidence: "0.99",
    status: "blocked",
    weight: "0.00x",
  },
  {
    id: "f-029",
    time: "60.0s",
    label: "P",
    claim: "laying concrete blocks",
    zone: "frame_029",
    confidence: "0.95",
    status: "settles",
    weight: "1.00x",
  },
];

const ledgerMath = [
  ["eligible frames", "26 / 30"],
  ["wrench time", "86.7%"],
  ["reward weight", "0.867"],
  ["audit hash", "6d08...e811d"],
];

// Stats sourced from real artifacts: 30 frames + 86.7% wrench time +
// 0.939 mean confidence are direct from cii-results.json. Depth-drop rate
// is from the live depth-filter-log.json — 39 of 59 pairs (66%) on this
// run. Paper headline number was 57% on a different run; we show the live
// run so judges can verify against /data/depth-filter-log.json.
const stats = [
  ["sampled frames", "30"],
  ["wrench time", "86.7%"],
  ["mean P-confidence", "0.939"],
  ["depth-drop rate", "66%"],
];

const confidenceSeries = ledgerReceipts.map((frame) => ({
  label: `${frame.id} · ${frame.label}`,
  value: Number(frame.confidence),
}));

const footerLinks = [
  { label: "devpost", href: "https://devpost.com/software/vima", icon: Trophy, external: true },
  { label: "source", href: "https://github.com/philip-chen6/vima", icon: Code2, external: true },
  { label: "paper", href: "/paper.pdf", icon: FileText, external: false },
] as const;

const agentCommands = [
  {
    label: "mcp endpoint",
    command: "https://vimaspatial.tech/mcp",
  },
  {
    label: "install + health",
    command:
      'uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima doctor',
  },
  {
    label: "sample frame",
    command:
      'uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima analyze --sample masonry-p --json',
  },
  {
    label: "agent skill",
    command:
      'uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima skill print --agent codex',
  },
] as const;

const builders = [
  { name: "joshua", handle: "qtzx06", href: "https://github.com/qtzx06", role: "cii classifier" },
  { name: "philip", handle: "philip-chen6", href: "https://github.com/philip-chen6", role: "settlement" },
  { name: "lucas", handle: "lucas-309", href: "https://github.com/lucas-309", role: "remote build" },
  { name: "stephen", handle: "stephenhungg", href: "https://github.com/stephenhungg", role: "frontend" },
] as const;

function labelColor(label: string) {
  if (label === "P") return SAKURA_HOT;
  if (label === "C") return LANTERN;
  return RED;
}

function GithubMark({ size = 14, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 19c-4 1.2-4-2-5.6-2.4" />
      <path d="M15 22v-3.5c0-1 .1-1.4-.5-2 2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.3 4.4 4.4 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0c-2.4-1.6-3.4-1.3-3.4-1.3a4.4 4.4 0 0 0-.1 3.3 4.7 4.7 0 0 0-1.3 3.3c0 4.7 2.8 5.7 5.5 6-.6.6-.6 1.2-.5 2V22" />
    </svg>
  );
}

const sectionStyle = {
  position: "relative" as const,
  zIndex: 3,
  isolation: "isolate" as const,
  overflow: "hidden",
  maxWidth: "1400px",
  margin: "0 auto",
  // No min-height: 100dvh on non-hero sections — sections size to content +
  // padding. Hero is the only viewport-locked section (handled separately).
  padding: "clamp(96px, 12vw, 160px) clamp(20px, 5vw, 48px)",
  scrollMarginTop: "0",
  display: "flex",
  flexDirection: "column" as const,
  // No justify-content: center — content flows top-down so each section reads
  // as a discrete band with breathing room set by padding, not phantom void.
};

function SectionDivider({ id, label, index }: { id: string; label: string; index: string }) {
  return (
    <div
      data-gsap="section-divider"
      style={{
        position: "relative",
        zIndex: 3,
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "0 clamp(20px, 5vw, 48px)",
      }}
    >
      <a
        href={`#${id}`}
        aria-label={`jump to ${label} section ${index}`}
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: "38px",
          textDecoration: "none",
        }}
      >
        <span
          aria-hidden
          style={{
            height: "2px",
            width: "100%",
            background:
              "linear-gradient(90deg, rgba(242,167,184,0.08), rgba(242,167,184,0.62) 18%, rgba(166,77,121,0.34) 52%, rgba(242,167,184,0.18) 78%, transparent)",
            boxShadow: "0 0 18px rgba(242,167,184,0.16)",
          }}
        />
      </a>
    </div>
  );
}

function SectionAtmosphere({
  src,
  position = "center",
  opacity = 0.34,
}: {
  src: string;
  position?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: "clamp(20px, 4vw, 52px) calc(clamp(20px, 5vw, 48px) * -1)",
        zIndex: -1,
        pointerEvents: "none",
        backgroundImage: `linear-gradient(90deg, rgba(8,5,3,0.96), rgba(8,5,3,0.44) 44%, rgba(8,5,3,0.92)), linear-gradient(180deg, rgba(8,5,3,0.82), rgba(8,5,3,0.12) 44%, rgba(8,5,3,0.9)), url('${src}')`,
        backgroundSize: "auto, auto, cover",
        backgroundPosition: `center, center, ${position}`,
        backgroundRepeat: "no-repeat",
        opacity,
        filter: "saturate(0.94) contrast(1.06)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 58% 42%, #000 0%, rgba(0,0,0,0.82) 28%, rgba(0,0,0,0.36) 58%, transparent 78%)",
        maskImage:
          "radial-gradient(ellipse at 58% 42%, #000 0%, rgba(0,0,0,0.82) 28%, rgba(0,0,0,0.36) 58%, transparent 78%)",
      }}
    />
  );
}

function VimaFooter() {
  return (
    <footer
      id="footer"
      data-scroll-section
      style={{
        position: "relative",
        zIndex: 3,
        overflow: "hidden",
        minHeight: "clamp(520px, 66dvh, 720px)",
        color: WASHI,
        background: INK,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: "clamp(190px, 26vw, 340px)",
          overflow: "hidden",
          filter: "saturate(0.9)",
        }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/footer-yozakura-construction.png"
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 42%",
          }}
        >
          <source src="/footer-yozakura-construction.mp4" type="video/mp4" />
        </video>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,5,3,0.1), rgba(8,5,3,0.8))",
          }}
        />
      </div>
      <FooterBounce />

      <div
        style={{
          position: "relative",
          minHeight: "clamp(520px, 66dvh, 720px)",
          display: "grid",
          alignItems: "end",
          paddingTop: "clamp(152px, 22vw, 286px)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "clamp(140px, 21vw, 268px)",
            height: "64px",
            background:
              "linear-gradient(180deg, transparent, rgba(8,5,3,0.98) 62%), radial-gradient(ellipse at 50% 0%, rgba(242,167,184,0.16), transparent 60%)",
          }}
        />

        <div
          data-gsap="footer-panel"
          style={{
            position: "relative",
            zIndex: 1,
            background: "rgba(8,5,3,0.98)",
            padding: "clamp(34px, 4.6vw, 60px) clamp(20px, 5vw, 48px) clamp(28px, 3.6vw, 44px)",
          }}
        >
          <div
            style={{
              width: "min(1400px, 100%)",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "minmax(280px, 0.88fr) minmax(520px, 1.42fr)",
              alignItems: "start",
              gap: "clamp(30px, 5vw, 76px)",
              textAlign: "left",
            }}
            className="landing-footer-shell"
          >
            <div>
              <h2
                className="landing-footer-wordmark"
                style={{
                  margin: 0,
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: "clamp(3.2rem, 7vw, 6.4rem)",
                  fontWeight: 400,
                  lineHeight: 0.86,
                  letterSpacing: "0.03em",
                  color: "rgba(247,236,239,0.92)",
                }}
              >
                <Logo
                  size={54}
                  variant="static"
                  color={WASHI}
                  strokeWidth={1.45}
                />
                <span>v i m a.</span>
              </h2>
              <p
                style={{
                  margin: "14px 0 0",
                  maxWidth: "360px",
                  color: TEXT_SECONDARY,
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  lineHeight: 1.56,
                  letterSpacing: "0.005em",
                }}
              >
                spatial safety intelligence for construction sites, built from
                bodycam video and kept inspectable down to the frame.
              </p>
            </div>

            <div className="landing-footer-main">
              <nav
                aria-label="hackathon resources"
                style={{
                  display: "grid",
                  gap: "8px",
                }}
                className="landing-footer-links"
              >
                {footerLinks.map((link) => {
                  const { label, href, icon: Icon } = link;
                  const content = (
                    <>
                      <Icon aria-hidden="true" size={16} strokeWidth={1.6} />
                      <span>{label}</span>
                    </>
                  );

                  if ("external" in link && link.external) {
                    return (
                      <a
                        key={label}
                        href={href}
                        className="landing-footer-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={label}
                      href={href}
                      className="landing-footer-link"
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>

              <section
                aria-label="builders"
                className="landing-footer-builders"
              >
                <div className="landing-footer-builders-head">
                  <span>built by</span>
                  <GithubMark size={14} strokeWidth={1.7} />
                </div>
                <div className="landing-footer-builder-grid">
                  {builders.map((builder) => (
                    <a
                      key={builder.handle}
                      className="landing-footer-builder"
                      href={builder.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>
                        <GithubMark size={14} strokeWidth={1.65} />
                        {builder.name}
                      </span>
                      <span>@{builder.handle}</span>
                    </a>
                  ))}
                </div>
              </section>
            </div>

            <div
              style={{
                display: "grid",
                gridColumn: "1 / -1",
                gridTemplateColumns: "minmax(0, 1fr) auto auto",
                alignItems: "center",
                gap: "clamp(14px, 2.4vw, 32px)",
                alignContent: "start",
                marginTop: "clamp(4px, 1vw, 12px)",
                paddingTop: "clamp(18px, 2.4vw, 28px)",
                color: TEXT_FAINT,
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.04em",
              }}
              className="landing-footer-meta"
            >
              <span>HackTech 2026 · Ironsite track</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>30 frames · 118 episodes · 86.7% wrench time</span>
              <span>video intelligence · no lidar</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LandingJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteConfig.name,
        url: absoluteUrl("/"),
        description: siteConfig.description,
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: absoluteUrl("/"),
        image: absoluteUrl(siteConfig.ogImage),
        description: siteConfig.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function LandingBackdrop() {
  return (
    <div
      aria-hidden
      data-landing-backdrop
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: INK,
      }}
    >
      <div
        data-landing-backdrop-stage
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <YozakuraBackground />
      </div>
    </div>
  );
}

export default function VimaLandingPage() {
  return (
    <>
      <LandingJsonLd />
      <LandingBackdrop />
      <VimaLoader />
      <VimaNavbar />
      <ScrollMotion
        style={{
          minHeight: "100dvh",
          background: "transparent",
          color: WASHI,
          fontFamily: "var(--font-mono)",
          position: "relative",
          zIndex: 1,
          overflowX: "hidden",
        }}
      >

      <section
        id="top"
        data-scroll-section
        style={{
          position: "relative",
          zIndex: 3,
          isolation: "isolate",
          overflow: "hidden",
          minHeight: "100dvh",
          padding: "clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px)",
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          aria-hidden
          data-gsap="hero-bg"
          data-gsap-intro="intro-bg"
          style={{
            position: "absolute",
            inset: "0 calc(clamp(20px, 5vw, 48px) * -1)",
            zIndex: -1,
            pointerEvents: "none",
            WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 58%, transparent 100%)",
            maskImage: "linear-gradient(180deg, #000 0%, #000 58%, transparent 100%)",
          }}
        >
          <div
            data-gsap-intro="intro-grid"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(8,5,3,0.12), rgba(8,5,3,0.72) 48%, rgba(8,5,3,0.96)), linear-gradient(90deg, rgba(242,167,184,0.045) 1px, transparent 1px), linear-gradient(0deg, rgba(242,167,184,0.035) 1px, transparent 1px)",
              backgroundSize: "auto, 84px 84px, 84px 84px",
            }}
          />
        </div>

        <div
          data-gsap="hero-eyebrow"
          data-gsap-intro="intro-eyebrow"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: TEXT_MUTED,
            marginBottom: "28px",
          }}
        >
          spatial intelligence · CII ledger · no lidar
        </div>

        <h1 className="landing-hero-logo" data-gsap="hero-logo" style={{ margin: 0, lineHeight: 1 }}>
          <Logo size={200} variant="metallic" wordmark />
        </h1>

        <p
          data-gsap="hero-copy"
          data-gsap-intro="intro-copy-primary"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)",
            fontWeight: 400,
            lineHeight: 1.45,
            color: TEXT_SECONDARY,
            maxWidth: "620px",
            marginTop: "24px",
            letterSpacing: "0.005em",
          }}
        >
          Video intelligence for construction sites. No lidar.
        </p>

        <p
          data-gsap="hero-copy"
          data-gsap-intro="intro-copy-secondary"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(0.95rem, 1.2vw, 1.08rem)",
            fontWeight: 400,
            lineHeight: 1.58,
            color: "rgba(247,236,239,0.56)",
            maxWidth: "640px",
            marginTop: "18px",
            letterSpacing: "0.005em",
          }}
        >
          Hardhat video becomes an inspectable evidence chain. A depth-delta
          pre-pass drops two thirds of low-signal frame pairs, COLMAP registers
          the rest into a sparse cloud, and episodic memory binds events to
          time and frame.
        </p>

        <div
          data-gsap="hero-copy"
          data-gsap-intro="intro-pipeline"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            color: "rgba(247,236,239,0.44)",
            marginTop: "28px",
            maxWidth: "780px",
            lineHeight: 1.9,
          }}
        >
          video → depth-delta filter → MASt3R reconstruction → episodic memory → zone-aware claim
        </div>

        <div
          style={{
            marginTop: "48px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="#evidence"
            data-gsap="hero-cta"
            data-gsap-intro="intro-cta-primary"
            data-gsap-magnetic
            className="hero-cta-button hero-cta-button--primary"
          >
            <span>inspect the proof chain</span>
          </a>
          <Link
            href="/demo"
            data-gsap="hero-cta"
            data-gsap-intro="intro-cta-secondary"
            data-gsap-magnetic
            className="hero-cta-button hero-cta-button--secondary"
          >
            <span>open dashboard</span>
          </Link>
          <Link
            href="/paper.pdf"
            target="_blank"
            rel="noreferrer"
            data-gsap="hero-cta"
            data-gsap-intro="intro-cta-secondary"
            data-gsap-magnetic
            className="hero-cta-button hero-cta-button--secondary"
          >
            <span>read paper</span>
          </Link>
        </div>

        <div
          data-gsap="hero-meta"
          data-gsap-intro="intro-meta"
          style={{
            marginTop: "auto",
            paddingTop: "32px",
            display: "grid",
            justifyItems: "center",
            alignItems: "center",
          }}
        >
          <a
            href="#evidence"
            aria-label="scroll to evidence"
            style={{
              display: "inline-grid",
              justifyItems: "center",
              gap: "9px",
              color: TEXT_MUTED,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textDecoration: "none",
            }}
          >
            <span>scroll</span>
            <ArrowDown size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </section>

      <SectionDivider id="evidence" label="evidence" index="01" />
      <section id="evidence" data-gsap="section" data-scroll-section style={sectionStyle}>
        <SectionAtmosphere src="/vima-loader-signal.png" position="center" opacity={0.4} />
        <div className="landing-pink-streak landing-pink-streak--evidence" aria-hidden="true" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.72fr) minmax(320px, 1.28fr)",
            gap: "18px",
            alignItems: "end",
          }}
          className="landing-split"
        >
          <div>
            <p
              data-gsap="section-kicker"
              style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.05em" }}
            >
              evidence chain · one scroll, one proof path
            </p>
            <h2
              data-gsap="section-title"
              style={{
                margin: "18px 0 0",
                maxWidth: "760px",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(2.1rem, 5.4vw, 5.25rem)",
                fontWeight: 400,
                lineHeight: 0.94,
                letterSpacing: 0,
              }}
            >
              <GradientText colors={HEADING_GRADIENT} animationSpeed={6} direction="diagonal">
                every payout starts as a frame you can inspect.
              </GradientText>
            </h2>
          </div>
          <p
            data-gsap="section-copy"
            style={{
              margin: 0,
              color: TEXT_SECONDARY,
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(0.95rem, 1.2vw, 1.08rem)",
              lineHeight: 1.62,
              letterSpacing: "0.005em",
              maxWidth: "560px",
            }}
          >
            vima turns egocentric video into timestamped work claims, then binds
            those claims to spatial zones before settlement logic sees them.
          </p>
        </div>

        <div
          className="landing-stats"
          style={{
            marginTop: "34px",
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            borderTop: `1px solid ${LINE}`,
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          {stats.map(([label, value]) => (
            <div
              key={label}
              data-gsap="stat-cell"
              data-gsap-active={label === "wrench time" ? "true" : undefined}
              style={{
                minHeight: "100px",
                padding: "14px 12px",
                borderRight: label === "depth-drop rate" ? "0" : `1px solid rgba(242,167,184,0.12)`,
              }}
            >
              <div style={{ color: TEXT_MUTED, fontSize: "9px", letterSpacing: "0.04em" }}>{label}</div>
              <div
                style={{
                  marginTop: "20px",
                  color: label === "wrench time" ? SAKURA_HOT : WASHI,
                  fontSize: "clamp(1.18rem, 2vw, 1.75rem)",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  textShadow: label === "wrench time" ? "0 0 18px rgba(242,167,184,0.18)" : "none",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div
          className="landing-evidence-graph"
          data-gsap="evidence-graph"
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "minmax(190px, 0.34fr) minmax(0, 1fr)",
            alignItems: "center",
            gap: "clamp(18px, 3vw, 34px)",
            borderTop: `1px solid ${LINE}`,
            borderBottom: `1px solid ${LINE}`,
            background:
              "linear-gradient(180deg, rgba(247,236,239,0.025), rgba(8,5,3,0.32))",
            padding: "clamp(14px, 2vw, 22px)",
          }}
        >
          <div
            className="landing-evidence-graph-meta"
            style={{
              minWidth: 0,
              paddingRight: "clamp(4px, 1vw, 14px)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: TEXT_MUTED,
                fontSize: "10px",
                letterSpacing: "0.04em",
              }}
            >
              confidence stream
            </p>
            <strong
              style={{
                display: "block",
                marginTop: "12px",
                color: WASHI,
                fontFamily: "var(--font-semimono)",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              CII frame certainty
            </strong>
            <span
              style={{
                display: "block",
                marginTop: "8px",
                color: TEXT_FAINT,
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                lineHeight: 1.5,
                letterSpacing: "0.005em",
              }}
            >
              sampled receipt confidence before settlement logic sees the claim.
            </span>
          </div>
          <SimpleGraph
            data={confidenceSeries}
            height={150}
            lineColor={SAKURA_HOT}
            dotColor={SAKURA_HOT}
            animationDuration={1.2}
            showGrid
            gridStyle="dotted"
            gridLines="both"
            gridLineThickness={1}
            showDots
            dotSize={5}
            dotHoverGlow
            curved
            gradientFade
            graphLineThickness={2}
            animateOnScroll
            animateOnce
            className="landing-confidence-graph-plot"
          />
        </div>

        <EvidenceImageTabs />

        {/* draggable evidence carousel — real frames vima generated claims from.
            scroll horizontally or grab and drag. each card is one piece of
            evidence behind a spatial claim. */}
        <div style={{ marginTop: "clamp(40px, 5vw, 72px)" }}>
          <Showcase2 />
        </div>

        {/* 4-shapes-of-spatial-truth: the claim taxonomy + frame marquees.
            this is what "evidence" looks like in practice, not a separate
            section — keep it in evidence, but anchor it as #claims so the
            navbar dropdown's "claim taxonomy" item scrolls precisely here
            instead of dumping the user at the section top. */}
        <div id="claims" style={{ marginTop: "clamp(48px, 6vw, 96px)", scrollMarginTop: "92px" }}>
          <Features3 />
        </div>
      </section>

      <SectionDivider id="ledger" label="ledger" index="02" />
      <section
        id="ledger"
        data-gsap="section"
        data-scroll-section
        style={sectionStyle}
      >
        <SectionAtmosphere src="/vima-loader-rebar.png" position="center" opacity={0.36} />
        <div className="landing-pink-streak landing-pink-streak--ledger" aria-hidden="true" />
        <div
          className="landing-ledger"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.82fr) minmax(360px, 1.18fr)",
            gap: "clamp(24px, 4vw, 54px)",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "32px",
            }}
          >
            <div>
              <p data-gsap="section-kicker" style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.05em" }}>
                ledger · settlement receipt
              </p>
              <h2
                data-gsap="section-title"
                style={{
                  margin: "14px 0 0",
                  maxWidth: "680px",
                  color: WASHI,
                  fontFamily: HEADING_FONT,
                  fontSize: "clamp(2rem, 4.9vw, 4.9rem)",
                  fontWeight: 400,
                  lineHeight: 0.97,
                  letterSpacing: 0,
                }}
              >
                this is where a frame becomes inspectable evidence.
              </h2>
              <p
                data-gsap="section-copy"
                style={{
                  margin: "22px 0 0",
                  maxWidth: "520px",
                  color: TEXT_SECONDARY,
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(0.95rem, 1.12vw, 1.05rem)",
                  lineHeight: 1.62,
                  letterSpacing: "0.005em",
                }}
              >
                the ledger is the audit handoff: frame labels stay visible while the payout gate scores
                productive time, blocks idle work, and preserves the receipt.
              </p>
            </div>

            <div className="ledger-math-strip" data-gsap="ledger-panel">
              {ledgerMath.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="ledger-receipt" data-gsap="ledger-panel">
            <div className="ledger-receipt-head">
              <span>frame receipt</span>
              <span>evidence gate · review pending</span>
            </div>

            <div className="ledger-receipt-body">
              {ledgerReceipts.map((frame) => (
                <div
                  key={frame.id}
                  data-gsap="ledger-row"
                  className="ledger-receipt-row"
                  data-state={frame.status}
                >
                  <div className="ledger-row-time">
                    <span>{frame.id}</span>
                    <strong>{frame.time}</strong>
                  </div>
                  <div className="ledger-row-claim">
                    <span style={{ color: labelColor(frame.label) }}>{frame.label}</span>
                    <strong>{frame.claim}</strong>
                    <small>{frame.zone}</small>
                  </div>
                  <div className="ledger-row-proof">
                    <span>confidence</span>
                    <strong>{frame.confidence}</strong>
                  </div>
                  <div className="ledger-row-proof">
                    <span>weight</span>
                    <strong>{frame.weight}</strong>
                  </div>
                  <div className="ledger-row-status">
                    <span>{frame.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="ledger-audit-tail">
              <div>
                <span>receipt hash</span>
                <strong>frames:30 · episodes:118 · evidence:ready</strong>
              </div>
              <div>
                <span>review path</span>
                <strong>open frame trail before review</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider id="verify" label="verify" index="03" />
      <section id="verify" data-gsap="section" data-scroll-section style={sectionStyle}>
        <SectionAtmosphere src="/vima-loader-rebar.png" position="center" opacity={0.28} />
        <div
          className="landing-verify"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "clamp(28px, 5vw, 64px)",
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              data-gsap="section-kicker"
              style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.05em" }}
            >
              verify · human review of episodic memory claims
            </p>
            <h2
              data-gsap="section-title"
              style={{
                margin: "14px 0 0",
                maxWidth: "640px",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(2rem, 4.6vw, 4.4rem)",
                fontWeight: 400,
                lineHeight: 0.97,
                letterSpacing: 0,
              }}
            >
              <GradientText colors={HEADING_GRADIENT} animationSpeed={6.5} direction="diagonal">
                every claim earns its truth.
              </GradientText>
            </h2>
            <p
              data-gsap="section-copy"
              style={{
                margin: "22px 0 0",
                maxWidth: "560px",
                color: TEXT_SECONDARY,
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.95rem, 1.12vw, 1.05rem)",
                lineHeight: 1.62,
                letterSpacing: "0.005em",
              }}
            >
              the shipped ios verifier turns spatial claims into a swipe queue.
              one gesture confirms, rejects, or skips; the session tracks xp,
              streaks, raffle progress, and payout eligibility.
            </p>
            <div
              data-gsap="section-copy"
              style={{
                margin: "28px 0 0",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1px",
                maxWidth: "560px",
                border: `1px solid ${LINE}`,
                background: LINE,
                fontFamily: "var(--font-mono)",
              }}
            >
              {[
                ["swipe", "confirm / reject / skip"],
                ["earn", "xp + raffle progress"],
                ["settle", "sol payout path"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: "16px",
                    minHeight: "82px",
                    background: "rgba(8,5,3,0.78)",
                    display: "grid",
                    alignContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span style={{ color: SAKURA_HOT, fontSize: "10px", letterSpacing: "0.05em" }}>
                    {label}
                  </span>
                  <strong
                    style={{
                      color: WASHI,
                      fontSize: "12px",
                      lineHeight: 1.35,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
          <div
            data-gsap="section-copy"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "560px",
            }}
          >
            <Device
              scale={0.85}
              enableParallax
              enableRotate
              parallaxStrength={12}
              rotateStrength={2.5}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="/mobile-screenshots/phone-flow-screen-poster.jpg"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  background: "#080503",
                }}
              >
                <source src="/mobile-screenshots/phone-flow-screen.mp4" type="video/mp4" />
              </video>
            </Device>
          </div>
        </div>

      </section>

      <SectionDivider id="pipeline" label="pipeline" index="04" />
      <section id="pipeline" data-gsap="section" data-scroll-section style={sectionStyle}>
        <SectionAtmosphere src="/vima-loader-site.png" position="center" opacity={0.32} />
        <div className="landing-pink-streak landing-pink-streak--pipeline" aria-hidden="true" />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p data-gsap="section-kicker" style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.05em" }}>
              pipeline
            </p>
            <h2
              data-gsap="section-title"
              style={{
                margin: "14px 0 0",
                maxWidth: "700px",
                fontFamily: HEADING_FONT,
                fontSize: "clamp(2rem, 4.6vw, 4.6rem)",
                fontWeight: 400,
                lineHeight: 0.96,
                letterSpacing: 0,
              }}
            >
              <GradientText colors={HEADING_GRADIENT} animationSpeed={6.5} direction="diagonal">
                video in. auditable work claims out.
              </GradientText>
            </h2>
          </div>
          <Link
            href="/demo"
            data-gsap-magnetic
            style={{
              color: WASHI,
              textDecoration: "none",
              border: "1px solid rgba(242,167,184,0.36)",
              padding: "11px 14px",
              fontSize: "12px",
              fontWeight: 600,
              background: "rgba(247,236,239,0.055)",
            }}
          >
            open dashboard
          </Link>
        </div>

        <PipelineStepper />

        <div className="landing-agent-handoff">
          <div className="landing-agent-copy">
            <p>agent handoff · hosted api + mcp + cli + skill</p>
            <h3>plug vima into any agent.</h3>
            <span>
              the dashboard is not the only interface. vima now exposes a
              hosted mcp server for claude code, cursor, windsurf, and other
              tool-using agents, plus a thin cli around the same production api
              for stable json, frame analysis, cii receipts, temporal evals,
              and skill handoff prompts.
            </span>
            <div className="landing-agent-links">
              <a href="/api/health">
                <Code2 size={15} strokeWidth={1.7} aria-hidden="true" />
                api health
              </a>
              <a href="/mcp/health">
                <Code2 size={15} strokeWidth={1.7} aria-hidden="true" />
                mcp health
              </a>
              <a href="/api/cii/frames">
                <Code2 size={15} strokeWidth={1.7} aria-hidden="true" />
                frame rows
              </a>
              <a href="https://github.com/philip-chen6/vima/tree/main/packages/vima-mcp" target="_blank" rel="noreferrer">
                <Code2 size={15} strokeWidth={1.7} aria-hidden="true" />
                mcp source
              </a>
              <a href="https://docs.vimaspatial.tech" target="_blank" rel="noreferrer">
                <FileText size={15} strokeWidth={1.7} aria-hidden="true" />
                docs
              </a>
              <a href="/paper.pdf" target="_blank" rel="noreferrer">
                <FileText size={15} strokeWidth={1.7} aria-hidden="true" />
                paper
              </a>
              <a href="https://github.com/philip-chen6/vima/tree/main/packages/vima-agent" target="_blank" rel="noreferrer">
                <Code2 size={15} strokeWidth={1.7} aria-hidden="true" />
                cli source
              </a>
            </div>
          </div>
          <div className="landing-agent-terminal" aria-label="vima agent endpoint and cli commands">
            <div className="landing-agent-terminal-head">
              <span>vima agent surface</span>
              <span>mcp tools + json evidence harness</span>
            </div>
            <div className="landing-agent-command-list">
              {agentCommands.map((item) => (
                <div key={item.label} className="landing-agent-command">
                  <span>{item.label}</span>
                  <code>{item.command}</code>
                </div>
              ))}
            </div>
            <div className="landing-agent-terminal-tail">
              <span>verified against production</span>
              <strong>mcp · health · cii · zones · eval · analyze</strong>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider id="cta" label="settlement" index="05" />
      <section
        id="cta"
        data-gsap="section"
        data-scroll-section
        style={{ ...sectionStyle, paddingBottom: "clamp(72px, 9vw, 124px)" }}
      >
        <SectionAtmosphere src="/vima-loader-site.png" position="center" opacity={0.28} />
        <div
          data-gsap="cta-panel"
          style={{
            position: "relative",
            isolation: "isolate",
            overflow: "hidden",
            minHeight: "clamp(260px, 28vw, 380px)",
            border: `1px solid ${LINE}`,
            padding: "clamp(20px, 4vw, 36px)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "24px",
            alignItems: "center",
            background: "rgba(8,5,3,0.42)",
          }}
          className="landing-final"
        >
          <div className="landing-pink-streak landing-pink-streak--cta" aria-hidden="true" />
          <HeroShader
            speed={1.05}
            style={{
              position: "absolute",
              inset: "-18%",
              zIndex: -3,
              opacity: 0.96,
              filter: "saturate(1.08) hue-rotate(318deg) brightness(1.2) contrast(1.08)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: -2,
              background:
                "radial-gradient(circle at 70% 48%, rgba(242,167,184,0.22), transparent 38%), linear-gradient(90deg, rgba(8,5,3,0.64), rgba(8,5,3,0.22) 48%, rgba(8,5,3,0.48)), linear-gradient(0deg, rgba(242,167,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(242,167,184,0.08) 1px, transparent 1px)",
              backgroundSize: "auto, auto, 42px 42px, 42px 42px",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              data-gsap="section-kicker"
              style={{ margin: 0, color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.04em" }}
            >
              ready for the field
            </p>
            <h2
              data-gsap="section-title"
              style={{
                margin: "10px 0 0",
                color: WASHI,
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.55rem, 3.2vw, 3rem)",
                fontWeight: 400,
                lineHeight: 1.04,
                letterSpacing: 0,
              }}
            >
              <GradientText colors={HEADING_GRADIENT} animationSpeed={7} direction="diagonal">
                turn the demo stream into an auditable evidence chain.
              </GradientText>
            </h2>
          </div>
          <div data-gsap="cta-action">
            <HexCta
              href="/demo"
              label="open dashboard"
              detail="inspect frames, confidence, depth-filter activity, and the COLMAP point cloud"
            />
          </div>
        </div>
      </section>

      <VimaFooter />
      </ScrollMotion>
    </>
  );
}
