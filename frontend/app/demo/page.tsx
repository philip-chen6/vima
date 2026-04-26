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
  title: "dashboard · v i m a.",
  description:
    "vima dashboard — live spatial-claim workspace. drop a frame, see a structured claim back, browse the evidence ledger.",
};

// SSR fetch was making a public-internet HTTPS round trip from the next
// container to caddy and back to the backend container — adding 6+
// seconds of TTFB on every /demo request. The client already runs the
// same fetches in useEffect(reload) on mount as a fallback when initial*
// are null, so SSR adds nothing but latency. Skipping drops /demo TTFB
// from ~6s to <100ms; the analyzer hydrates client-side in ~40ms.

export default function DemoPage() {
  return <DemoClient initialSummary={null} initialFrames={null} />;
}
