# Egocentric Scene Ledger Design

Date: 2026-04-25
Repo branch: `codex/gemini-robotics-er`
Primary test video: `/Users/qtzx/Downloads/01_production_masonry.mp4`

## Summary

VINNA should become a modular compiler for egocentric construction video. The
output is not a safety verdict, a caption stream, or a Gaussian splat. The
output is a timestamped, queryable **Scene Ledger**: a structured record of what
the bodycam saw, where the camera moved, what objects/materials/work areas
persisted over time, what work appeared to happen, what changed, and what each
claim is grounded in.

The reconstruction is evidence infrastructure. The ledger is the product
primitive. A web viewer or Three.js scene can later render the ledger, but the
first milestone is the data engine and benchmark suite.

## Product Thesis

Raw bodycam video is too dense for a project manager or an AI agent to reason
over directly. Frontier VLMs can describe isolated frames, but they lose state
across long egocentric walkthroughs, hallucinate progress, confuse repeated
areas, and cannot reliably separate "work happened" from "camera passed by work
that was already there."

VINNA should solve this by converting video into a durable scene memory:

```text
egocentric video
  -> frames/clips
  -> camera trajectory + depth + reconstruction evidence
  -> VLM construction observations
  -> object/material/area tracks
  -> progress/change/action events
  -> benchmarkable agent context
```

The winning demo is not "the model saw a hammer." It is:

> Given messy bodycam footage, VINNA builds a structured memory of the jobsite
> and lets agents answer progress/change/action questions with evidence frames,
> object tracks, geometry, and uncertainty.

## Goals

1. Build a reproducible pipeline for egocentric construction video.
2. Generate per-timestamp structured observations from multiple evidence sources.
3. Reconstruct enough camera/scene geometry to anchor observations spatially.
4. Track repeated objects, materials, workers, and work areas across time.
5. Detect construction-relevant events and progress signals.
6. Create benchmarks that compare raw VLM reasoning against ledger-augmented
   reasoning.
7. Create an action-forecast benchmark using Gemini Robotics-ER as an embodied
   planner, then compare predictions against observed execution.

## Non-Goals

1. Do not make OSHA/safety the core product path.
2. Do not optimize first for a webapp or Three.js interface.
3. Do not require perfect metric reconstruction before producing useful data.
4. Do not build an end-to-end learned model before proving the modular dataset.
5. Do not rely on a single VLM output as ground truth.
6. Do not send private/identifiable footage to external APIs without explicit
   consent and data handling approval.

## Primary Artifact: Scene Ledger

The Scene Ledger is a versioned JSON artifact, plus optional sidecar files for
frames, crops, depth maps, trajectories, and point clouds.

High-level shape:

```json
{
  "video_id": "01_production_masonry",
  "source_path": "/Users/qtzx/Downloads/01_production_masonry.mp4",
  "metadata": {
    "duration_s": 1276.0,
    "width": 640,
    "height": 480,
    "fps": 15.0
  },
  "frames": [],
  "tracks": [],
  "anchors": [],
  "events": [],
  "forecasts": [],
  "benchmarks": [],
  "uncertainty": []
}
```

The ledger should be appendable. Every module contributes evidence records
rather than overwriting previous interpretations.

## Data Model

### Frame Record

Each sampled frame gets a stable ID and all available per-frame evidence.

```json
{
  "frame_id": "f_000150",
  "timestamp_s": 15.0,
  "image_path": "artifacts/frames/f_000150.jpg",
  "camera_pose": {
    "status": "estimated|failed|not_run",
    "world_from_camera": null,
    "quality": 0.0,
    "source": "colmap|mast3r|orb_slam|unknown"
  },
  "depth": {
    "status": "estimated|failed|not_run",
    "path": "artifacts/depth/f_000150.npy",
    "scale": "relative|metric|unknown",
    "source": "depth_anything_v2|depthpro|mast3r"
  },
  "observations": [],
  "objects": [],
  "activities": [],
  "relations": [],
  "progress_indicators": [],
  "uncertainty_notes": []
}
```

### Observation

