"use client";

// PageCurtain — gsap-driven sakura wipe between routes. Single fixed
// overlay covers the viewport at the navigation midpoint, then retracts
// after the new page mounts. Doesn't touch the page tree, so the
// previous "wrapper went to opacity 0 and never came back" bug is
// impossible by construction.
//
// Wire-up: drop <PageCurtain /> once at the layout root (it self-mounts
// a fixed-position div). Trigger by dispatching the `vima-navigate`
// custom event with `detail.href`, e.g. via the useCurtainNavigate()
// hook below.
//
// Choreography (520ms total):
//   0   → 220ms: sakura wipe in from bottom (skewY 6deg, eased)
//   220 → 260ms: hold full coverage; router.push() fires at 220ms
//   260 → 520ms: wipe out to top (eased) once new page is mounted
//
// We use a `pathname` change in a useEffect to trigger the wipe-out, so
// even if the click handler somehow loses the timing, the route swap
// always cleans the curtain up.

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";

const SAKURA_HOT = "#f2a7b8";
const SAKURA = "#A64D79";
const INK = "#080503";

export function PageCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const curtainRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const animatingRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  // Wipe-out: fired whenever pathname changes. If we just navigated,
  // the curtain is currently covering the viewport at scaleY:1 — pull
  // it back to scaleY:0 from the top edge to reveal the new page.
  useEffect(() => {
    if (lastPathRef.current === null) {
      // First mount — no inbound wipe needed.
      lastPathRef.current = pathname;
      return;
    }
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const el = curtainRef.current;
    if (!el) return;
    // If the curtain wasn't raised by us (e.g. browser back/forward), skip.
    if (!animatingRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false;
      },
    });
    tl.set(el, { transformOrigin: "top center" })
      .to(el, {
        scaleY: 0,
        skewY: -4,
        duration: 0.42,
        ease: "power3.inOut",
      })
      .to(
        wordmarkRef.current,
        { opacity: 0, duration: 0.18, ease: "power2.out" },
        0,
      );
  }, [pathname]);

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const ce = e as CustomEvent<{ href: string }>;
      if (!ce.detail?.href || animatingRef.current) return;
      const href = ce.detail.href;
      const el = curtainRef.current;
      if (!el) {
        router.push(href);
        return;
      }
      animatingRef.current = true;

      // Wipe-in from the bottom edge.
      const tl = gsap.timeline();
      tl.set(el, {
        scaleY: 0,
        skewY: 4,
        transformOrigin: "bottom center",
        opacity: 1,
        pointerEvents: "auto",
      })
        .to(el, {
          scaleY: 1,
          skewY: 0,
          duration: 0.34,
          ease: "power3.inOut",
        })
        .fromTo(
          wordmarkRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" },
          0.18,
        )
        .add(() => {
          router.push(href);
        }, 0.34);
    };
    window.addEventListener("vima-navigate", onNavigate);
    return () => window.removeEventListener("vima-navigate", onNavigate);
  }, [router]);

  return (
    <div
      ref={curtainRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: `linear-gradient(180deg, ${INK} 0%, ${SAKURA} 50%, ${SAKURA_HOT} 100%)`,
        transform: "scaleY(0)",
        transformOrigin: "bottom center",
        opacity: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        willChange: "transform, opacity",
      }}
    >
      <span
        ref={wordmarkRef}
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
          fontWeight: 400,
          color: INK,
          letterSpacing: "0.04em",
          opacity: 0,
        }}
      >
        v i m a.
      </span>
    </div>
  );
}

/**
 * Click handler that fires the curtain navigation. Use as
 * `onClick={navigate("/demo")}` on the link itself; the handler will
 * preventDefault on plain clicks and dispatch `vima-navigate`. Modifier-
 * clicks (cmd/ctrl/shift) keep the default behavior so judges can open
 * routes in a new tab.
 */
export function useCurtainNavigate() {
  const pathname = usePathname();

  return useCallback((href: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (href === pathname) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("vima-navigate", { detail: { href } }));
  }, [pathname]);
}
