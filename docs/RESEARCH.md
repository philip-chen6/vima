# VINNA — Spatial Reasoning Research

Last updated: 2026-04-25 01:25 PDT | Sources: Claude + Codex + WebSearch swarm

## TL;DR

Spatial reasoning rewards are **VERIFIABLE** (unlike most VLM tasks). OSHA rules = binary ground truth. Distance estimation = continuous via depth maps. No human preference pairs needed. GRPO is the natural fit.

## Key Papers

| Paper | Arxiv | Relevance |
|-------|-------|-----------|
| **Faithful GRPO (FGRPO)** | 2604.08476 (Apr 2026) | GRPO + spatial reasoning + constrained policy. 24.5% → 1.7% inconsistency on Qwen2.5-VL-7B |
| **Smooth Operator / AP-GRPO** | 2601.07695 (Jan 2026) | SNRA sigmoid converts distance error to dense reward. Numerical3D-50k dataset |
| **SpatialVLM** | 2401.12168 (CVPR 2024) | Monocular depth → spatial QA at scale (2B examples). Synthetic data recipe |
| **SpatialRGPT** | 2406.01584 (NeurIPS 2024) | Depth plugin for VLMs + 3D scene graph → spatial QA |
| **Safe-Construct** | 2504.10880 (CVPRW 2025) | First 3D multi-view construction violation recognition |
| **ViGoRL** | 2505.23678 (2025) | Visually grounded RL — each step points at a spatial region |

## Reward Functions (Ranked by Feasibility)

### 1. OSHA Violation Detection (BINARY)
- Ground truth: guardrail present yes/no, exit blocked yes/no, hard hat yes/no
- Reward = exact match against annotation
- Bootstrap labels with YOLO-World open-vocab detection
- **Easiest to implement. This is the demo.**

### 2. Distance/Area Estimation (CONTINUOUS via SNRA)
- Depth Anything V2 → pseudo-ground-truth depth (BUT Ironsite has LIDAR so use that instead)
- VLM predicts "distance from worker to edge = X meters"
- Reward = sigmoid(1 - |predicted - depth_estimate| / threshold)
- Dense, continuous, verifiable WITHOUT humans

### 3. Spatial Change Detection (F1-based)
- Frame pairs from walkthrough T1 and T2
- VLM lists changes, reward = F1 against ground truth
- Partially automatable via detection diff

### 4. Object Spatial Relationships (SpatialRGPT)
- Generate spatial QA from depth + detection
- Verifiable from depth map geometry + pixel distances

## Hackathon Tiers (48h)

### Tier 1 — Hours 0-12 (MVP DEMO)
- Structured prompting on Gemini 3.1
- Frame + point cloud stats as structured context
- Few-shot: 5-10 annotated violation examples
- Output: structured violation report JSON
- **No training. This IS the demo.**

### Tier 2 — Hours 12-24 (ENHANCE)
- Grounding DINO object detection → structured context
- Multi-frame temporal analysis (change detection)
- Dashboard visualization of violations over time

### Tier 3 — Hours 24-48 (STRETCH)
- LoRA fine-tune on construction frames (if GPU available)
- GRPO with binary OSHA rewards
- Real Ironsite data integration from Drive

## Embedding Results (Gemini Embedding 2)

Tested on 5 masonry frames:
- P similarity: 0.4246
- C similarity: 0.4127
- NC similarity: 0.3765

Correct ranking (P > C > NC) but thin margins. Single masonry clip too homogeneous — needs diverse footage. Not the primary path.

## Model Stack (LOCKED)

| Layer | Model | Notes |
|-------|-------|-------|
| Spatial judge | Gemini 3.1 | Josh directive: 3.1 ONLY for judge |
| Fallback judge | Claude Sonnet 4.6 | backend/judge.py uses this |
| Object detection | Grounding DINO | Local, no API cost |
| Depth | Ironsite LIDAR (not DA V2) | DA V2 redundant |
| Embeddings | Gemini Embedding 2 | Optional, for retrieval only |
| **BANNED** | Gemini 2.5 Pro | Josh correction 00:36 PDT |
