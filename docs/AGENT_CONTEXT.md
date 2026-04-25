# VINNA — Full Agent Context

Last updated: 2026-04-25 01:20 PDT

## Project Summary

**VINNA** = Ironsite spatial safety intelligence for HackTech Caltech.
Prize: $17,500 (Ironsite spatial reasoning) + YC interview track.
Deadline: 9am PDT Sunday Apr 26.

## Team & Division

| Person | Role | Status |
|--------|------|--------|
| Joshua | CII classifier, backend, architecture | On-site Caltech |
| Philip Chen | Solana raffle payout contract | On-site Caltech |
| Lucas He | Remote | Active |
| Stephen | Remote | Active |

## Repo: philip-chen6/vinna (private)

Collaborators: qtzx06, stephen, philip-chen6, lucas

## What Works RIGHT NOW

### Backend API (port 8765)
- FastAPI server: `backend/api.py`
- Endpoints: `/health`, `/analyze/frame`, `/analyze/timestamp`, `/analyze/batch`, `/demo`
- Judge: Claude Sonnet via Anthropic SDK → structured OSHA violation JSON
- Point cloud loader: stubs for .ply/.npy/.bin (real data pending from Ironsite Drive)
- Demo output: 5 pre-run events from masonry footage with real OSHA violation flags

### Frontend
- Codex is building with React Bits Pro (Philip shared license key)
- Not in this repo yet — codex has its own thread

### Solana Raffle
- Philip owns this piece
- Wrench-time % from CII → raffle tickets → on-chain USDC payout

## What's Broken / Needs Work

### CII Classification
- Original pipeline (638 frames) → ALL returned NC because `gemini-2.5-flash-lite` doesn't exist (404)
- Fixed to `gemini-2.5-flash` but re-run also produced errors
- Alternative: `/tmp/ironsite-hacktech/classify_activity.py` uses `google-genai` SDK + `gemini-3.1-flash-lite-preview` with 7 categories
- **ACTION**: Need working CII classifier producing real P/C/NC labels

### Point Cloud Data
- Ironsite Google Drive: https://drive.google.com/drive/folders/1aKV8Ovw1d3CiPMjv6YaJMyAO1g4x-UAO
- Daniele More (Ironsite CSO, ex-DeepMind) shared access
- Format unknown — need someone to check for .ply/.npy/.bin files
- Current `cloud_loader.py` generates synthetic data as stub

### Model Constraints
- Gemini 2.5 Pro: **BANNED** — do not use
- Gemini 3.1: Judge layer ONLY
- Depth Anything V2: **REDUNDANT** — Ironsite already has LiDAR point clouds
- Grounding DINO: Still useful for object detection on source frames

## Key Insight (from Josh's point cloud screenshot)

Ironsite already provides:
- 3D point clouds (color-coded by depth/height)
- Temporal event segmentation ("NC event candidate 015.0s")
- Egocentric source frames (fisheye bodycam)

**We are the interpretation layer, not the sensing layer.**

Pipeline: event_id → cloud crop + source frame → 3.1 judge → spatial claim + OSHA evidence

## Research Findings (Codex + Claude agents)

### Spatial Reasoning Rewards
- Faithful GRPO (arxiv 2604.08476, Apr 2026): GRPO + spatial reasoning, 24.5% → 1.7% inconsistency
- Smooth Operator (2601.07695): SNRA sigmoid rewards for distance estimation
- OSHA violations = binary verifiable rewards (yes/no per CFR rule)
- No human labels needed — the OSHA rulebook IS the reward function
- **For demo**: skip fine-tuning, use prompt engineering + structured output

### Gemini Embedding 2
- Natively multimodal, 3072-dim vectors
- Tested on masonry frames: P=0.4246, C=0.4127, NC=0.3765 (correct ranking, thin margins)
- Retrieval needs diverse footage — single masonry clip is too similar across queries

### IDM/FDM Architecture (from earlier pivot — now deprioritized)
- Schema detective + IDM engine built at lifebase/ironsite_idm/
- Based on wrong assumption (parquet data, not video)
- Keep for reference but NOT the demo path

## Available Assets

### Video
- Masonry footage: ~/Downloads/01_production_masonry.mp4 (21:16, 638 frames extracted)
- More footage likely in Ironsite Drive (unverified)

### Extracted Frames
- 32 frames at lifebase/.runtime/agents/ironsite-cii-fixed/frames/
- 638 frames from original extraction

### Demo Assets
- Spatial timeline JSON (2.3 MB): per-segment analysis with embeddings
- Dashboard HTML generator: /tmp/ironsite-hacktech/dashboard.py
- Demo frontend HTML: lifebase/.runtime/ironsite_probe/ironsite_demo_index.html
- Spatial preview MP4s, COLMAP maps, Qwen VLM labels

### Account Actions Needed
- Redeem Vultr credits: code `MAJORLEAGUEHACKING`
- Domain code: `HACKTECH26`

## Env Setup

```bash
ANTHROPIC_API_KEY=<key>
GEMINI_API_KEY=<key>
IRONSITE_VIDEO=~/Downloads/01_production_masonry.mp4
JUDGE_MODEL=claude-sonnet-4-6
```
