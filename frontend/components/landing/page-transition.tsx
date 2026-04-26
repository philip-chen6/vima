"use client";

// PageTransition — fade-in on mount, plus an optional fade-out triggered by
// a custom event before navigating away. Used to bridge / → /dashboard
// (and back) so the route swap doesn't feel like a hard refresh.
//
// Two layers:
//   1) On mount, the wrapper animates from { opacity: 0, y: 12 } to
//      { opacity: 1, y: 0 }. Tiny + fast (320ms) so it doesn't get in the
//      way of judges clicking around.
//   2) For an outbound transition, anywhere in the app can dispatch
//      `vima-page-exit` with `detail: { href }`. We fade the wrapper out
//      and then call router.push(href) on completion. The navbar +
//      hero CTA both wire this up via the usePageExit() hook below.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  children: React.ReactNode;
}

export function PageTransition({ children }: Props) {
  const router = useRouter();
  const [exiting, setExiting] = useState<{ href: string } | null>(null);

  useEffect(() => {
    const onExit = (e: Event) => {
      const ce = e as CustomEvent<{ href: string }>;
      if (!ce.detail?.href || exiting) return;
      setExiting({ href: ce.detail.href });
      // Fallback in case the AnimatePresence onExitComplete never fires
      // (e.g. tab loses focus during the transition). 500ms covers the
      // 320ms exit animation with a safe margin.
      window.setTimeout(() => {
        router.push(ce.detail.href);
      }, 360);
    };
    window.addEventListener("vima-page-exit", onExit);
    return () => window.removeEventListener("vima-page-exit", onExit);
  }, [exiting, router]);

  return (
    <AnimatePresence mode="wait">
      {!exiting && (
        <motion.div
          key="page"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ position: "relative" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook returning a click handler that fires the exit transition before
 * navigating. Use as `onClick={triggerExit("/dashboard")}` on the link
 * itself; pair with `e.preventDefault()` inside the handler.
 */
export function usePageExit() {
  return useCallback((href: string) => (e: React.MouseEvent) => {
    // Modifier-clicks (cmd/ctrl-click) keep default browser behavior so
    // judges can open in a new tab without losing the page.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("vima-page-exit", { detail: { href } }));
  }, []);
}

/**
 * Drop-in <Link> replacement that triggers the exit transition before
 * navigating. Renders as a Next <Link> so prefetching still works; the
 * onClick handler intercepts and fires `vima-page-exit`. Use anywhere a
 * server component needs to link to /dashboard with the transition.
 */
import Link from "next/link";

export function ExitLink({
  href,
  children,
  className,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const exit = usePageExit();
  return (
    <Link href={href} className={className} onClick={exit(href)} {...rest}>
      {children}
    </Link>
  );
}
