#!/usr/bin/env python3
"""Merge Gemini Robotics-ER boxes into YOLO label files for SAM/depth stages."""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil
from typing import Any

from PIL import Image


DEFAULT_RUN_DIR = pathlib.Path("tools/yolodex/runs/vinna-hardhat")
DEFAULT_ROBOTICS = pathlib.Path("demo/gemini_robotics_boxes.json")


ALIASES = {
    "tool in hand": "tool",
    "guardrail or open edge": "guardrail",
    "block wall": "concrete block wall",
}


def load_classes(path: pathlib.Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def canonical_label(label: str, classes: list[str]) -> str | None:
    clean = label.strip().lower()
    clean = ALIASES.get(clean, clean)
    if clean in classes:
        return clean
    for cls in classes:
        if cls in clean or clean in cls:
            return cls
    return None


def pixel_xyxy_to_yolo(box: list[int | float], width: int, height: int) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = [float(v) for v in box]
    x1 = max(0.0, min(width, x1))
    x2 = max(0.0, min(width, x2))
    y1 = max(0.0, min(height, y1))
    y2 = max(0.0, min(height, y2))
    if x2 < x1:
        x1, x2 = x2, x1
    if y2 < y1:
        y1, y2 = y2, y1
    return (
        ((x1 + x2) / 2) / width,
        ((y1 + y2) / 2) / height,
        max(0.0, (x2 - x1) / width),
        max(0.0, (y2 - y1) / height),
    )


def yolo_to_xyxy(row: str, width: int, height: int) -> tuple[int, float, float, float, float]:
    cls, xc, yc, bw, bh = row.split()[:5]
    x_center = float(xc) * width
    y_center = float(yc) * height
    box_w = float(bw) * width
    box_h = float(bh) * height
    return (
        int(cls),
        x_center - box_w / 2,
        y_center - box_h / 2,
        x_center + box_w / 2,
        y_center + box_h / 2,
    )


def iou(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    denom = area_a + area_b - inter
    return inter / denom if denom else 0.0


def merge_boxes(
    robotics_path: pathlib.Path,
    run_dir: pathlib.Path,
    frame_name: str | None,
    iou_threshold: float,
    dry_run: bool,
) -> dict[str, Any]:
    payload = json.loads(robotics_path.read_text(encoding="utf-8"))
    classes = load_classes(run_dir / "classes.txt")
    image_path = pathlib.Path(payload["image"])
    if frame_name:
        image_path = run_dir / "frames" / frame_name
    label_path = image_path.with_suffix(".txt")
    width, height = Image.open(image_path).size

    existing_rows = label_path.read_text(encoding="utf-8").splitlines() if label_path.exists() else []
    existing_boxes = [yolo_to_xyxy(row, width, height) for row in existing_rows if row.strip()]
    additions: list[str] = []
    skipped: list[dict[str, Any]] = []

    for box in payload.get("boxes", []):
        label = canonical_label(str(box.get("label", "")), classes)
        if label is None or not box.get("pixel_xyxy"):
            skipped.append({"box": box, "reason": "unknown_label"})
            continue
        class_id = classes.index(label)
        x1, y1, x2, y2 = [float(v) for v in box["pixel_xyxy"]]
        duplicate = any(
            existing_cls == class_id and iou((x1, y1, x2, y2), existing_xyxy) >= iou_threshold
            for existing_cls, *existing_xyxy in existing_boxes
        )
        if duplicate:
            skipped.append({"box": box, "reason": "duplicate"})
            continue
        xc, yc, bw, bh = pixel_xyxy_to_yolo(box["pixel_xyxy"], width, height)
        additions.append(f"{class_id} {xc:.4f} {yc:.4f} {bw:.4f} {bh:.4f}")

    if additions and not dry_run:
        backup = label_path.with_suffix(".txt.bak")
        if label_path.exists() and not backup.exists():
            shutil.copy2(label_path, backup)
        label_path.write_text(
            "\n".join([*existing_rows, *additions]).strip() + "\n",
            encoding="utf-8",
        )

    return {
        "image": str(image_path),
        "label_path": str(label_path),
        "dry_run": dry_run,
        "added": additions,
        "skipped": skipped,
        "classes": classes,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--robotics", default=str(DEFAULT_ROBOTICS))
    parser.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    parser.add_argument("--frame-name")
    parser.add_argument("--iou-threshold", type=float, default=0.5)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    result = merge_boxes(
        pathlib.Path(args.robotics),
        pathlib.Path(args.run_dir),
        args.frame_name,
        args.iou_threshold,
        args.dry_run,
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
