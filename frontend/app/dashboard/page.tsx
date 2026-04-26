// /dashboard — single shell for the workspace, view switched via ?view=
// ---------------------------------------------------------------------------
// Replaces the separate /demo + /eval routes so the navbar/sidebar shell
// stays mounted across view swaps. URL stays in sync via search params
// (?view=demo|eval) so links keep working AND the URL is shareable.
//
// /demo and /eval are kept as redirect stubs so existing inbound links
// from the landing, paper, README don't 404.

import { Metadata } from "next";
import { Suspense } from "react";
import DashboardClient from "./dashboard-client";

// dashboard-client uses useSearchParams; force-dynamic skips the static
// prerender pass so the search-params hook reads from a real request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "dashboard · vima",
  description:
    "vima dashboard — live spatial-claim workspace. drop a frame, see a structured claim back, browse the evidence ledger, switch to /eval for temporal reasoning without a page reload.",
};

async function fetchSummary() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://vimaspatial.tech";
  try {
    const res = await fetch(`${base}/api/cii/summary`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchFrames() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://vimaspatial.tech";
  try {
    const res = await fetch(`${base}/api/cii/frames`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const [summary, frames] = await Promise.all([fetchSummary(), fetchFrames()]);
  return (
    <Suspense fallback={null}>
      <DashboardClient initialSummary={summary} initialFrames={frames} />
    </Suspense>
  );
}