Observations are broad, grounded facts extracted from a frame or short clip.

```json
{
  "observation_id": "obs_000150_003",
  "source": "gemini_robotics_er|detector|manual|agent",
  "label": "worker handling masonry material",
  "category": "worker|activity|equipment|tool|material|structure|surface|signage|environment|other",
  "point": [520, 430],
  "box_2d": [410, 320, 780, 610],
  "evidence": "worker is facing block wall with hand/tool near mortar line",
  "confidence": 0.72
}
```

### Track

Tracks merge repeated observations into persistent entities.

```json
{
  "track_id": "track_wall_001",
  "entity_type": "worker|tool|machine|vehicle|material|structure|work_area|unknown",
  "canonical_label": "masonry wall segment",
  "frame_refs": ["f_000150", "f_000200", "f_000250"],
  "first_seen_s": 15.0,
  "last_seen_s": 25.0,
  "evidence_refs": ["obs_000150_004", "obs_000200_002"],
  "spatial_anchor_id": "anchor_wall_001",
  "confidence": 0.81
}
```

### Spatial Anchor

Anchors attach ledger entities to reconstructed site coordinates when available.

```json
{
  "anchor_id": "anchor_wall_001",
  "label": "masonry wall segment",
  "anchor_type": "plane|point_cluster|bbox_3d|trajectory|unknown",
  "world_position": null,
  "supporting_frames": ["f_000150", "f_000200"],
  "source": "slam_depth_fusion|mast3r|manual|unknown",
  "quality": 0.0
}
```

### Event

Events describe meaningful changes or actions over time.

```json
{
  "event_id": "event_masonry_active_001",
  "event_type": "activity_span|object_moved|material_added|installed_work_changed|camera_pass|uncertain",
  "start_s": 15.0,
  "end_s": 45.0,
  "summary": "worker appears to perform masonry work near the same wall segment",
  "participants": ["track_worker_area_001", "track_wall_001", "track_material_001"],
  "evidence_frames": ["f_000150", "f_000250", "f_000450"],
  "confidence": 0.68,
  "uncertainty": "tool contact and material change are not fully visible"
}
```

### Forecast

Forecasts are predictions from a blind pre-action frame. They are used for the
embodied action benchmark.

```json
{
  "forecast_id": "forecast_000150_hammer_001",
  "input_frame_id": "f_000150",
  "hidden_future_window_s": [15.0, 20.0],
  "model": "gemini-robotics-er-1.6-preview",
  "predicted_action": "hammer or strike target near masonry surface",
  "predicted_contact_points": [
    {"point": [510, 450], "label": "likely contact point", "confidence": 0.62}
  ],
  "predicted_trajectory": [
    {"point": [620, 480], "t_relative_s": 0.0},
    {"point": [560, 460], "t_relative_s": 0.5},
    {"point": [510, 450], "t_relative_s": 1.0}
  ],
  "predicted_end_state": "tool contacts or adjusts material at wall",
  "observed_execution_ref": "execution_000150_000200",
  "scores": {}
}
```

## Pipeline Modules

### 0. Adaptive Video Encoder

Purpose: compress egocentric video into a variable-density latent tape so VINNA
spends compute where the video actually contains information.

The masonry video has long spans where a fixed-rate sampler will waste budget:
walking, camera swing, blank wall, repeated pass-by footage, and low-information
motion blur. It also has bursts where information density spikes: hands/tools
move, material contacts a wall, a work surface changes, text/signage becomes
readable, or a new object enters the scene.

The adaptive encoder should output:

- `importance_spans`: intervals that deserve dense processing
- `low_info_spans`: intervals that can be aggressively compressed
- `keyframes`: timestamped frames chosen for downstream modules
- `crop_hints`: regions with high visual/text/action density
- `latent_refs`: optional compressed representations for later model training

Initial implementation can be heuristic:

- motion magnitude from frame differences or optical flow
- image sharpness / blur
- OCR/text density
- object/hand/tool detector changes
- VLM uncertainty or novelty
- embedding distance between adjacent frames

