"use client";

// WorkspaceSidebar — wraps the shadcn Sidebar primitives with anchor-jump
// behavior for /demo + /eval, plus cross-page links. Theme tokens are
// overridden at the :root level (globals.css --sidebar-*) to match
// Yozakura, so the shadcn Sidebar renders ink + sakura without any
// per-instance className surgery.
//
// Usage:
//   <SidebarProvider defaultOpen={false}>
//     <WorkspaceSidebar sections={...} pages={...} contextLabel="demo" />
//     <main>...</main>
//   </SidebarProvider>

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarSectionIcon } from "@/components/landing/section-svg/sidebar-section-icon";

gsap.registerPlugin(useGSAP);

export interface WorkspaceSection {
  id: string;
  label: string;
  badge?: string;
  icon?: string;
}

export interface WorkspacePage {
  href: string;
  label: string;
  badge?: string;
  icon?: string;
  /** If set AND the user is currently on /dashboard, clicking dispatches a
   *  `vima-dashboard-view` event instead of route-navigating, so the view
   *  swap is instant. Outside /dashboard the regular href click still
   *  navigates (covers the link-from-anywhere case). */
  viewSwap?: "demo" | "eval";
}

export interface WorkspaceRun {
  eyebrow: string;
  title: string;
  meta: string;
  stats?: string[];
}

interface Props {
  sections: WorkspaceSection[];
  pages?: WorkspacePage[];
  contextLabel?: string;
  run?: WorkspaceRun;
}

