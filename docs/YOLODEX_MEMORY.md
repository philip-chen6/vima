# Yolodex Object Memory Stage

VINNA vendors the working Yolodex collect/label/preview stages under
`tools/yolodex/`. Training and augmentation are intentionally omitted.

## Purpose

```text
hardhat video
  -> sampled frames
  -> Gemini/Yolodex bounding boxes
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
uv run .agents/skills/label/scripts/label_gemini.py
uv run .agents/skills/eval/scripts/preview_labels.py runs/vinna-hardhat/frames --classes runs/vinna-hardhat/classes.txt --out-dir runs/vinna-hardhat/frames/preview --limit 0 --video-out runs/vinna-hardhat/frames/preview/preview.mp4
```

Back at the repo root:

```bash
python3 demo/yolodex_memory.py --run-dir tools/yolodex/runs/vinna-hardhat --out demo/object_event_memory.json
```

## Output

- `tools/yolodex/runs/vinna-hardhat/frames/*.txt`: YOLO-format labels
- `tools/yolodex/runs/vinna-hardhat/classes.txt`: class map
- `tools/yolodex/runs/vinna-hardhat/frames/preview/preview.mp4`: visual QA
- `demo/object_event_memory.json`: timestamped object/event rows for VINNA

## Construction Classes

The default detector prompt targets:

```text
worker, scaffold, concrete block wall, material stack, ladder, tool, guardrail, open edge
```

Add/remove classes in `tools/yolodex/config.json` before labeling.