Long-term implementation can train a self-supervised video encoder with masked
compression objectives inspired by V-JEPA-style prediction. The training target
is not perfect reconstruction; it is preserving semantic/action information at a
high compression ratio.

This module sits before expensive VLM, depth, and reconstruction passes.

### 1. Video Ingest

Input: `01_production_masonry.mp4`.

Responsibilities:

- probe metadata with `ffprobe`
- assign `video_id`
- extract frames at a configurable sample rate
- optionally extract short clips around candidate actions
- write deterministic artifact paths

Initial policy:

- sample every 5 seconds for broad coverage
- add scene-change or motion-heavy frames later
- preserve exact timestamps

The video ingest module receives sampling hints from the adaptive video encoder
when available. Without those hints, it falls back to fixed-rate sampling.

### 2. Egocentric Motion And SLAM

Purpose: estimate where the camera moved and which frames likely view the same
place.

Candidate methods:

- COLMAP for sparse reconstruction when enough visual overlap exists
- MASt3R/DUSt3R-style pairwise reconstruction for difficult egocentric views
- ORB-SLAM/OpenVSLAM-style visual odometry if setup time allows
- fallback: embedding-based place recognition without full metric pose

Output:

- per-frame pose estimate when possible
- pose quality/confidence
- frame neighborhood graph
- candidate revisits to the same area

Important constraint: bodycam footage is shaky, occluded, and forward-moving.
Pose will fail sometimes. The ledger must record failures rather than blocking
the rest of the pipeline.

### 3. Depth Layer

Purpose: add per-frame geometry evidence.

Candidate methods:

- Depth Anything V2 for robust relative depth
- DepthPro for fast monocular metric-ish depth when accessible
- MASt3R/DUSt3R for pairwise geometry and stronger local consistency

Output:

- depth map path
- scale type: relative, metric, or unknown
- confidence/quality estimate
- optional depth-derived object ordering: foreground/background/near/far

Depth should support claims, not become the only source of truth.

### 4. Reconstruction Layer

Purpose: create a navigable approximation of the space and attach anchors.

Outputs:

- sparse point cloud
- optional dense point cloud or mesh
- spatial anchors for walls, openings, surfaces, material staging, equipment
- mapping from frames to visible anchors

Implementation principle:

- start with sparse/anchor-based reconstruction
- add dense reconstruction later
- treat Gaussian splatting as a visualization option, not the canonical data
  structure

### 5. VLM Observation Layer

Purpose: extract broad jobsite facts from frames and clips.

Initial model:

- `gemini-robotics-er-1.6-preview`

Prompt target:

- workers
- activities
- trades
- tools
- machines and vehicles
- materials
- installed work
- work-in-progress
- spatial relations
- counts and progress signals
- readable markings/signage
- uncertainty

Output contract:

- `ConstructionObservations`
- no `hazards` field
- no safety-first schema

### 6. Detector And Segmenter Layer

Purpose: provide non-VLM evidence for object persistence and visual grounding.

Candidate tools:

- open-vocabulary detector for construction objects
- SAM/SAM2-style segmentation for masks
- optical-flow or point-tracking model for tool/hand/object motion
- OCR for labels, markings, equipment IDs, and signage

Output:

- boxes/masks/keypoints/text snippets
- visual track candidates
- crop references for evidence

### 7. Entity Resolution And Tracking

Purpose: merge repeated per-frame observations into persistent tracks.

Signals:

- visual similarity
- text labels
- boxes and masks
- depth ordering
- camera pose / place recognition
- timestamp proximity
- VLM relation consistency

Examples:

- same masonry wall segment
- same pallet/material stack
- same wheelbarrow/mixer
- same active work area
- same worker silhouette or tool interaction zone

The first implementation can use conservative clustering. It is better to split
one entity into two tracks than to over-merge unrelated entities.

### 8. Event Memory

Purpose: convert tracks into construction-relevant events.

Event classes:

- `activity_span`: worker appears to perform a task over a time window
- `object_moved`: tracked object changes position or disappears/reappears
- `material_added`: visible material quantity or placement increases
- `installed_work_changed`: wall, surface, fixture, or structure changes
- `inspection_or_passby`: camera observes without clear work
- `uncertain`: evidence suggests change but cannot verify

