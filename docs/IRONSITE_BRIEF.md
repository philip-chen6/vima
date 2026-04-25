# IRONSITE BRIEF -- What They Actually Want

Updated: 2026-04-25

---

## What Ironsite Is

Ironsite is a construction AI startup (backed by 8VC, South Park Commons, New Era Ventures) that equips workers with smart hard hats embedded with cameras. Their platform captures egocentric (first-person) video from job sites and uses computer vision + agentic AI to track productivity, detect safety hazards, and deliver daily reports to project managers.

Key people:
- Max Mona -- Co-Founder, CEO
- Daniele More -- CSO, ex-DeepMind
- Keenan -- ex-superintendent (domain expert)

Their core tech: bodycam-on-hardhat -> egocentric video -> AI analysis -> project manager reports. They already handle the sensing layer. What they need is better AI interpretation of the spatial data.

---

## The Hackathon Challenge (Caltech x Ironsite -- Spatial Intelligence)

Source: https://caltech.ironsite.ai/ and https://hacktech-by-caltech-2026.devpost.com/

### Prize
- Ironsite track: $5,000 / $2,000 / $1,500 (1st/2nd/3rd)
- Devpost also lists "$17,500 in cash" for 1 winner -- this may be a combined/grand prize

### The Three-Part Challenge

1. **PROBLEM DEFINITION**: Identify a spatial task where current AI models FAIL despite humans doing it easily. Demonstrate the failure using provided models (Gemini 2.5 Pro, Claude Opus, GPT-5) on actual images or video.

2. **TECHNICAL SOLUTION**: Build something that improves spatial reasoning -- prompt engineering, fine-tuning, inference optimization, novel architecture, whatever works.

3. **REAL-WORLD APPLICATION**: Show practical impact on an authentic problem. Tangible value even if imperfect.

### What They Provide
- Hours of real, unedited job-site egocentric video (bodycam footage)
- API credits for Gemini 2.5 Pro, Claude Opus, GPT-5
- 36 hours (Apr 24-26)

### Judging
- Experienced founders combining construction expertise, AI research, wearable tech
- Round 1: Science fair-style demo
- Round 2: Presentation for top teams
- Criteria: technical difficulty, creativity, impact, execution

---

## What "Spatial Reasoning" Means in Their Context

Ironsite's framing: "Today's AI can SEE but doesn't COMPREHEND. It recognizes objects but misses the critical spatial relationships that humans understand intuitively."

Concrete examples from their world:
- A VLM can identify "worker" and "scaffold" in a frame but can't tell you the worker is 2 feet from an unguarded edge
- Models can't maintain physical state across long, shaky, repeated construction site visits
- Models can't answer: "did something change between this pass and the last pass of the same area?"
- Models hallucinate spatial relationships -- they guess distances, confuse left/right in egocentric views, and can't track what's behind the camera

The core gap: **egocentric spatial understanding over time** -- not just single-frame object detection, but understanding what's where relative to the worker, what changed since last time, and what that change means for safety/progress.

---

## What Past Winners Built (From Ironsite's Own Hackathons)

1. **Experience Engine** -- turns egocentric video into a "map of muscle memory" for construction. Captures how experienced workers move and make decisions, transforms hidden expertise into teachable insights.

2. **Safety Intelligence Dashboard** -- turns egocentric footage into per-worker safety reports per shift. Auto-detects PPE compliance, flags ergonomic/proximity risks, maps to OSHA standards.

3. **Splatt** -- pushed into full 3D. Built a system that turns first-person construction videos into a navigable 3D model of the jobsite, mapping objects globally, tracking site changes over time, enabling natural-language queries across space.

Pattern: the winners built things that are **forward-deployed for Ironsite** -- tools Ironsite could actually ship to their customers. Not research demos. Practical tools that plug into the egocentric-video-to-intelligence pipeline Ironsite already runs.

---

## What Would Win This Track

Reading between the lines from the challenge description, past winners, and the pivot document:

