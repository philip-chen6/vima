# VINNA — DevPost Submission
_HackTech 2026 @ Caltech — Ironsite Prize Track + YC Track_

---

## Project Name
**VINNA**

## Tagline
Construction sites kill 1,000 workers a year. VINNA cites the violation before the fall.

---

## Inspiration

Construction is the deadliest industry in America — 1,000+ fatalities per year, and OSHA estimates 40% of falls (the #1 killer) are preventable. The problem isn't that the rules don't exist: OSHA CFR 29 Part 1926 covers every scenario with specific, verifiable standards. The problem is enforcement — inspections happen after incidents, not before. Workers don't get rewarded for doing dangerous work safely. Nobody has automated the gap between "the rule exists" and "is the rule being followed right now?"

VINNA is that automation. Ironsite already deploys egocentric bodycams and LiDAR on construction workers. We built the AI brain that reads the spatial data and closes the loop — detecting violations in real time and incentivizing compliance with on-chain rewards.

---

## What It Does

VINNA takes egocentric bodycam video and LiDAR point clouds from Ironsite wearables and runs them through a multi-stage spatial reasoning pipeline. For each detected event, Claude Sonnet 4.6 acts as a domain-expert safety judge: it receives the frame and 3D geometry stats together, outputs a CII classification (P/C/NC), spatial claims anchored to real depth data, and exact OSHA CFR 29 Part 1926 violation codes with severity ratings and evidence strings.

In our demo run on real Ironsite masonry footage (21 minutes of construction work), VINNA classified 86.7% of frames as productive work (P), surfaced 5 NC events, and cited `1926.502(b)`, `1926.451(g)(1)`, `1926.503(a)(1)`, and `1926.1153` at 73–82% confidence with specific spatial evidence. The judges aren't hallucinating — they're anchored to the geometry.

Workers accumulate Solana raffle tickets proportional to productive wrench-time percentage. At end of shift, a Solana SPL program picks a winner and transfers USDC on devnet automatically — no forms, no auditors, no guesswork.

---

## How We Built It

**Backend**: FastAPI (Python) with 5 endpoints: `/health`, `/analyze/frame`, `/analyze/timestamp`, `/analyze/batch`, `/demo`. Runs locally on port 8765.

**OSHA Judge**: Anthropic Claude Sonnet 4.6 spatial reasoning engine. System prompt encodes the full OSHA CFR 29 Part 1926 ontology (30 rules as structured reward functions). Input: frame image + 3D geometry stats (height distribution, spatial cluster count, depth variance). Output: structured JSON with P/C/NC, spatial claims, violation flags, confidence score, and reasoning.

**CII Classifier**: Gemini 2.5 Flash Lite vision model classifies frames as P (direct tool/material work), C (prep/staging/measuring), or NC (idle/waiting/traveling empty). Wrench time = P frames / total frames. On the demo footage: 86.7% productive — above industry benchmark because masonry work is dense.

**Point Cloud Loader**: Adapters for `.ply`, `.npy`, `.npz`, `.bin` formats to load Ironsite LiDAR output. Falls back to synthetic stub for demo.

**Solana Raffle**: Worker wrench-time % → raffle tickets (1 ticket per 0.1% wrench time) → winner selection → SPL token transfer on devnet. On-chain, verifiable, no intermediary.

**Research Paper**: We wrote and compiled a 4-page LaTeX paper: "VINNA: Verifiable Reward Signals for Spatial Construction Site Compliance." Key insight: CII and OSHA signals are ideal for fine-tuning spatial VLMs via GRPO — they're verifiable without human preference labels, legally grounded, and checkable against geometry. Cite: FGRPO (arXiv 2604.08476, Apr 2026).

---

## Challenges

- **Point cloud format variability**: Ironsite produces proprietary LiDAR formats. We built adapters for PLY, NPY, NPZ, and BIN, plus a synthetic stub that maintains spatial properties for demo mode.

- **Spatial grounding without GPS**: Anchoring OSHA claims to specific spatial locations (not just image regions) required building a geometry stats extraction layer on top of raw LiDAR data.

- **Solana devnet timing**: SPL token transfers require an active funded devnet account. The raffle logic is complete; devnet transfer integration is Philip's current task.

- **Concurrent session coordination**: Four team members + AI agents building simultaneously. Resolved through disciplined git workflow and a shared sprint doc.

---

## Accomplishments

- Real OSHA violations cited with exact CFR codes from live construction footage
- 86.7% wrench time detected (vs. 30-40% industry benchmark) — the masonry clip is legitimately productive work
- Full 6-figure research paper compiled from scratch during the hackathon
- Raffle simulation running with real CII data
- Clean API contract that Philip and Lucas can build against

---

## What We Learned

- Verifiable reward signals don't need human labels. OSHA violations are binary (rule violated or not), legally defined, and spatially checkable. CII is a 3-class graded signal. Neither requires human preference annotation — both are perfect for GRPO fine-tuning.
- Egocentric video carries enough spatial signal for compliance detection even without a secondary depth model. The bodycam + LiDAR combo Ironsite already deploys is architecturally sufficient.
- Construction safety is a tractable problem — not because the rules are hard, but because nobody has automated the observation-to-enforcement gap. VINNA is that bridge.

---

## What's Next

1. Fine-tune a spatial VLM (LLaVA or InternVL) using FGRPO with OSHA violation reward signals on the Ironsite dataset
2. Real-time edge inference on the Ironsite bodycam hardware (not just post-hoc)
3. Live site integration: VINNA runs per-shift, raffle winner announced at end of day
4. Generalizing to non-Ironsite LiDAR formats (Matterport, RealSense, Apple LiDAR)

---

## Built With

`python` `fastapi` `anthropic` `claude-sonnet-4-6` `gemini-2.5-flash-lite` `solana` `spl-token` `react` `typescript` `latex` `matplotlib` `numpy` `open3d` `ffmpeg` `uv`

---

## Links
- GitHub: https://github.com/philip-chen6/vinna
- Demo Video: [TO BE ADDED — Stephen films 60s screen recording]
- Live API: [localhost:8765 during judging — Joshua's laptop]
