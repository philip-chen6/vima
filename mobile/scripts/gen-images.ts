/**
 * Generate hero imagery via OpenAI gpt-image-2.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... bun run scripts/gen-images.ts
 *   OPENAI_API_KEY=sk-... bun run scripts/gen-images.ts --only=levelup
 *   OPENAI_API_KEY=sk-... bun run scripts/gen-images.ts --only=prizes --quality=medium
 *
 * Outputs:
 *   public/levelup/0.png … public/levelup/N.png
 *   public/prizes/{common,uncommon,rare,epic,legendary}.png
 *
 * All images share a strict palette spec so they layer cleanly on the dark UI.
 */

import OpenAI from "openai";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..");
const PALETTE_SPEC =
  "solid #0a0a0a background, soft luminous pink palette only (#ffb8c8, #ff7090, #ffd1de, #ffe4ec), high-fidelity photographic render, no text, no logo, no watermark, centered subject with negative space, premium aesthetic, NOT cartoon, NOT illustration";

type Job = { path: string; prompt: string; size: "1024x1024" | "1024x1792" };

const LEVELUP_JOBS: Job[] = [
  {
    path: "public/levelup/0.png",
    size: "1024x1024",
    prompt: `Suspended sakura petals frozen mid-fall, soft volumetric pink light from upper-left, shallow depth of field, painterly bokeh, dramatic negative space at center for UI overlay. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/levelup/1.png",
    size: "1024x1024",
    prompt: `Single luminous pink orb with subsurface scattering, faint atmospheric haze, macro lens, perfectly centered, large negative space surrounding it. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/levelup/2.png",
    size: "1024x1024",
    prompt: `Slow-motion silk ribbon unfurling in zero gravity, captured at 1/8000s, faint pink rim light, dramatic dynamic composition. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/levelup/3.png",
    size: "1024x1024",
    prompt: `Dispersing micro-particles forming a soft radial burst from center, long-exposure pink light trails, cinematic, subtle motion blur. ${PALETTE_SPEC}.`,
  },
];

const PRIZE_JOBS: Job[] = [
  {
    path: "public/prizes/common.png",
    size: "1024x1024",
    prompt: `A single soft pink stardust particle suspended in dark void, gentle glow, minimal composition. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/prizes/uncommon.png",
    size: "1024x1024",
    prompt: `Three small floating pink crystalline shards arranged loosely, soft prism refractions. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/prizes/rare.png",
    size: "1024x1024",
    prompt: `A pink luminous flower bud half-bloomed, dewy detail, macro photography, soft side light. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/prizes/epic.png",
    size: "1024x1024",
    prompt: `A pink crystal geode interior catching light, faceted surfaces, subtle pink-white sparkles, premium product shot. ${PALETTE_SPEC}.`,
  },
  {
    path: "public/prizes/legendary.png",
    size: "1024x1024",
    prompt: `A radiant golden-pink phoenix feather suspended in dark space, fine barbs catching warm light, ethereal glow surrounding it, museum-quality detail. solid #0a0a0a background, palette of warm gold (#ffe9b3, #ffd166) blending into pink (#ffb8c8, #ff7090), no text, no logo, premium aesthetic.`,
  },
];

async function generateOne(client: OpenAI, job: Job, quality: "low" | "medium" | "high") {
  console.log(`→ ${job.path} (quality=${quality}, size=${job.size})`);
  const start = Date.now();

  const res = await client.images.generate({
    model: "gpt-image-2",
    prompt: job.prompt,
    size: job.size,
    quality,
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${job.path}`);

  const out = join(ROOT, job.path);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(b64, "base64"));
  console.log(`  ✓ ${(Date.now() - start) / 1000}s`);
}

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("OPENAI_API_KEY not set. Aborting.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith("--only="))?.split("=")[1];
  const qualityArg = (args.find((a) => a.startsWith("--quality="))?.split("=")[1] ?? "high") as
    | "low"
    | "medium"
    | "high";

  let jobs: Job[] = [];
  if (!onlyArg || onlyArg === "all") jobs = [...LEVELUP_JOBS, ...PRIZE_JOBS];
  else if (onlyArg === "levelup") jobs = LEVELUP_JOBS;
  else if (onlyArg === "prizes") jobs = PRIZE_JOBS;
  else {
    console.error(`Unknown --only value: ${onlyArg}. Use levelup | prizes | all.`);
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: key });

  console.log(`generating ${jobs.length} images at quality=${qualityArg}…`);
  // serial — tier-1 rate limit is 5/min
  for (const job of jobs) {
    try {
      await generateOne(client, job, qualityArg);
    } catch (e) {
      console.error(`  ✗ failed: ${(e as Error).message}`);
    }
  }
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