### The Winning Formula
1. **Show a clear spatial failure** -- take a frontier VLM, feed it Ironsite's actual footage, and demonstrate a specific spatial reasoning failure that matters commercially (not a toy example)
2. **Fix it with a lightweight, deployable layer** -- not a 7B fine-tune. Something that augments existing VLMs. A tool/RAG layer, a temporal memory, a geometric grounding module.
3. **Demo on their data** -- not synthetic. Their actual messy egocentric footage.
4. **Make them want to keep the repo after Sunday** -- the ultimate test. Would Ironsite integrate this into their pipeline?

### The Specific Task That Wins (From Pivot Document)
The corrected direction from the analysis doc:

> **Hardhat Event Memory**: a non-causal egocentric change/event detector for construction progress.

Build a detector that answers:
- Did something construction-relevant change between passes?
- What object/state changed?
- When did the changed state first become visible?
- Was this actual progress or just inspection/pass-by footage?

Then feed the structured event timeline to a VLM as a tool/RAG layer and **measure whether QA improves**.

The demo: VLM-only gets the answer wrong (hallucinates progress, misses a change). Timeline-augmented VLM gets it right. A/B comparison. Concrete. Defensible.

---

## How VINNA Currently Aligns -- And Where It Needs To Pivot

### What VINNA Is Right Now
- OSHA safety judge: frame + geometry -> Claude Sonnet -> structured violation JSON
- CII classifier: Gemini Flash -> P/C/NC per frame
- Solana raffle: wrench-time % -> raffle tickets -> USDC payout
- Research paper: spatial reward signals for GRPO fine-tuning

### Where VINNA Aligns Well
- Safety violations ARE a spatial reasoning failure mode (model must understand "worker is X meters from unguarded edge")
- CII classification IS a spatial task (distinguishing productive work from idle requires understanding spatial context)
- The judge architecture (frame + geometry stats -> structured output) is the right shape
- OSHA grounding is verifiable and commercially valuable

### Where VINNA Misses The Challenge

**The challenge asks you to FIND where spatial reasoning fails and FIX it.**

VINNA currently:
- Uses Claude as a judge but doesn't demonstrate WHERE Claude fails spatially
- Doesn't show a before/after comparison (model-only vs model-augmented)
- Doesn't address temporal/change detection (the #1 thing Ironsite cares about)
- The Solana raffle is clever but orthogonal to spatial reasoning
- The paper is impressive but judges want a working demo, not theory

### The Pivot That Wins

Keep the OSHA judge. Kill the raffle for the Ironsite pitch. Add:

1. **Spatial failure demonstration**: Run Claude/Gemini/GPT on Ironsite frames, collect the spatial claims, show where they're wrong (wrong distances, missed objects, hallucinated relationships). This is Part 1 of the challenge.

2. **Event memory layer**: Cache frame embeddings (Gemini Embedding 2 or CLIP/SigLIP), compute cosine similarity timeline, detect state changes. When the VLM is asked "what changed?", feed it the before/after frames + change metadata instead of making it reason from scratch. This is Part 2.

3. **A/B eval on their footage**: VLM-only vs VLM+event-memory on 5-10 questions about the masonry footage. Show measurable improvement. This is Part 3.

The demo script: "Here's what Claude says when you ask about progress on this site. It hallucinated that rebar was installed -- look, it wasn't. Here's what Claude says when we give it our event timeline first. It correctly identifies no rebar change. Our event-memory layer costs 0.02 cents per frame and runs in 60 seconds on a 20-minute clip."

### What To Keep For YC Track
The Solana raffle, the OSHA reward function theory, the research paper -- all good for the YC x HackTech pitch about "Opal expanding into construction." But for the Ironsite judges specifically, lead with the spatial reasoning failure + fix.

---

## Questions To Ask Ironsite RIGHT NOW

1. What are the 3 most commercially valuable progress events to detect?
2. Do they have any labeled data, even weak labels?
3. Is there IMU/camera pose data or only RGB video in the Drive folder?
4. What does Keenan consider "obvious progress" when watching footage?
5. What would make them want to keep the repo after Sunday?
6. Can real frames be shown in the demo?
7. Are timestamps, project IDs, or daily reports available alongside the video?

---

## TL;DR -- The One-Sentence Pivot

Stop pitching "safety compliance AI with a crypto payout" and start pitching "we found where frontier VLMs fail on your footage and built a cheap event-memory layer that fixes it -- here's the measurable improvement on your actual data."

That's forward-deployed. That's what they want. That's what wins.