Events must include evidence frames and uncertainty.

### 9. Agent Query Layer

Purpose: let downstream agents answer questions using the ledger.

Example queries:

- What work happened in this clip?
- What changed between 2:00 and 8:00?
- Which materials were used?
- Where did masonry work appear to happen?
- Which frames are the strongest evidence?
- What is uncertain or not visible?

Agent context should include:

- relevant events
- supporting frames/crops
- spatial anchors
- object tracks
- uncertainty notes

This is how VINNA avoids asking an LLM to remember the whole video at once.

## Action Forecast Vs Observed Execution Benchmark

This is the Robotics-ER-specific benchmark.

### Motivation

Gemini Robotics-ER can reason about how a robot arm should move: grasp points,
contact points, trajectories, and expected end states. Construction bodycam
video contains human tool use and material manipulation. VINNA can repurpose
robotics planning as a blind action prior:

> Given only the pre-action frame, predict the likely physical interaction.
> Then reveal the future video and score whether the prediction matched what
> actually happened.

This tests embodied spatial reasoning without needing a robot.

### Benchmark Flow

1. Detect or choose an action window:
   - start frame before action
   - future window after action
   - candidate action label from the observation pass

2. Blind planning prompt:

```text
You only see the starting frame. Do not assume future frames.
The worker is likely about to perform: <candidate action>.
Predict:
1. target object/material/work surface
2. likely contact point(s)
3. likely hand/tool trajectory as normalized [y, x] points
4. expected end state after 1-5 seconds
5. uncertainty
Return JSON only.
```

3. Observed execution extraction:
   - track hand/tool/object points through the future window
   - use optical flow, point tracking, frame differencing, and VLM observations
   - record observed contact points and end state

4. Score prediction vs observation.

### Candidate Metrics

- target identification accuracy
- contact-point pixel error
- trajectory similarity with dynamic time warping or Chamfer distance
- endpoint error
- start/end timestamp localization error
- end-state match
- affordance match: did the model understand what the tool/object is for?
- uncertainty calibration

### Example

Input:

- pre-action frame where a worker holds a tool near masonry

Forecast:

- likely contact point on wall/material
- tool path toward contact point
- expected end state: adjustment/hammering/material placement

Observation:

- actual hand/tool movement in next 3 seconds
- frame diff or track showing contact/motion

Score:

- target: correct/incorrect
- contact point error: normalized pixels
- trajectory similarity: 0-1
- end-state match: correct/partial/wrong

### Why This Matters

This creates a benchmark that is stronger than normal caption QA:

- input is pre-action only
- prediction is physical and spatial
- ground truth is the future video
- score is programmatic enough to compare models

It also turns Robotics-ER from "another VLM" into an evaluator for embodied
construction understanding.

## Standard Benchmarks

## Ground Truth Benchmark Protocol

The benchmark cannot depend on fully labeled construction datasets. VINNA should
create ground truth from three layers, ordered from cheapest to strongest:

1. **Objective video evidence**: future frames, before/after frames, frame
   timestamps, visible motion, and frame differences.
2. **Programmatic checks**: optical flow, point tracking, object persistence,
   depth ordering, and reconstruction consistency.
3. **Gold labels**: small human-reviewed subsets for high-value or ambiguous
   windows.

The benchmark should report which layer supports each claim. A result backed by
future frames and human review is stronger than one backed only by model output.

### Minimal Gold Label Set

For the first masonry video benchmark, label only what is necessary:

- 10 action windows for forecast vs observed execution
- 20 before/after pairs for change or no-change
- 10 evidence retrieval questions with accepted timestamp ranges
- 5 persistent object/work-area tracks

This is small enough to create quickly and large enough to expose raw VLM
failure modes.

### Label Format

