// /eval — vima sees time
// ---------------------------------------------------------------------------
// Server component shell. The eval page reads /data/episodes.json + the
// masonry-frames manifest directly from /public via the client component;
// no SSR fetch needed since both files are static assets that ship with
// the build. This keeps the page snappy and avoids a backend hop on every
// load.

import { Metadata } from "next";
import EvalClient from "./eval-client";

export const metadata: Metadata = {
  title: "eval · vima sees time",
  description:
    "vima episodic memory: 21 structured episodes from the masonry capture, each with spatial claims (object, location, distance) and confidence. Drag the comparison slider to verify any episode against its bracketing frames.",
};

export default function EvalPage() {
  return <EvalClient />;
}
