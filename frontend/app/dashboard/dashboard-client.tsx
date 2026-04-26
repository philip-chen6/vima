"use client";

// /dashboard — single-shell client that mounts both DemoClient and EvalClient
// and switches between them via ?view=. URL state stays in sync; sidebar
// "view" buttons call setView (not <Link>), so swapping is instant — no
// Next route navigation, no SSR roundtrip, no shell remount.
//
// Trade-off vs separate routes: both client bundles are downloaded together
// when the user lands on /dashboard. That's an extra ~80KB compared to
// loading just one, but it kills the cold-load penalty when judges click
// between demo and eval (the user's "takes so long to load" complaint).

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

type View = "demo" | "eval";
const ALLOWED: View[] = ["demo", "eval"];

// Defer both clients so the initial JS payload is the smaller of the two
// (whichever loads first wins). View switch on the client triggers the
// other chunk's download once.
const DemoClient = dynamic(() => import("../demo/demo-client"), {
  ssr: false,
  loading: () => null,
});
const EvalClient = dynamic(() => import("../eval/eval-client"), {
  ssr: false,
  loading: () => null,
});

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

interface Props {
  initialSummary: Summary | null;
  initialFrames: Frame[] | null;
}

export default function DashboardClient({ initialSummary, initialFrames }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = (searchParams.get("view") as View) || "demo";
  const [view, setView] = useState<View>(ALLOWED.includes(initial) ? initial : "demo");

  // Keep URL in sync without triggering a server roundtrip — replaceState
  // beats router.replace which still kicks an RSC re-render. The sidebar
  // listens for popstate so back/forward also swaps the view in-place.
  const swap = useCallback(
    (next: View) => {
      setView(next);
      const url = new URL(window.location.href);
      url.searchParams.set("view", next);
      window.history.replaceState({}, "", url.toString());
    },
    [],
  );

  // Listen for sidebar tab clicks via a custom event. The shared sidebar
  // dispatches `vima-dashboard-view` with the target view name; we react
  // here without prop-drilling through the page shell.
  useEffect(() => {
    const onSwap = (e: Event) => {
      const ce = e as CustomEvent<{ view: View }>;
      if (ce.detail?.view && ALLOWED.includes(ce.detail.view)) {
        swap(ce.detail.view);
      }
    };
    window.addEventListener("vima-dashboard-view", onSwap);
    // Sync to back/forward navigation that changes ?view=.
    const onPop = () => {
      const v = (new URL(window.location.href).searchParams.get("view") as View) || "demo";
      if (ALLOWED.includes(v)) setView(v);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("vima-dashboard-view", onSwap);
      window.removeEventListener("popstate", onPop);
    };
  }, [swap]);

  // Avoid using router/swap deps to drive remount — both clients stay
  // mounted but only one is visible. This keeps SidebarProvider state
  // (open/closed) when the user toggles between views.
  return (
    <>
      <div style={{ display: view === "demo" ? "contents" : "none" }} aria-hidden={view !== "demo"}>
        <DemoClient initialSummary={initialSummary} initialFrames={initialFrames} />
      </div>
      <div style={{ display: view === "eval" ? "contents" : "none" }} aria-hidden={view !== "eval"}>
        <EvalClient />
      </div>
      {/* Fallback: if router import is unused TS warning */}
      <span style={{ display: "none" }} data-router-loaded={Boolean(router) ? "true" : "false"} />
    </>
  );
}