```json
{
  "label_id": "gold_action_001",
  "video_id": "01_production_masonry",
  "time_window_s": [120.0, 125.0],
  "label_type": "action|change|retrieval|track",
  "target_entities": ["masonry wall", "worker hand/tool"],
  "action": "trowel|hammer|place|inspect|passby|unknown",
  "changed": true,
  "accepted_evidence_frames": ["f_001200", "f_001225"],
  "notes": "worker appears to contact wall surface; exact material change is uncertain"
}
```

### Evaluation Contract

Each benchmark result should include:

- model or condition
- input context used
- prediction
- ground-truth reference
- score fields
- evidence frame refs
- uncertainty

This keeps the benchmark useful even when labels are partial.

### Benchmark 1: Raw VLM Vs Ledger-Augmented QA

Task:

- ask questions about the masonry video
- compare answers from raw VLM context vs Scene Ledger context

Question types:

- What work happened?
- Which area changed?
- Which materials were handled?
- When did the action begin/end?
- Was this work or pass-by footage?
- What evidence supports the answer?

Metrics:

- answer correctness
- timestamp localization
- evidence-frame precision
- hallucination rate
- uncertainty quality

### Benchmark 2: Change Detection

Task:

- detect meaningful visual/construction changes between two time windows

Metrics:

- added/removed/moved object F1
- progress signal precision
- false progress hallucination rate
- evidence-frame recall

### Benchmark 3: Object Persistence

Task:

- track same object/work area across shaky egocentric frames

Metrics:

- track purity
- fragmentation rate
- false merge rate
- persistence duration accuracy

### Benchmark 4: Reconstruction Usefulness

Task:

- evaluate whether pose/depth/reconstruction improves agent answers

Conditions:

- VLM only
- VLM + frame timeline
- VLM + timeline + depth
- VLM + timeline + depth + pose/anchors

Metrics:

- QA correctness
- evidence quality
- confidence calibration
- cost/latency

## First Masonry Video Execution Plan

### Phase 1: Ledger Skeleton

Input:

- `/Users/qtzx/Downloads/01_production_masonry.mp4`

Steps:

1. Probe metadata.
2. Sample frames every 5 seconds.
3. Run Gemini Robotics-ER construction observations on a small subset first.
4. Save a ledger JSON with frame records and observations.
5. Validate schema and store evidence frame paths.

Success criteria:

- at least 20 timestamped frame records
- valid JSON schema
- observations include activities/materials/progress/uncertainty
- no safety-first `hazards` schema

### Phase 2: Adaptive Sampling And Candidate Windows

Steps:

1. Compute frame-diff/motion/blur/OCR novelty signals.
2. Create importance spans and low-info spans.
3. Generate candidate action windows.
4. Store candidate windows and uncertainty in the ledger.

Success criteria:

- at least 10 importance spans
- at least 3 candidate action windows
- low-info spans are explicitly marked rather than dropped silently

### Phase 3: Geometry Evidence

Steps:

1. Add depth map generation for sampled frames.
2. Add pairwise frame similarity or place recognition.
3. Add initial camera/scene reconstruction attempt.
4. Attach pose/depth quality to frame records.

Success criteria:

- each sampled frame has depth status
- failed geometry modules record explicit failure
- repeated locations can be proposed even if full SLAM fails

### Phase 4: Tracks And Events

Steps:

1. Cluster repeated labels/visual entities.
2. Create track records for wall/material/tool/work-area entities.
3. Detect candidate activity spans.
4. Create event records with evidence frames.

Success criteria:

- at least 5 persistent tracks
- at least 3 event candidates
- each event has evidence frames and uncertainty

### Phase 5: Action Forecast Benchmark

Steps:

1. Pick 3-5 candidate action windows.
2. Generate blind forecasts from pre-action frames.
3. Extract observed future trajectories with simple point/box tracking.
4. Score predicted vs observed action.

Success criteria:

- benchmark JSON for each action window
- at least one trajectory/contact metric
- qualitative evidence frames for demo

### Phase 6: A/B Agent Benchmark

Steps:

1. Write 5-10 masonry-video questions.
2. Answer with raw VLM context.
3. Answer with Scene Ledger context.
4. Score and summarize deltas.

Success criteria:

- table of VLM-only vs ledger-augmented outcomes
- at least one clear failure fixed by the ledger
- evidence-backed demo narrative

