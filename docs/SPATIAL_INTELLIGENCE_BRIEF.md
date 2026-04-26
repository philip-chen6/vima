# vima: Spatial Intelligence from Egocentric Construction Video

**Hacktech Caltech -- Ironsite Challenge | April 2026**

## The Pivot

Ironsite does NOT want another violation checklist. They want **spatial intelligence** -- a system that understands the 3D construction site from a bodycam and can answer spatial questions about it.

The question is not "is this worker wearing a hardhat?"
The question is "what changed in this space since yesterday?"

## What Spatial Intelligence Means

Spatial intelligence = the ability to make verifiable claims about 3D space from egocentric 2D video.

Three capabilities, in order of difficulty:

### 1. Spatial Relationship Mapping (single frame)
- "The scaffold is 2.3m from the open edge"
- "Worker is between the material stack and the guardrail"
- "Rebar cage extends 4m along the north wall at 1.2m height"

**How:** Frame + Depth Anything V2 pseudo-depth + YOLO-World open-vocab detection -> metric distance estimation between detected objects. The SpatialVLM pipeline: monocular depth converts pixel distances to metric estimates.

### 2. Distance & Area Estimation (single frame, quantitative)
- "Footprint of material stockpile in zone B: ~6m^2"
- "Clearance between scaffold and ceiling: ~1.8m"
- "Worker density: 3 workers within 5m radius of egocentric camera"

**How:** Depth map + detection bboxes -> project to metric space. SNRA (Smooth Numerical Reward Approximation) sigmoid converts continuous distance predictions into verifiable reward signals. From the Smooth Operator paper -- this is what makes spatial claims *checkable*.

### 3. Spatial Change Detection (frame pairs across time)
- "Scaffold section moved ~2m north since walkthrough T1"
- "Material stockpile in zone B decreased by ~40%"
- "New guardrail installed along east edge (not present in T1)"
- "Rebar installation progressed 3m further along trench"

**How:** Aligned frame pairs from different walkthroughs + detection diff + depth-weighted spatial comparison. This is the killer feature. VLMs alone hallucinate physical progress; structured spatial context makes them accurate.

## Why This Wins Over Violation Detection

| Violation Detection | Spatial Intelligence |
|---|---|
| Binary: compliant / not compliant | Continuous: distances, areas, deltas |
| Commodity -- every construction AI startup does this | Novel -- no one ships egocentric spatial reasoning for construction |
| Static: one frame, one label | Temporal: tracks physical state across site visits |
| Answers "is there a problem?" | Answers "what happened, where, and how much?" |
| Ironsite already has this | Ironsite wants this |

## The Demo That Wins

**Input:** Two bodycam frames from the same location, different walkthroughs (T1 and T2).

**Output:** A structured spatial diff:
```json
{
  "spatial_diff": [
    {
      "claim": "Scaffold section repositioned ~2m north",
      "object": "scaffold",
      "change_type": "moved",
      "estimated_displacement_m": 2.1,
      "confidence": 0.82,
      "evidence": "Scaffold visible at frame-left in T1, frame-center in T2. Depth estimate: 4.2m -> 3.8m from camera."
    },
    {
      "claim": "New guardrail installed along east edge",
      "object": "guardrail",
      "change_type": "added",
      "confidence": 0.91,
      "evidence": "No guardrail detected in T1 frame. Guardrail detected in T2 at 3.1m from camera, spanning ~2.5m."
    }
  ],
  "spatial_summary": "2 changes detected. Net progress: guardrail installation (+1 object), scaffold repositioning.",
  "site_state": {
    "estimated_objects": 7,
    "worker_count": 2,
    "active_zone": "east_edge_platform",
    "dominant_activity": "guardrail_installation"
  }
}
```

**Visual:** Side-by-side frames with spatial annotations -- bounding boxes, distance labels, change arrows. The judge/audience sees the AI spatially *understanding* the scene, not just classifying it.

## Technical Stack

### Perception Layer
- **Depth Anything V2**: Monocular depth estimation from every frame. Converts pixel space to metric estimates.
- **YOLO-World**: Open-vocabulary object detection. No fixed ontology -- detects whatever construction objects appear.
- **Gemini Embedding 2**: 3072-dim embeddings for semantic similarity between frames / temporal segments.

### Spatial Reasoning Layer (the new judge)
- **Claude / Gemini VLM**: Receives frame + depth map + detections + geometry stats. Outputs structured spatial claims.
- **Prompt architecture**: NOT "find violations." Instead: "describe the spatial state of this scene. estimate distances. identify spatial relationships. compare to previous frame if provided."

### Spatial Memory Layer
- **Structured event timeline**: Each walkthrough segment gets spatial claims, depth-derived metrics, detected objects with positions.
- **Change detection**: Compare spatial state vectors across walkthroughs. F1-based reward for change claims.
- **Accumulation**: Site model builds over time. "Zone B has had 3 material deliveries and 1 scaffold move this week."

### Verification Layer (why this is not hallucination)
- Depth maps provide ground truth for distance claims (SNRA smooth reward)
- Detection bboxes provide ground truth for object presence
- Frame pairs provide ground truth for change claims (detection set diff)
- All spatial claims are **programmatically verifiable** -- this is the GRPO insight from Faithful GRPO (FGRPO)

## Key Papers

| Paper | Insight for vima |
|---|---|
| **SpatialVLM** (CVPR 2024) | Data gen pipeline: monocular depth -> spatial QA at scale. Our recipe for training data. |
| **SpatialRGPT** (NeurIPS 2024) | Depth plugin for VLMs + spatial benchmarks. Proves depth-augmented VLMs outperform raw VLMs on spatial reasoning. |
| **Faithful GRPO** (Apr 2026) | Spatial reasoning + constrained policy optimization. Reduced spatial inconsistency 24.5% -> 1.7%. THE method for fine-tuning spatial reasoning. |
| **Smooth Operator / AP-GRPO** | SNRA sigmoid for continuous spatial rewards. Makes distance estimation trainable via RL. |
| **Safe-Construct** (CVPRW 2025) | First 3D multi-view construction domain spatial reasoning. Direct domain validation. |

## 48-Hour Execution Plan

### Hours 0-8: Spatial Perception (DONE / in progress)
- Frame extraction from egocentric video (pipeline.py -- exists)
- Point cloud loading (cloud_loader.py -- exists)
- NEW: Depth Anything V2 inference on extracted frames
- NEW: YOLO-World detection on extracted frames

### Hours 8-20: Spatial Judge
- NEW: spatial_judge.py -- the reframed prompt that does spatial reasoning instead of violation detection
- NEW: Frame pair mode for change detection
- NEW: Structured spatial claims with metric estimates and evidence chains

### Hours 20-36: Spatial Demo
- NEW: spatial_demo.py -- end-to-end demo that takes video -> frames -> spatial claims
- NEW: Side-by-side spatial diff visualization
- NEW: Spatial query interface ("what's within 3m of the open edge?", "what changed in zone B?")

### Hours 36-48: Polish + Stretch
- Cosine similarity spectrogram across timeline (Proposal 2 from experiments)
- Zone transition risk topology (Proposal 1)
- GRPO fine-tuning with SNRA rewards if time permits (Tier 3)

## One-Liner for the Judges

> "vima gives construction sites spatial memory -- it understands 3D space from a bodycam, estimates distances, and tracks what changed between visits. Not a violation checklist. Spatial intelligence."
