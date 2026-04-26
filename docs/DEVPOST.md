# VIMA

_HackTech 2026 @ Caltech — Ironsite Prize Track_

## Tagline

Spatial memory for egocentric construction video.

---

## Inspiration

Frontier VLMs can look at a construction site, but they still struggle to
understand what happened in space over time.

On real hardhat/bodycam-style masonry footage, raw models can usually say
"worker," "scaffold," or "concrete block wall." But when the question requires
temporal memory — was masonry work happening near the wall, what changed between
these frames, where did activity happen on the site — the answers get shaky.

The failure is not just perception. It is spatial reasoning with memory. VIMA
fixes that by building an auditable spatial evidence layer before asking the VLM
to answer.

---

## What It Does

VIMA turns egocentric construction footage into structured spatial memory:

- frame-level CII productivity labels: productive, contributory, non-contributory
- object detections from construction frames
- optional semantic boxes from Gemini Robotics-ER
- merged object boxes
- SAM-style masks
- depth estimates
- spatial zones from COLMAP-style camera pose clustering
- event episodes with timestamps, evidence frames, tracks, depth facts, and retrieval text
- cited answers from retrieved memory

In the hosted demo, VIMA analyzes real masonry footage and exposes the evidence
through a dashboard, API, CLI, and MCP server.

Headline demo results:

- 30 sampled masonry frames
- 26 productive frames
- 4 non-contributory frames
- 86.7% wrench time
- 0.939 mean confidence on productive frames
- 118 temporal episodes in the frontend evidence workspace
- VLM-only spatial score: 0.600
- VLM + memory spatial score: 0.792
- +33.2% improvement across 5 spatial questions

---

## How We Built It

The core idea is evidence first, answer second.

```text
hardhat footage
  -> sampled frames
  -> object boxes
  -> optional Gemini Robotics-ER boxes
  -> box merge
  -> masks
  -> depth
  -> object-event episodic memory
  -> retrieved evidence
  -> cited VLM answer
```

The production-facing system includes a FastAPI evidence API, CII productivity
classification, spatial zone summaries, temporal reasoning evals, a Next.js
frontend, a portable CLI, and a hosted MCP server for agent access.

---

## Challenges

Construction footage is messy as hell. The camera moves constantly, objects are
partially visible, lighting changes, workers block each other, and the same wall
can appear from several angles.

We also had to choose one coherent product story from several working pieces:
CII productivity, spatial zones, temporal memory, masks, depth, agent tooling,
and a Solana reward concept. The final story is narrower and stronger: VIMA
builds spatial memory from hardhat footage, then uses that memory to make
construction video answers auditable.

---

## What We Learned

The biggest lesson is that the model is not always the missing piece. Sometimes
the missing piece is memory.

VLMs are strong at recognizing objects, but construction intelligence needs
temporal state, spatial grounding, and evidence that can be inspected later. A
system that says "this looks like masonry work, and here are the frames that
support that claim" is more useful than a system that confidently invents
progress.

---

## What's Next

- run the robotics box pipeline across more frames
- use registered COLMAP camera poses for production zone attribution
- improve multi-visit change detection across different walkthroughs
- add stronger object tracking over longer videos
- expand the eval set beyond the current 5-question A/B comparison
- connect VIMA to construction workflows for progress tracking, safety review, and productivity reporting

---

## Built With

`python` `fastapi` `next.js` `gemini` `gemini-robotics-er` `claude-sonnet-4-6`
`sam-style-segmentation` `depth-anything` `colmap-style-spatial-zones` `ffmpeg`
`mcp` `uv` `solana-devnet`

---

## Links
- Dashboard: https://vimaspatial.tech/demo
- Temporal eval: https://vimaspatial.tech/eval
- Docs: https://docs.vimaspatial.tech
- GitHub: https://github.com/philip-chen6/vima
