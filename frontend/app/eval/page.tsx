// vima eval page — "vima sees time"
// ---------------------------------------------------------------------------
// The artifact behind the Ironsite track's "demo your technique" prompt.
// Single-frame VLMs classify what's IN a frame. They cannot tell you what
// CHANGED across frames. vima-temporal-v1 sends N frames in one call with
// strict structured output: every state-change claim must cite two proof
// frames. Refusals are explicit. This page renders that.
//
// Two modes:
//   - "live"      — temporal_v1.py was run and temporal-results.json exists
//   - "reference" — fallback hand-curated claims grounded in paper data
//
// In either mode the user gets a comparison-slider (drag between any two
// proof frames and see vima's caption explaining what changed) plus a
// scoreboard of all detected state changes.

import { Metadata } from "next";
import EvalClient from "./eval-client";

export const metadata: Metadata = {
  title: "eval · vima sees time",
  description:
    "vima-temporal-v1 detects state changes across construction frames with proof-frame citations. Drag the slider between any two proof frames to verify the model's claim.",
};

async function fetchTemporal() {
  // Server-side fetch: we hit the FastAPI through caddy in prod, dev hits
  // localhost:8765 directly via the next rewrite.
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://vimaspatial.tech";
  try {
    const res = await fetch(`${base}/api/eval`, {
      cache: "no-store",
      // 6s timeout — if the backend is slow we degrade to client-side fetch
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function EvalPage() {
  const initial = await fetchTemporal();
  return <EvalClient initial={initial} />;
}
