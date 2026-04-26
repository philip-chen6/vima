"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { LayoutDashboard } from "lucide-react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import Logo from "@/components/phosphor/logo";
import { useCurtainNavigate } from "@/components/landing/page-curtain";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger, ScrollToPlugin);

const PROGRAMMATIC_SCROLL_START = "vima-programmatic-scroll:start";
const PROGRAMMATIC_SCROLL_END = "vima-programmatic-scroll:end";
const NAV_SCROLL_DURATION = 1.28;
const NAV_SCROLL_EASE = "power2.inOut";
const NAV_SCROLL_OFFSET = 92;

function dispatchProgrammaticScroll(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

type SectionNavLink = {
  label: string;
  href: string;
  sectionId: string;
  detail: string;
  panel: string;
  items: Array<{
    title: string;
    description: string;
    href: string;
  }>;
};

const sectionLinks: SectionNavLink[] = [
  {
    label: "proof",
    href: "#evidence",
    sectionId: "evidence",
    detail: "frame to claim",
    panel: "every spatial claim has an evidence window. inspect the frames the model saw before it made the call.",
    items: [
      { title: "evidence chain", description: "scene to timestamped spatial claim", href: "#evidence" },
      { title: "confidence stream", description: "mean confidence 0.939 across 30 frames", href: "#evidence" },
      { title: "claim taxonomy", description: "object · action · state · progress", href: "#claims" },
    ],
  },
  {
    label: "ledger",
    href: "#ledger",
    sectionId: "ledger",
    detail: "settlement receipt",
    panel: "follow every claim into the audit table — frame, label, confidence, weight, status.",
    items: [
      { title: "frame ledger", description: "timestamp, label, zone, claim", href: "#ledger" },
      { title: "settlement gate", description: "scoring rules for verified work", href: "#ledger" },
      { title: "audit trail", description: "human-readable proof rows", href: "#ledger" },
    ],
  },
  {
    label: "verify",
    href: "#verify",
    sectionId: "verify",
    detail: "the human side",
    panel: "swipe-deck on iOS. confirm or reject in seconds. earn XP, hit lottery spins, get paid in SOL.",
    items: [
      { title: "swipe deck", description: "right confirm · left reject · up skip", href: "#verify" },
      { title: "xp + streaks", description: "15 XP per claim, bonus at 10 + 25", href: "#verify" },
      { title: "sol payouts", description: "lottery wheel every 25 claims", href: "#verify" },
    ],
  },
  {
    label: "pipeline",
    href: "#pipeline",
    sectionId: "pipeline",
    detail: "scene to settlement",
    panel: "see the pipeline end-to-end: capture, classify, attach evidence, verify, settle.",
    items: [
      { title: "capture", description: "scene becomes a structured claim", href: "#pipeline" },
      { title: "classify", description: "model labels what it saw", href: "#pipeline" },
      { title: "settle", description: "verified claims clear on-chain", href: "#cta" },
    ],
  },
];

function scrollToHash(href: string, onComplete?: () => void) {
  if (!href.startsWith("#")) return false;

  const target = document.querySelector(href);
  if (!target) return false;
  const smoother = ScrollSmoother.get();
  const duration = NAV_SCROLL_DURATION;

  if (smoother) {
    gsap.killTweensOf(smoother);
    const y = gsap.utils.clamp(0, ScrollTrigger.maxScroll(window), smoother.offset(target, `top ${NAV_SCROLL_OFFSET}px`));

    gsap.to(smoother, {
      duration,
      scrollTop: y,
      ease: NAV_SCROLL_EASE,
      overwrite: "auto",
      onComplete,
    });
  } else {
    gsap.to(window, {
      duration,
      scrollTo: {
        y: target,
        offsetY: NAV_SCROLL_OFFSET,
        autoKill: true,
      },
      ease: NAV_SCROLL_EASE,
      onComplete,
    });
  }

  window.history.pushState(null, "", href);
  return true;
}

export default function VimaNavbar() {
  const [activeSection, setActiveSection] = useState("top");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigateWithCurtain = useCurtainNavigate();
  const programmaticScrollRef = useRef(false);
  const programmaticScrollIdRef = useRef(0);
  const programmaticTimerRef = useRef<number | undefined>(undefined);

  const activeDropdownLink = sectionLinks.find((link) => link.label === activeDropdown);
  const syncActiveSection = useCallback((sectionId: string) => {
    document.querySelectorAll<HTMLButtonElement>(".vima-nav-text-link[data-section-id]").forEach((button) => {
      const isActive = button.dataset.sectionId === sectionId;
      button.dataset.active = isActive ? "true" : "false";
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    setActiveSection(sectionId);
  }, []);

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const triggers: ScrollTrigger[] = [];
    const top = document.getElementById("top");

    if (top) {
      triggers.push(
        ScrollTrigger.create({
          trigger: top,
          start: "top top",
          end: "bottom center",
          onEnter: () => {
            if (!programmaticScrollRef.current) syncActiveSection("top");
          },
          onEnterBack: () => {
            if (!programmaticScrollRef.current) syncActiveSection("top");
          },
        }),
      );
    }

    sectionLinks.forEach((link) => {
      const section = document.getElementById(link.sectionId);
      if (!section) return;

      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onEnter: () => {
            if (!programmaticScrollRef.current) syncActiveSection(link.sectionId);
          },
          onEnterBack: () => {
            if (!programmaticScrollRef.current) syncActiveSection(link.sectionId);
          },
        }),
      );
    });

    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);

    return () => {
      window.clearTimeout(refreshTimer);
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [syncActiveSection]);

  const startProgrammaticScroll = (href: string) => {
    if (!href.startsWith("#") || !document.querySelector(href)) return false;

    const scrollId = programmaticScrollIdRef.current + 1;
    programmaticScrollIdRef.current = scrollId;
    programmaticScrollRef.current = true;
    document.documentElement.setAttribute("data-programmatic-scroll", "true");
    dispatchProgrammaticScroll(PROGRAMMATIC_SCROLL_START);

    if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);

    const release = () => {
      if (programmaticScrollIdRef.current !== scrollId) return;
      if (!programmaticScrollRef.current) return;
      programmaticScrollRef.current = false;
      if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = undefined;
      document.documentElement.removeAttribute("data-programmatic-scroll");
      dispatchProgrammaticScroll(PROGRAMMATIC_SCROLL_END);
    };

    programmaticTimerRef.current = window.setTimeout(release, NAV_SCROLL_DURATION * 1000 + 260);
    const started = scrollToHash(href, release);
    if (!started) release();
    return started;
  };

  const goToSection = (link: SectionNavLink) => {
    flushSync(() => syncActiveSection(link.sectionId));
    setActiveDropdown(null);
    startProgrammaticScroll(link.href);
  };

  const goToHash = (href: string) => {
    const section = sectionLinks.find((link) => link.href === href);
    if (section) flushSync(() => syncActiveSection(section.sectionId));
    if (href === "#top") flushSync(() => syncActiveSection("top"));
    return startProgrammaticScroll(href);
  };

  return (
    <>
      <header className="vima-nav" data-gsap-intro="intro-nav">
        <nav
          className="vima-nav-inner"
          aria-label="main navigation"
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className="vima-nav-bar">
            <Link
              href="/"
              className="vima-nav-brand"
              aria-label="vima home"
              data-gsap-intro="intro-nav-brand"
              onClick={(event) => {
                // On the landing page (where #top exists in the DOM), do
                // the smooth GSAP scroll. On any other route (/demo, /eval),
                // let the Link navigate to /. goToHash returns false when
                // the target isn't on the current page so the default href
                // takes over.
                if (typeof window !== "undefined" && document.getElementById("top")) {
                  if (goToHash("#top")) event.preventDefault();
                }
              }}
            >
              <span className="vima-nav-logo" aria-hidden="true">
                <Logo size={22} variant="static" color="#f7ecef" strokeWidth={1.6} />
              </span>
              <span className="vima-nav-wordmark">v i m a.</span>
              <span className="vima-nav-subtitle">spatial intelligence</span>
            </Link>

            <div className="vima-nav-center" role="list" data-gsap-intro="intro-nav-links">
              {sectionLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className="vima-nav-text-link"
                  aria-current={activeSection === link.sectionId ? "page" : undefined}
                  data-active={activeSection === link.sectionId ? "true" : "false"}
                  data-section-id={link.sectionId}
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onFocus={() => setActiveDropdown(link.label)}
                  onClick={() => goToSection(link)}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="vima-nav-actions" data-gsap-intro="intro-nav-actions">
              {/* paper link replaces the "demo" button to give judges a
                  one-click route to the technical method. dashboard is the
                  primary CTA, so it gets the heavier styling. */}
              <Link
                href="/paper.pdf"
                target="_blank"
                rel="noreferrer"
                className="vima-nav-demo"
                onMouseEnter={() => setActiveDropdown(null)}
              >
                paper
              </Link>
              <Link
                href="/demo"
                prefetch
                className="vima-nav-menu"
                onMouseEnter={() => setActiveDropdown(null)}
                onClick={navigateWithCurtain("/demo")}
                aria-label="open dashboard"
              >
                <LayoutDashboard size={15} strokeWidth={1.7} />
                <span>dashboard</span>
              </Link>
            </div>
          </div>

          <AnimatePresence>
            {activeDropdownLink && (
              <motion.div
                key={activeDropdownLink.label}
                className="vima-nav-dropdown"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="vima-nav-dropdown-content">
                  <div className="vima-nav-dropdown-list">
                    {activeDropdownLink.items.map((item, index) => (
                      <motion.a
                        key={item.title}
                        href={item.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.045 }}
                        onClick={(event) => {
                          if (goToHash(item.href)) event.preventDefault();
                          setActiveDropdown(null);
                        }}
                      >
                        <span>{item.title}</span>
                        <span>{item.description}</span>
                      </motion.a>
                    ))}
                  </div>
                  <motion.div
                    className="vima-nav-dropdown-panel"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: 0.08 }}
                  >
                    <span>{activeDropdownLink.detail}</span>
                    <p>{activeDropdownLink.panel}</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

    </>
  );
}
