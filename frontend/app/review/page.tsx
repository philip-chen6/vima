import { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ReviewClient from "./review-client";

export const metadata: Metadata = {
  title: "review · vima",
  description:
    "vima review queue — inspect generated construction claims, verify evidence, and build an auditable ledger.",
};

async function readPublicJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const file = await readFile(path.join(process.cwd(), "public", relativePath), "utf8");
    return JSON.parse(file) as T;
  } catch {
    return fallback;
  }
}

type SpatialClaim = {
  object: string;
  location: string;
  distance_m: number | null;
};

type Episode = {
  episode: number;
  frames: string[];
  ts_start: number;
  ts_end: number;
  confidence: number;
  summary: string;
  spatial_claims: SpatialClaim[];
};

type FrameManifest = {
  filename: string;
  timestamp_s: number;
};

export default async function ReviewPage() {
  const [episodes, manifest] = await Promise.all([
    readPublicJson<Episode[]>("data/episodes.json", []),
    readPublicJson<FrameManifest[]>("masonry-frames-raw/manifest.json", []),
  ]);
  const usableEpisodes = episodes.filter((episode) => episode.summary && episode.spatial_claims?.length);

  return <ReviewClient initialEpisodes={usableEpisodes} initialManifest={manifest} />;
}
