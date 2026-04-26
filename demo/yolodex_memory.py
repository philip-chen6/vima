#!/usr/bin/env python3
"""
Build VINNA object-event memory from Yolodex YOLO labels.

No training. This consumes:
  tools/yolodex/runs/<project>/frames/frame_*.jpg
  tools/yolodex/runs/<project>/frames/frame_*.txt
  tools/yolodex/runs/<project>/classes.txt

and emits:
  demo/object_event_memory.json
"""

from __future__ import annotations

import argparse
import json
import pathlib
from collections import Counter

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Pillow is required. Run from tools/yolodex with uv sync first.") from exc


DEFAULT_RUN_DIR = pathlib.Path("tools/yolodex/runs/vinna-hardhat")
DEFAULT_OUTPUT = pathlib.Path("demo/object_event_memory.json")


def load_classes(path: pathlib.Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"classes file not found: {path}")
    return [line.strip() for line in path.read_text().splitlines() if line.strip()]


def yolo_to_box(line: str, width: int, height: int, classes: list[str]) -> dict | None:
    parts = line.split()
    if len(parts) != 5:
        return None

    class_id = int(float(parts[0]))
    cx, cy, bw, bh = map(float, parts[1:])
    x1 = max(0, (cx - bw / 2) * width)
    y1 = max(0, (cy - bh / 2) * height)
    x2 = min(width, (cx + bw / 2) * width)
    y2 = min(height, (cy + bh / 2) * height)
    label = classes[class_id] if 0 <= class_id < len(classes) else f"class_{class_id}"

    area = max(0, x2 - x1) * max(0, y2 - y1)
    center_x = (x1 + x2) / 2 / width if width else 0
    center_y = (y1 + y2) / 2 / height if height else 0
    depth_hint = "near" if area / max(width * height, 1) > 0.18 else "mid" if area / max(width * height, 1) > 0.05 else "far"

    return {
        "label": label,
        "bbox_xyxy": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
        "center_norm": [round(center_x, 3), round(center_y, 3)],
        "area_frac": round(area / max(width * height, 1), 4),
        "depth_hint": depth_hint,
    }


def infer_events(objects: list[dict]) -> list[str]:
    labels = {obj["label"] for obj in objects}
    events: list[str] = []

    if "worker" in labels and "concrete block wall" in labels:
        events.append("worker_near_block_wall")
    if "worker" in labels and "tool" in labels:
        events.append("worker_tool_interaction_candidate")
    if "scaffold" in labels:
        events.append("scaffold_visible")
    if "material stack" in labels:
        events.append("material_staging_visible")
    if "guardrail" in labels or "open edge" in labels:
        events.append("safety_edge_context")
    if not events and objects:
        events.append("objects_visible")
    if not objects:
        events.append("no_target_objects_detected")

    return events


def build_memory(run_dir: pathlib.Path) -> dict:
    frames_dir = run_dir / "frames"
    classes = load_classes(run_dir / "classes.txt")
    frame_paths = sorted(frames_dir.glob("frame_*.jpg"))
    if not frame_paths:
        raise FileNotFoundError(f"no frames found in {frames_dir}")

    rows = []
    event_counts: Counter[str] = Counter()
    object_counts: Counter[str] = Counter()

    for index, frame_path in enumerate(frame_paths):
        width, height = Image.open(frame_path).size
        label_path = frame_path.with_suffix(".txt")
        objects = []
        if label_path.exists():
            for raw in label_path.read_text().splitlines():
                box = yolo_to_box(raw.strip(), width, height, classes)
                if box:
                    objects.append(box)
                    object_counts[box["label"]] += 1

        events = infer_events(objects)
        event_counts.update(events)

        rows.append({
            "frame": frame_path.name,
            "frame_path": str(frame_path),
            "frame_index": index,
            "timestamp_s": round(index * 2.0, 2),
            "objects": objects,
            "events": events,
            "query_text": " ".join([*events, *[obj["label"] for obj in objects]]),
        })

    return {
        "metadata": {
            "tool": "VINNA object-event memory from vendored Yolodex labels",
            "run_dir": str(run_dir),
            "frames": len(rows),
            "classes": classes,
            "note": "timestamp_s assumes config fps=0.5 unless replaced by exact frame timestamps",
        },
        "summary": {
            "object_counts": dict(object_counts),
            "event_counts": dict(event_counts),
        },
        "memory": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    memory = build_memory(pathlib.Path(args.run_dir))
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(memory, indent=2))
    print(f"wrote {out} with {len(memory['memory'])} memory rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
