# VIMA — Verifiable Intelligence for Navigating and Analyzing Construction Sites

_HackTech 2026 @ Caltech — Ironsite Prize Track_

---

## Tagline

Frontier VLMs can see a construction site. They can't understand it. We built the memory layer that closes the gap.

---

## Inspiration

We took Claude Opus, Gemini 2.5 Pro, and GPT-5 — the best vision-language models on the planet — and pointed them at 21 minutes of real Ironsite bodycam footage from a masonry job site.

They could label objects fine. "Worker." "Scaffold." "Brick wall." But ask a spatial question — *how far is that worker from the unguarded edge? did this wall section change since the last walkthrough pass? what construction progress happened in the last 10 minutes?* — and they fell apart. Hallucinated distances. Invented progress that didn't happen. Confused left and right in egocentric views. Lost track of state between frames that were 30 seconds apart.

The failure isn't perception. It's spatial reasoning over time. VLMs process frames independently. They have no memory of what they just saw, no sense of what changed, no persistent spatial state. On a 20-minute construction walkthrough, that's fatal — you're asking a model with amnesia to track progress on a job site.

We wanted to fix that without fine-tuning a 70B model or inventing new architecture. Just a cheap, deployable layer that gives existing VLMs the temporal context they're missing.

---

## What It Does

VIMA is an event-memory augmented spatial reasoning system for egocentric construction video. It sits between raw bodycam footage and a frontier VLM and makes the VLM measurably better at spatial questions.

**The pipeline:**

1. **Frame extraction** — Sample frames from Ironsite bodycam video at configurable intervals
2. **Embedding + change detection** — Compute frame embeddings, track cosine similarity over time, detect spatial state changes (new object appeared, wall section progressed, area cleared)
3. **Event memory construction** — Build a structured timeline of what changed, when, and where in the worker's egocentric view
4. **VLM augmentation** — When the VLM is asked a spatial question, inject relevant event-memory context: before/after frames, change metadata, temporal anchors

**The result:** On our A/B eval using real Ironsite masonry footage, the event-memory-augmented VLM outperformed the baseline VLM by **+33.2% composite score** (0.600 → 0.792) across 5 spatial question categories — correctly identifying what changed between passes, avoiding hallucinated progress, and grounding distance claims in actual frame evidence instead of guessing.

The demo is a side-by-side: ask the same spatial question with and without event memory. Watch the baseline hallucinate. Watch the augmented version get it right.

---

## How We Built It

**Frame extraction**: FFmpeg-based sampling from Ironsite's egocentric video. Tuned for construction-relevant intervals — frequent enough to catch changes, sparse enough to stay cheap.

**Change detection**: Embedding-based similarity tracking across the frame sequence. We compute cosine similarity between consecutive frames and flag significant drops as candidate change events. Simple, fast, no training required.

**Event memory**: A lightweight temporal store that indexes detected changes with timestamps, before/after frame pairs, and spatial context. This is the "memory" the VLM doesn't have natively.

**VLM spatial judge**: Claude Sonnet 4.6 as the reasoning engine. When augmented with event memory, it receives the question + relevant change context + before/after evidence frames. System prompt encodes spatial reasoning constraints specific to egocentric construction video.

**A/B evaluation**: Same questions, same footage. Condition A: VLM sees frames only. Condition B: VLM sees frames + event memory context. We scored both on spatial accuracy — did the answer match what actually happened in the video?

**Stack**: Python, FastAPI, FFmpeg, Anthropic API, NumPy, uv. No exotic dependencies. Runs on a laptop.

---

## Challenges

**Messy egocentric video is genuinely hard.** Ironsite footage is shaky, repetitive, full of partial views and random head movements. The same wall appears from 15 different angles across a 20-minute clip. Frame-level similarity is noisy. Tuning the change detection threshold was the biggest time sink of the hackathon.

**No ground truth spatial labels exist.** There's no dataset of "correct spatial answers for construction walkthrough questions." We had to construct our own eval — watch the footage ourselves, write questions with known answers, then score model outputs against them. Manual, slow, but honest.

**VLMs are inconsistent on spatial tasks.** Ask the same distance question three times, get three different answers. The variance on spatial claims is much higher than on object identification. Event memory reduces this variance by anchoring the model's reasoning to concrete evidence, but doesn't eliminate it.

**Egocentric ≠ allocentric.** Models trained on third-person images struggle with first-person spatial reasoning. "To the left" means something different when the camera is the worker's head. We had to explicitly encode egocentric spatial conventions in the prompt.

---

## What We Learned

**Temporal context is the missing piece for spatial reasoning on construction sites.** The models aren't dumb — they're amnesiac. Give them memory of what they just saw and they get dramatically better at spatial questions. The capability is latent; the context is what's missing.

**You don't need to fine-tune to improve spatial reasoning.** A lightweight retrieval layer — embeddings, similarity search, structured event context — meaningfully moves the needle. This is deployable today, not a research project for next quarter.

**The failure mode matters more than the success mode.** Ironsite doesn't need a model that's right 95% of the time on object detection. They need a model that doesn't hallucinate progress that didn't happen. False positives on spatial change are worse than missed detections. Event memory primarily reduces hallucination — which is exactly the high-value fix.

**Egocentric video is an underexplored modality.** Most VLM benchmarks are third-person, static, clean. Construction bodycam footage breaks assumptions that work fine on ImageNet. There's real research surface area here, and real commercial need.

---

## What's Next

1. **Integrate with Ironsite's pipeline** — VIMA's event-memory layer is designed to slot into the egocentric-video-to-intelligence pipeline Ironsite already runs. No new hardware, no new capture process. Just better spatial answers from the footage they're already collecting.

2. **Multi-visit change tracking** — The current system detects changes within a single walkthrough. The next step is tracking changes across visits — what's different about this area compared to yesterday's footage? That's the real unlock for construction progress monitoring.

3. **Spatial VLM fine-tuning with verified signals** — The event memory layer generates paired examples (question + correct spatial answer + evidence frames) that can serve as training data. These are verifiable without human labels — the change either happened or it didn't. Natural fit for GRPO-style reward-driven fine-tuning.

4. **Edge deployment** — Move frame embedding and change detection onto the hardhat hardware for real-time event flagging during the walkthrough, not just post-hoc analysis.

---

## Built With

`python` `fastapi` `anthropic` `claude-sonnet-4-6` `numpy` `ffmpeg` `uv`

---

## Links
- GitHub: https://github.com/philip-chen6/vima
- Demo Video: [TO BE ADDED]
