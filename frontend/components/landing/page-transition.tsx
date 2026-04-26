"use client";

// PageTransition — fade-in on mount, plus an optional fade-out triggered
// by a custom event before navigating away.
//
// Critical bug fixed: previously kept an `exiting` state that gated
// children rendering. After router.push the new page mounted but
// `exiting` was still truthy → blank screen. Now we don't gate
// rendering at all; the new route auto-fade-ins via the keyed motion.div
// when `pathname` changes. Outbound transitions use a one-shot opacity
// fade on the wrapper before router.push, no state-blocking unmount.

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "motion/react";

interface Props {
  children: React.ReactNode;
}

export function PageTransition({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onExit = (e: Event) => {
      const ce = e as CustomEvent<{ href: string }>;
      if (!ce.detail?.href) return;
      // Fade the wrapper out via direct style mutation (cheap, no
      // re-render) and then push the route. When the new page mounts,
      // the keyed motion.div below replays the initial fade-in.
      const el = wrapperRef.current;
      if (el) {
        el.style.transition = "opacity 220ms cubic-bezier(0.2,0.8,0.2,1)";
        el.style.opacity = "0";
      }
      window.setTimeout(() => {
        router.push(ce.detail.href);
      }, 200);
    };
    window.addEventListener("vima-page-exit", onExit);
    return () => window.removeEventListener("vima-page-exit", onExit);
  }, [router]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", opacity: 1 }}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </div>
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