## Module Interfaces

Recommended local artifact layout:

```text
artifacts/
  scene_ledger/
    01_production_masonry/
      ledger.json
      frames/
      crops/
      depth/
      tracks/
      reconstruction/
      forecasts/
      benchmarks/
```

Recommended CLI shape:

```bash
uv run --directory backend python ../experiments/build_scene_ledger.py \
  --video /Users/qtzx/Downloads/01_production_masonry.mp4 \
  --sample-every 5 \
  --max-frames 20 \
  --out artifacts/scene_ledger/01_production_masonry/ledger.json
```

Recommended module boundaries:

- `adaptive_video_encoder.py`: importance spans, keyframes, crop hints
- `video_ingest.py`: metadata and frame extraction
- `geometry_depth.py`: depth inference and depth metadata
- `geometry_reconstruction.py`: pose/reconstruction attempts
- `gemini_robotics.py`: VLM construction observations
- `tracking.py`: entity resolution and tracks
- `events.py`: progress/change/action event generation
- `forecast_benchmark.py`: blind action forecast and scoring
- `ground_truth.py`: human label loading and benchmark references
- `ledger_io.py`: schema validation and artifact writing

## Risks And Mitigations

### Risk: Reconstruction fails on shaky bodycam

Mitigation:

- keep ledger useful without metric pose
- use place recognition and frame similarity as fallback
- treat reconstruction quality as evidence confidence, not a hard dependency

### Risk: VLM hallucination

Mitigation:

- require evidence strings and uncertainty
- cross-check with detection/depth/frame-diff signals
- benchmark raw VLM vs ledger rather than trusting any one answer

### Risk: Model-derived labels become fake ground truth

Mitigation:

- report support level on every benchmark result
- human-review the highest-impact or highest-disagreement windows
- use objective future-frame evidence where possible

### Risk: Privacy constraints block full-video API calls

Mitigation:

- run local frame extraction first
- use public/sample images for smoke tests
- use face blurring/minimization before external calls
- make File API upload optional and explicit

### Risk: Over-building visualization

Mitigation:

- defer Three.js/webapp
- generate data artifacts first
- visualize only enough evidence for the demo

### Risk: Entity over-merge

Mitigation:

- prefer conservative track splitting
- record track confidence
- keep frame-level raw observations available

## Open Decisions

1. Whether to use 5-second or 10-second sampling as the default.
2. Which signals should drive the first adaptive encoder: motion, blur, OCR,
   embedding novelty, or a weighted blend.
3. Which local depth model is fastest to integrate in this repo.
4. Whether the first reconstruction attempt should be COLMAP, MASt3R/DUSt3R, or
   a lighter place-recognition fallback.
5. Whether real bodycam frames can be sent to Gemini for the hackathon demo.
6. Which 5-10 benchmark questions should represent Ironsite value best.
7. Which action categories are narrow enough for the first forecast benchmark.

## Recommended First Implementation Slice

Build the ledger skeleton before any 3D viewer:

1. `ledger_io.py`
2. `video_ingest.py`
3. `adaptive_video_encoder.py` heuristic importance spans
4. batch Gemini Robotics-ER frame observations
5. `build_scene_ledger.py`
6. small masonry-video ledger artifact
7. tiny gold-label file for benchmark references
8. 5-question raw VLM vs ledger-augmented benchmark

This produces a real asset quickly and leaves clear extension points for depth,
SLAM, reconstruction, tracking, and action-forecast scoring.

## Demo Narrative

1. Start with the raw masonry bodycam video.
2. Show that a raw VLM can describe isolated frames but loses temporal state.
3. Run VINNA Scene Ledger.
4. Show timestamped observations, tracks, events, and uncertainty.
5. Ask a progress/change question.
6. Compare raw VLM answer to ledger-augmented answer.
7. Show the action-forecast benchmark: pre-action prediction vs observed future.
8. Close with the product claim:

> VINNA turns egocentric construction video into structured scene memory:
> reconstruction-backed, timestamped, evidence-linked, and benchmarkable.
