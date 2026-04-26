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
SAM 2 or box-prompt fallback for masks
mask tracks -> depth -> episodic memory -> VLM synthesis
```

The current implementation uses a box-prompt mask fallback so the pipeline runs
without SAM 2 weights. Replace `make_prompt_mask` in `demo/mask_track_memory.py`
with a SAM 2 backend when the dependency is available; keep the JSON schema.

## Depth Stage

Depth is applied after masks so each object's depth is averaged over the mask,
not the whole box. The script supports:

- `--backend auto`: use a local Hugging Face depth pipeline if installed,
  otherwise fall back to a deterministic RGB geometric proxy.
- `--backend depth-anything`: require the Hugging Face depth pipeline.
- `--backend proxy`: always use the lightweight local proxy.

The fallback is not metric depth. It produces `relative_closeness` where higher
means closer to the camera, plus `near` / `mid` / `far` bands. This is enough to
feed spatial memory and can be swapped for Depth Anything V2 without changing
the downstream JSON shape.