export function WorkspaceSidebar({ sections, pages = [], contextLabel, run }: Props) {
  const pathname = usePathname();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const animationRootRef = React.useRef<HTMLDivElement>(null);
  const didHydrateAnimationRef = React.useRef(false);
  const { state, isMobile, openMobile } = useSidebar();

  useGSAP(
    () => {
      const root = animationRootRef.current;
      if (!root) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const items = root.querySelectorAll<HTMLElement>(
        ".vima-sidebar-context, .vima-sidebar-group-title, .vima-sidebar-tab",
      );
      gsap.killTweensOf([root, ...items]);

      if (reduceMotion) {
        gsap.set(root, { "--vima-sidebar-scan-y": "132%" });
        gsap.set(items, { x: 0, clearProps: "transform" });
        return;
      }

      if (!didHydrateAnimationRef.current) {
        didHydrateAnimationRef.current = true;
        gsap.set(root, { "--vima-sidebar-scan-y": "132%" });
        gsap.set(items, { x: 0, clearProps: "transform" });
        return;
      }

      const collapsed = !isMobile && state === "collapsed";
      const shouldPlay = isMobile ? openMobile : true;
      if (!shouldPlay) return;

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .fromTo(
          root,
          { "--vima-sidebar-scan-y": "-22%" },
          { "--vima-sidebar-scan-y": "132%", duration: 0.5 },
        )
        .fromTo(
          items,
          { x: collapsed ? -2 : -5 },
          {
            x: 0,
            duration: 0.32,
            stagger: { each: 0.025, from: "start" },
            clearProps: "transform",
          },
          "-=0.42",
        );
    },
    { scope: animationRootRef, dependencies: [state, isMobile, openMobile], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const root = animationRootRef.current;
      if (!root || !activeId) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const activeTab = root.querySelector<HTMLElement>(`.vima-sidebar-tab[href="#${CSS.escape(activeId)}"]`);
      const icon = activeTab?.querySelector<HTMLElement>(".vima-sidebar-tab-icon");
      if (!activeTab) return;

      gsap.killTweensOf([activeTab, icon].filter(Boolean));
      gsap.fromTo(activeTab, { x: -3 }, { x: 0, duration: 0.24, ease: "power2.out", clearProps: "transform" });
      if (icon) {
        gsap.fromTo(
          icon,
          { scale: 0.82, rotation: -6 },
          { scale: 1, rotation: 0, duration: 0.34, ease: "back.out(2)", clearProps: "transform" },
        );
      }
    },
    { scope: animationRootRef, dependencies: [activeId] },
  );

  // Sync active section to scroll. Pick the section whose top is just
  // above the 30% mark — same heuristic the landing-nav uses, scaled.
  React.useEffect(() => {
    if (sections.length === 0) return;
    const onScroll = () => {
      const targetY = window.innerHeight * 0.3;
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - targetY);
        if (rect.top - targetY <= 0 && dist < bestDist) {
          bestDist = dist;
          bestId = s.id;
        }
      }
      // Fall back to first visible if no section is yet above the line.
      if (bestId === null) {
        for (const s of sections) {
          const el = document.getElementById(s.id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top > 0 && rect.top < window.innerHeight) {
            bestId = s.id;
            break;
          }
        }
      }
      setActiveId(bestId);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const handleSectionClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="vima-workspace-sidebar border-r-0"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11.5px",
        letterSpacing: "0.04em",
      }}
    >
      <div ref={animationRootRef} className="vima-sidebar-anim-root">
        <SidebarHeader>
          <div className="vima-sidebar-shellbar">
            <SidebarTrigger className="vima-sidebar-trigger" aria-label="toggle workspace sidebar" />
            <span>workspace</span>
          </div>
          {run ? (
            <div className="vima-sidebar-context">
              <p>{run.eyebrow}</p>
              <strong>{run.title}</strong>
              <span>{run.meta}</span>
              {run.stats && run.stats.length > 0 && (
                <div className="vima-sidebar-context-stats">
                  {run.stats.map((stat) => (
                    <em key={stat}>{stat}</em>
                  ))}
                </div>
              )}
            </div>
          ) : contextLabel && (
            <div className="vima-sidebar-context vima-sidebar-context--simple">
              <p>{contextLabel}</p>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          {sections.length > 0 && (
            <SidebarGroup>
              <div className="vima-sidebar-group-title">views</div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map((s) => {
                    const isActive = activeId === s.id;
                    return (
                      <SidebarMenuItem key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={handleSectionClick(s.id)}
                          aria-current={isActive ? "true" : undefined}
                          className="vima-sidebar-tab"
                          data-active={isActive ? "true" : "false"}
                        >
                          <SidebarSectionIcon id={s.icon ?? s.id} active={isActive} />
                          <span className="vima-sidebar-tab-copy">
                            {s.badge && <span className="vima-sidebar-tab-index">{s.badge}</span>}
                            <span className="vima-sidebar-tab-label">{s.label}</span>
                          </span>
                        </a>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {pages.length > 0 && (
            <SidebarGroup>
              <div className="vima-sidebar-group-title">workspace</div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pages.map((p) => {
                    const onDashboard = pathname === "/dashboard";
                    // Active matches: same path, or if we're on /dashboard
                    // and this entry has a viewSwap that matches the
                    // current ?view= search param.
                    const isActive = onDashboard && p.viewSwap
                      ? typeof window !== "undefined" &&
                        (new URL(window.location.href).searchParams.get("view") || "demo") === p.viewSwap
                      : pathname === p.href;
                    const handleClick = (e: React.MouseEvent) => {
                      if (p.viewSwap && onDashboard) {
                        e.preventDefault();
                        window.dispatchEvent(
                          new CustomEvent("vima-dashboard-view", { detail: { view: p.viewSwap } }),
                        );
                      }
                    };
                    return (
                      <SidebarMenuItem key={p.href}>
                        <Link
                          href={p.href}
                          prefetch
                          aria-current={isActive ? "page" : undefined}
                          onClick={handleClick}
                          className="vima-sidebar-tab vima-sidebar-tab--secondary"
                          data-active={isActive ? "true" : "false"}
                        >
                          <SidebarSectionIcon id={p.icon ?? p.viewSwap ?? (p.href.replace("/", "") || "overview")} active={isActive} />
                          <span className="vima-sidebar-tab-copy">
                            {p.badge && <span className="vima-sidebar-tab-index">{p.badge}</span>}
                            <span className="vima-sidebar-tab-label">{p.label}</span>
                          </span>
                        </Link>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </div>

      <SidebarRail />
    </Sidebar>
  );
}
