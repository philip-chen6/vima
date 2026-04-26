// vima dashboard — the live workspace
// ---------------------------------------------------------------------------
// First principles: judges came here to see vima OPERATING, not to read prose
// about it. The page is a workspace, not a pitch deck.
//
// Three things only:
//   1) live status strip   — pulled from /api/cii/summary (real numbers, not
//                            hardcoded prose)
//   2) live frame analyzer — drop any frame, watch claude vision return a
//                            structured spatial claim in seconds
//   3) live frame ledger   — the actual evidence rows from /api/cii/frames,
//                            paginated, with a link to /eval for the
//                            temporal-reasoning page
//
// Removed (relative to the previous version): the topographic three.js shader
// (decoration only), the clockwork loader (the landing already has one), four
// parallel card grids that all said the same thing (systemSteps /
// failureExamples / proofCards / metricCards-as-prose), and the hero "map the
// work before you pay it." headline (the landing pitches; this page operates).

import { Metadata } from "next";
import DemoClient from "./demo-client";

export const metadata: Metadata = {
  title: "dashboard · vima",
  description:
    "vima dashboard — live spatial-claim workspace. drop a frame, see a structured claim back, browse the evidence ledger.",
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

export default async function DemoPage() {
  const [summary, frames] = await Promise.all([fetchSummary(), fetchFrames()]);
  return <DemoClient initialSummary={summary} initialFrames={frames} />;
}
