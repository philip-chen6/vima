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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export interface WorkspaceSection {
  id: string;
  label: string;
  badge?: string;
}

export interface WorkspacePage {
  href: string;
  label: string;
  badge?: string;
}

interface Props {
  sections: WorkspaceSection[];
  pages?: WorkspacePage[];
  contextLabel?: string;
}

export function WorkspaceSidebar({ sections, pages = [], contextLabel }: Props) {
  const pathname = usePathname();
  const [activeId, setActiveId] = React.useState<string | null>(null);

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
      className="vima-workspace-sidebar border-r-0 mt-[72px]"
      style={{
        // Top offset: navbar is sticky at top; rail starts under it.
        // Height auto-fills via the Sidebar primitive.
        fontFamily: "var(--font-mono)",
        fontSize: "11.5px",
        letterSpacing: "0.04em",
      }}
    >
      <SidebarHeader>
        {contextLabel && (
          <div
            className="px-2 py-2"
            style={{
              color: "rgba(247,236,239,0.34)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              fontFamily: "var(--font-mono)",
            }}
          >
            {contextLabel}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {sections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel
              style={{
                color: "rgba(247,236,239,0.34)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              sections
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((s) => {
                  const isActive = activeId === s.id;
                  return (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={s.label}
                        style={{
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <a href={`#${s.id}`} onClick={handleSectionClick(s.id)} aria-current={isActive ? "true" : undefined}>
                          {s.badge && (
                            <span
                              style={{
                                color: "rgba(247,236,239,0.34)",
                                fontSize: "9px",
                                fontVariantNumeric: "tabular-nums",
                                marginRight: "4px",
                              }}
                            >
                              {s.badge}
                            </span>
                          )}
                          <span>{s.label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {pages.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel
              style={{
                color: "rgba(247,236,239,0.34)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              pages
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pages.map((p) => {
                  const isActive = pathname === p.href;
                  return (
                    <SidebarMenuItem key={p.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={p.label}
                        style={{
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <Link href={p.href} prefetch aria-current={isActive ? "page" : undefined}>
                          {p.badge && (
                            <span
                              style={{
                                color: "rgba(247,236,239,0.34)",
                                fontSize: "9px",
                                fontVariantNumeric: "tabular-nums",
                                marginRight: "4px",
                              }}
                            >
                              {p.badge}
                            </span>
                          )}
                          <span>{p.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
