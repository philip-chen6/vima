# Yolodex Object Memory Stage

VINNA vendors the working Yolodex collect/label/preview stages under
`tools/yolodex/`. Training and augmentation are intentionally omitted.

## Purpose

```text
hardhat video
  -> sampled frames
  -> Yolodex/Codex bounding boxes
  -> mask tracks
  -> preview overlays
  -> VINNA object-event memory JSON
```

This gives VINNA a specialist perception layer before episodic retrieval and
VLM synthesis. The VLM should answer from the memory artifact, not directly
from raw frames.

## Run

From `tools/yolodex`, edit `config.json` if needed. The default video path is:

```text
../../data/video01.mp4
```

Then:

```bash
uv sync
uv run .agents/skills/collect/scripts/run.py
uv run .agents/skills/label/scripts/dispatch.sh 1
uv run .agents/skills/eval/scripts/preview_labels.py runs/vinna-hardhat/frames --classes runs/vinna-hardhat/classes.txt --out-dir runs/vinna-hardhat/frames/preview --limit 0 --video-out runs/vinna-hardhat/frames/preview/preview.mp4
```

Back at the repo root:

```bash
python3 demo/yolodex_memory.py --run-dir tools/yolodex/runs/vinna-hardhat --out demo/object_event_memory.json --fps 0.1
python3 demo/mask_track_memory.py --run-dir tools/yolodex/runs/vinna-hardhat --out demo/mask_track_memory.json --fps 0.1
python3 demo/depth_memory.py --input demo/mask_track_memory.json --out demo/depth_track_memory.json --backend auto
python3 demo/episodic_memory.py --input demo/depth_track_memory.json --out demo/episodic_memory.json --query "worker laying blocks near wall"
python3 demo/answer_from_memory.py --query "Was there masonry work happening near the wall?" --provider gemini --out demo/memory_answer_gemini.json
```

## Output

- `tools/yolodex/runs/vinna-hardhat/frames/*.txt`: YOLO-format labels
- `tools/yolodex/runs/vinna-hardhat/classes.txt`: class map
- `tools/yolodex/runs/vinna-hardhat/frames/preview/preview.mp4`: visual QA
- `demo/object_event_memory.json`: timestamped object/event rows for VINNA
- `tools/yolodex/runs/vinna-hardhat/masks/*.png`: prompt masks
- `tools/yolodex/runs/vinna-hardhat/mask_preview/mask_tracks.mp4`: mask-track QA
- `demo/mask_track_memory.json`: persistent mask tracks and relations
- `tools/yolodex/runs/vinna-hardhat/depth/*.png`: per-frame relative depth maps
- `tools/yolodex/runs/vinna-hardhat/depth_preview/depth_tracks.mp4`: depth QA
- `demo/depth_track_memory.json`: mask-aware object depth bands and per-frame ordering
- `demo/episodic_memory.json`: compact object-event episodes for retrieval / VLM context
- `demo/memory_answer.json`: deterministic memory answer with cited evidence
- `demo/memory_answer_gemini.json`: Gemini synthesis answer from the same retrieved evidence

## Construction Classes

The default detector prompt targets:

```text
worker, scaffold, concrete block wall, material stack, ladder, tool, guardrail, open edge
```

Add/remove classes in `tools/yolodex/config.json` before labeling.

## Where Gemini Robotics Fits

Gemini Robotics-ER can be used as a semantic box proposer, not as a mask
backend. It can return structured object points / bounding boxes for prompts
such as "open edge" or "worker laying block"; those boxes can feed this same
mask-track stage.

Recommended use:

```text
YOLO/Codex boxes for cheap frames
Gemini Robotics-ER boxes for selected semantic keyframes
SAM box-prompt masks
mask tracks -> depth -> episodic memory -> VLM synthesis
```

The current implementation uses real Hugging Face SAM box-prompt masks via
`facebook/sam-vit-base`. It still has a box-mask fallback for machines without
model weights, but committed demo outputs should report
`"mask_backend": "sam_hf_box_prompt"` in `demo/mask_track_memory.json`.

Run the Robotics-ER probe on a selected evidence frame:

```bash
.venv/bin/python demo/gemini_robotics_boxes.py \
  --image tools/yolodex/runs/vinna-hardhat/frames/frame_000001.jpg \
  --out demo/gemini_robotics_boxes.json
```

Dry-run the merge into the existing YOLO label file:

```bash
.venv/bin/python demo/merge_robotics_boxes.py --dry-run
```

The merge keeps YOLO/Codex boxes as the backbone, skips duplicates by class/IoU,
and adds Robotics-ER boxes for semantic misses such as `tool in hand`.

## Depth Stage

Depth is applied after masks so each object's depth is averaged over the mask,
not the whole box. The script supports:

- `--backend auto`: use a local Hugging Face depth pipeline if installed,
  otherwise fall back to a deterministic RGB geometric proxy.
- `--backend depth-anything`: require the Hugging Face depth pipeline.
- `--backend proxy`: always use the lightweight local proxy.

Depth Anything is not metric depth. It produces `relative_closeness` where
higher means closer to the camera. The overlay uses quantile-ranked
`near` / `mid` / `far` bands per frame so the demo shows relative spatial order,
while `absolute_depth_band` preserves fixed-threshold scores for audit.

## Episodic Memory

`demo/episodic_memory.py` compiles frame-level detections into event episodes:

- `masonry_work_candidate`
- `safety_edge_context`
- `scaffold_zone_visible`
- `material_staging_visible`
- `foreground_worker_present`

Each episode stores start/end time, evidence frames, involved object tracks,
relations, depth facts, confidence, and `query_text`. The VLM should retrieve
these episodes first, then answer from their cited evidence instead of watching
the whole raw clip.

## Answer Layer

`demo/answer_from_memory.py` is the final synthesis step:

```bash
python3 demo/answer_from_memory.py \
  --query "Was there masonry work happening near the wall?" \
  --provider heuristic \
  --out demo/memory_answer.json
```

For Gemini, the default transport is direct REST instead of the legacy
`google-generativeai` SDK path. The old SDK path stalled on this machine, while
the REST path completed quickly with the same API key:

```bash
python3 demo/answer_from_memory.py \
  --query "Was there masonry work happening near the wall?" \
  --provider gemini \
  --timeout-s 12 \
  --out demo/memory_answer_gemini.json
```

The JSON output always includes `retrieved_episodes`, so the answer can be
audited against frame names, episode ids, relations, and depth facts. If Gemini
times out or fails, the script records `fallback_used` / `error` and emits the
deterministic heuristic answer instead of hanging.

## Qwen-VL Probe

`demo/qwen_frame_qa.py` is an optional local/open-weights VLM harness. It
retrieves the same episodes, loads their evidence frames, and asks Qwen-VL to
answer from both pixels and memory:

```bash
python3 demo/qwen_frame_qa.py \
  --query "Was there masonry work happening near the wall?" \
  --model Qwen/Qwen2.5-VL-3B-Instruct \
  --out demo/qwen_answer.json
```

It is intentionally dependency-light until you choose to run it. Install the
Qwen stack only on a machine with enough RAM/VRAM:

```bash
python3 -m pip install "transformers>=4.51.0" qwen-vl-utils torch torchvision accelerate pillow
```

Use Qwen for the open-model comparison:

```text
raw Qwen on evidence frames
vs
Qwen + retrieved episodic memory
vs
Gemini + retrieved episodic memory
```
