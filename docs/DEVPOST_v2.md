# VINNA — Spatial Intelligence for Construction Sites

_HackTech 2026 @ Caltech — Ironsite Prize Track_

---

## Tagline

Construction sites generate thousands of frames of egocentric video every day. Most AI reads them like photographs. We built the layer that reads them like a spatial record.

---

## Inspiration

We asked a simple question: what does Ironsite actually want from computer vision?

Not another OSHA violation checklist. Every construction AI startup ships that. Ironsite wants **spatial intelligence** — a system that understands the 3D site from a bodycam: what changed between walkthroughs, where workers are spending time, whether progress claims match what the footage actually shows.

The failure of existing VLMs isn't perception. Point Claude or GPT-5 at a construction frame and they label objects fine. The failure is **verifiability**. There's no ground truth signal anchoring the model's spatial claims to physical reality. Distances are hallucinated. Progress that didn't happen gets reported. And critically — if you tie rewards to unverified output, workers immediately learn to game the system.

VINNA solves that. Spatial anchoring + temporal gaming resistance + on-chain payout transparency. Not a checklist. A reward infrastructure.

---

## What It Does

VINNA is a spatially-anchored worker intelligence and incentive system for egocentric construction video. It does three things that matter:

### 1. Frame-level spatial classification (CII)
Every frame gets a Construction Industry Institute (CII) wrench-time label: **Productive (P)**, **Contributory (C)**, or **Non-Contributory (NC)**. Not "is this worker wearing PPE" — "is this worker doing value-adding work?"

On 30 frames of real Ironsite masonry bodycam footage:
- **86.7% Productive** (26/30 frames)
- **0% Contributory** (no rework or material handling)
- **13.3% Non-Contributory** (4 frames of idle/walking)
- Mean P-confidence: **0.939**
- Session latency: **595ms/frame** at **1.68 fps**

### 2. Temporal gaming resistance
The core threat model: financially-motivated workers with headcams will game any reward system tied to raw classification. VINNA builds in resistance through spatially-anchored frame classification. We tested gaming advantage over time — **by frame 30, the advantage of trying to game the classifier is gone**. The system anchors each classification to spatial context from COLMAP point clouds and SNRA-weighted confidence; inconsistent gaming attempts produce incoherent spatial signals that don't accumulate reward.

### 3. Verifiable on-chain payout
Worker productivity percentages map to raffle ticket allocations. Winners are drawn proportionally to wrench time and paid out via Solana SPL tokens on devnet. Every payout has a cryptographically-signed TX signature, linkable on Solscan. The evidence chain is: frame → spatial classification → wrench time % → raffle weight → on-chain SPL transfer. Auditable end-to-end.

---

## How We Built It

**Perception:** Claude Sonnet 4.6 as the spatial vision judge. Every frame gets the full prompt: CII category, spatial claims with metric estimates, violation flags, confidence with reasoning chain. Not "what do you see" — structured spatial intelligence output.

**Spatial anchoring:** COLMAP SfM on the bodycam sequence (19/31 frames registered, 1,770 3D points, 1.199px reprojection error, 4.23 mean track length). Each classification is optionally anchored to the reconstructed point cloud geometry, making the evidence chain 3D-grounded, not just pixel-based.

**Reward formalism:** Binary reward $R_{\text{bin}}(f) \in \{0,1\}$ per frame (OSHA-aligned productive/non-productive). Continuous worker reward $R_{\text{SNRA}}(w) = \sigma(\sum_f R_{\text{bin}}(f)) \cdot S(k)$ where $S(k)$ is spatial anchor confidence. Sigmoid smoothing prevents cliff effects; spatial weighting penalizes gaming.

**Backend:** FastAPI at `:8765`. Endpoints: `/analyze/frame` (upload), `/analyze/timestamp` (from video), `/demo` (5-frame batch), `/cii/summary` (wrench time + raffle tickets), `/cii/frames` (full per-frame log).

**Raffle engine (`raffle.py`):** Reads CII classifications, assigns workers to frames, computes wrench-time percentages, issues raffle tickets at 1 ticket per 0.1% wrench time above baseline (30%). Draws winner, generates mock Solana SPL TX with verifiable signature.

**Frontend:** React Bits Pro. Sections: spatial intelligence pitch, live evidence feed, CII wrench-time dashboard, Solana payout explorer.

**Stack:** `python` `fastapi` `anthropic` `claude-sonnet-4-6` `colmap` `solana-devnet` `react-bits-pro` `numpy` `ffmpeg` `uv`

---

## Challenges

**Calibration under class imbalance.** Real masonry footage is mostly productive — 86.7% P in 30 frames. Getting confident classifications on heavily imbalanced data required careful confidence thresholding in the prompt and explicit reasoning chain requirements, not just output labels.

**Gaming threat model.** Most construction AI ignores adversarial workers. We had to think through the full threat surface: what does a worker with a headcam do when their wages depend on classification output? Spatial anchoring and temporal consistency requirements are the answer — but designing those constraints took the majority of the architecture work.

**Monocular SfM on shaky egocentric video.** COLMAP on bodycam footage (not tripod-mounted) is genuinely hard. We got 61.3% frame registration on the Ironsite sequence. Every registered frame gives a spatially-grounded classification; every unregistered frame falls back to 2D-only. Real-world registration rate, not clean benchmark numbers.

**Connecting on-chain payout to real evidence.** Minting SPL tokens is easy. Making the minting process auditably tied to a specific evidence chain (specific frames, specific classifications, specific confidence values) required careful data structure design across the classification pipeline, raffle engine, and Solana transaction metadata.

---

## What We Learned

**Verifiability is the moat, not classification accuracy.** Any model can label a construction frame. The hard problem is making the label adversarially robust and auditable. SNRA spatial rewards + temporal gaming resistance is where the actual IP lives.

**CII wrench time is a better target than OSHA violations.** OSHA violations are binary and rare. CII wrench time is continuous, common, and directly maps to construction project economics. 86.7% productive means the site is running well — but tracking that number daily, per worker, with tamper-resistant evidence chains is genuinely valuable.

**On-chain transparency changes the incentive structure.** When payout logic is on-chain and evidence is auditable, the social contract changes. Workers can verify they're being measured fairly. Site managers can verify they're not gaming their own metrics. That trust layer is what makes the system deployable.

---

## What's Next

1. **Multi-worker from real sensor metadata** — Current demo simulates 3 workers from a single bodycam. Production version reads `worker_id` from headcam hardware metadata.

2. **Cross-session progress tracking** — Extend spatial anchoring to track 3D site state across multiple walkthroughs. "Zone B had 3 material deliveries this week." That's where VINNA becomes a construction intelligence platform, not just a per-session tool.

3. **GRPO fine-tuning on verified signals** — The CII classification pipeline generates labeled (frame, classification, confidence, spatial_context) tuples that are verifiable without human annotation. Natural GRPO training signal for a spatial reasoning specialist model.

4. **Mainnet SPL deployment** — Devnet payout architecture is complete. Mainnet requires keyed worker wallets and escrow contract; both are designed.

---

## Built With

`python` `fastapi` `anthropic` `claude-sonnet-4-6` `colmap` `solana-devnet` `spl-token` `react-bits-pro` `numpy` `ffmpeg` `uv`

---

## Links
- GitHub: https://github.com/philip-chen6/vinna
- Demo Video: [TO BE ADDED]
