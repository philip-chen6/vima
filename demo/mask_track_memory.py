#!/usr/bin/env python3
"""
Build mask tracks from Yolodex labels.

This is the SAM-ready stage of the VINNA perception stack:
  boxes -> masks -> persistent object tracks -> episodic memory

If a real SAM 2 backend is available later, it should replace
`make_prompt_mask`. The rest of the memory/tracking format can stay stable.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
from dataclasses import dataclass, field
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


DEFAULT_RUN_DIR = pathlib.Path("tools/yolodex/runs/vinna-hardhat")
DEFAULT_OUTPUT = pathlib.Path("demo/mask_track_memory.json")
DEFAULT_SAM_MODEL = "facebook/sam-vit-base"


@dataclass
class Detection:
    frame_name: str
    frame_index: int
    timestamp_s: float
    class_id: int
    label: str
    bbox: tuple[float, float, float, float]
    track_id: str | None = None
    mask_path: str | None = None
    mask_area_frac: float = 0.0
    centroid_norm: tuple[float, float] = (0.0, 0.0)


@dataclass
class TrackState:
    track_id: str
    label: str
    last_bbox: tuple[float, float, float, float]
    first_frame: str
    last_frame: str
    first_time_s: float
    last_time_s: float
    frames_seen: int = 1
    area_fracs: list[float] = field(default_factory=list)


class SamBoxMasker:
    """Box-prompt SAM backend using Hugging Face transformers."""

    def __init__(self, model_id: str) -> None:
        import torch
        from transformers import SamModel, SamProcessor

        self.torch = torch
        self.processor = SamProcessor.from_pretrained(model_id)
        self.model = SamModel.from_pretrained(model_id)
        self.model.eval()

    def masks_for_frame(self, image: Image.Image, detections: list[Detection]) -> dict[str, Image.Image]:
        if not detections:
            return {}

        boxes = [[list(det.bbox) for det in detections]]
        inputs = self.processor(image, input_boxes=boxes, return_tensors="pt")
        with self.torch.no_grad():
            outputs = self.model(**inputs)

        masks = self.processor.image_processor.post_process_masks(
            outputs.pred_masks.cpu(),
            inputs["original_sizes"].cpu(),
            inputs["reshaped_input_sizes"].cpu(),
        )[0]
        scores = outputs.iou_scores.cpu()[0]

        result: dict[str, Image.Image] = {}
        for index, det in enumerate(detections):
            best_idx = int(scores[index].argmax().item())
            mask_arr = masks[index, best_idx].numpy().astype("uint8") * 255
            result[det.track_id or f"det_{index}"] = Image.fromarray(mask_arr, mode="L")
        return result


def load_sam_masker(model_id: str) -> SamBoxMasker | None:
    try:
        return SamBoxMasker(model_id)
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: failed to load SAM backend ({exc}); falling back to box masks.")
        return None


def load_classes(path: pathlib.Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def parse_yolo_labels(frame_path: pathlib.Path, classes: list[str], frame_index: int, fps: float) -> list[Detection]:
    width, height = Image.open(frame_path).size
    label_path = frame_path.with_suffix(".txt")
    detections: list[Detection] = []
    if not label_path.exists():
        return detections

    for raw in label_path.read_text(encoding="utf-8").splitlines():
        parts = raw.strip().split()
        if len(parts) != 5:
            continue
        class_id = int(float(parts[0]))
        cx, cy, bw, bh = map(float, parts[1:])
        x1 = max(0.0, (cx - bw / 2.0) * width)
        y1 = max(0.0, (cy - bh / 2.0) * height)
        x2 = min(float(width), (cx + bw / 2.0) * width)
        y2 = min(float(height), (cy + bh / 2.0) * height)
        label = classes[class_id] if 0 <= class_id < len(classes) else f"class_{class_id}"
        detections.append(
            Detection(
                frame_name=frame_path.name,
                frame_index=frame_index,
                timestamp_s=round(frame_index / fps, 2),
                class_id=class_id,
                label=label,
                bbox=(x1, y1, x2, y2),
            )
        )
    return detections


def bbox_iou(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union else 0.0


def assign_tracks(frames: list[list[Detection]], iou_threshold: float) -> dict[str, TrackState]:
    active: dict[str, TrackState] = {}
    counters: dict[str, int] = {}
    tracks: dict[str, TrackState] = {}

    for detections in frames:
        used_track_ids: set[str] = set()
        for det in detections:
            candidates = [
                track
                for track in active.values()
                if track.label == det.label and track.track_id not in used_track_ids
            ]
            best = max(candidates, key=lambda t: bbox_iou(det.bbox, t.last_bbox), default=None)
            best_iou = bbox_iou(det.bbox, best.last_bbox) if best else 0.0

            if best and best_iou >= iou_threshold:
                track = best
                track.last_bbox = det.bbox
                track.last_frame = det.frame_name
                track.last_time_s = det.timestamp_s
                track.frames_seen += 1
            else:
                counters[det.label] = counters.get(det.label, 0) + 1
                prefix = det.label.replace(" ", "_")
                track = TrackState(
                    track_id=f"{prefix}_{counters[det.label]:02d}",
                    label=det.label,
                    last_bbox=det.bbox,
                    first_frame=det.frame_name,
                    last_frame=det.frame_name,
                    first_time_s=det.timestamp_s,
                    last_time_s=det.timestamp_s,
                )
                tracks[track.track_id] = track

            det.track_id = track.track_id
            used_track_ids.add(track.track_id)

        active = {track_id: tracks[track_id] for track_id in used_track_ids if track_id in tracks}

    return tracks


def make_prompt_mask(label: str, bbox: tuple[float, float, float, float], size: tuple[int, int]) -> Image.Image:
    """Create a SAM-shaped fallback mask from a box prompt.

    Worker masks are tapered/elliptical; rigid site objects keep rectangular
    support. This is deliberately replaceable with a true SAM 2 mask backend.
    """
    width, height = size
    x1, y1, x2, y2 = bbox
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    if label == "worker":
        body_top = y1 + (y2 - y1) * 0.18
        draw.ellipse((x1 + (x2 - x1) * 0.30, y1, x2 - (x2 - x1) * 0.30, y1 + (y2 - y1) * 0.22), fill=255)
        draw.rounded_rectangle((x1 + (x2 - x1) * 0.18, body_top, x2 - (x2 - x1) * 0.18, y2), radius=18, fill=255)
    elif label in {"scaffold", "ladder", "guardrail", "open edge"}:
        inset_x = (x2 - x1) * 0.08
        inset_y = (y2 - y1) * 0.04
        draw.rectangle((x1 + inset_x, y1 + inset_y, x2 - inset_x, y2 - inset_y), fill=255)
    else:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill=255)

    return mask


def mask_stats(mask: Image.Image) -> tuple[float, tuple[float, float]]:
    arr = mask.point(lambda value: 1 if value else 0)
    width, height = mask.size
    pixels = arr.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y]:
                xs.append(x)
                ys.append(y)
    if not xs:
        return 0.0, (0.0, 0.0)
    area_frac = len(xs) / float(width * height)
    centroid = (sum(xs) / len(xs) / width, sum(ys) / len(ys) / height)
    return round(area_frac, 4), (round(centroid[0], 3), round(centroid[1], 3))


def relation_events(detections: Iterable[Detection]) -> list[str]:
    dets = list(detections)
    events: list[str] = []
    workers = [det for det in dets if det.label == "worker"]
    walls = [det for det in dets if det.label == "concrete block wall"]
    edges = [det for det in dets if det.label in {"guardrail", "open edge"}]

    for worker in workers:
        for wall in walls:
            wx1, wy1, wx2, wy2 = worker.bbox
            expand = 0.20 * max(wx2 - wx1, wy2 - wy1)
            expanded = (wx1 - expand, wy1 - expand, wx2 + expand, wy2 + expand)
            if bbox_iou(expanded, wall.bbox) > 0:
                events.append(f"{worker.track_id}_near_{wall.track_id}")
    for worker in workers:
        for edge in edges:
            if bbox_iou(worker.bbox, edge.bbox) > 0:
                events.append(f"{worker.track_id}_edge_context_{edge.track_id}")
    return events


def draw_overlay(frame_path: pathlib.Path, detections: list[Detection], out_path: pathlib.Path, mask_dir: pathlib.Path) -> None:
    image = Image.open(frame_path).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 16)
    except OSError:
        font = ImageFont.load_default()

    palette = [
        (120, 220, 255, 92),
        (255, 196, 120, 92),
        (146, 255, 180, 92),
        (255, 142, 142, 92),
        (210, 180, 255, 92),
    ]

    for det in detections:
        mask = Image.open(mask_dir / f"{frame_path.stem}_{det.track_id}.png").convert("L")
        color = palette[abs(hash(det.track_id)) % len(palette)]
        colored = Image.new("RGBA", image.size, color)
        overlay.alpha_composite(Image.composite(colored, Image.new("RGBA", image.size, (0, 0, 0, 0)), mask))
        x1, y1, x2, y2 = det.bbox
        draw.rectangle((x1, y1, x2, y2), outline=color[:3] + (220,), width=3)
        draw.text((x1 + 4, max(0, y1 - 18)), det.track_id or det.label, fill=color[:3] + (255,), font=font)

    image.alpha_composite(overlay)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(out_path)


def encode_video(preview_dir: pathlib.Path, video_out: pathlib.Path, framerate: int) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate",
        str(framerate),
        "-i",
        str(preview_dir / "frame_%06d.jpg"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(video_out),
    ]
    subprocess.run(cmd, check=True)


def build_mask_memory(
    run_dir: pathlib.Path,
    out: pathlib.Path,
    fps: float,
    iou_threshold: float,
    mask_backend: str,
    sam_model: str,
) -> dict:
    frames_dir = run_dir / "frames"
    classes = load_classes(run_dir / "classes.txt")
    frame_paths = sorted(frames_dir.glob("frame_*.jpg"))
    frame_detections = [
        parse_yolo_labels(frame_path, classes, index, fps)
        for index, frame_path in enumerate(frame_paths)
    ]
    tracks = assign_tracks(frame_detections, iou_threshold=iou_threshold)

    mask_dir = run_dir / "masks"
    preview_dir = run_dir / "mask_preview"
    mask_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    sam_masker = load_sam_masker(sam_model) if mask_backend in {"auto", "sam"} else None
    if mask_backend == "sam" and sam_masker is None:
        raise RuntimeError("SAM backend requested but could not be loaded.")
    backend_used = "sam_hf_box_prompt" if sam_masker else "box_prompt_fallback"

    memory_rows = []
    for frame_path, detections in zip(frame_paths, frame_detections, strict=True):
        image = Image.open(frame_path)
        sam_masks = sam_masker.masks_for_frame(image.convert("RGB"), detections) if sam_masker else {}
        for det in detections:
            if not det.track_id:
                continue
            mask = sam_masks.get(det.track_id) or make_prompt_mask(det.label, det.bbox, image.size)
            mask_name = f"{frame_path.stem}_{det.track_id}.png"
            mask.save(mask_dir / mask_name)
            det.mask_path = str(mask_dir / mask_name)
            det.mask_area_frac, det.centroid_norm = mask_stats(mask)
            tracks[det.track_id].area_fracs.append(det.mask_area_frac)

        draw_overlay(frame_path, detections, preview_dir / frame_path.name, mask_dir)
        memory_rows.append(
            {
                "frame": frame_path.name,
                "timestamp_s": detections[0].timestamp_s if detections else 0.0,
                "objects": [
                    {
                        "track_id": det.track_id,
                        "label": det.label,
                        "bbox_xyxy": [round(v, 1) for v in det.bbox],
                        "mask_path": det.mask_path,
                        "mask_area_frac": det.mask_area_frac,
                        "centroid_norm": list(det.centroid_norm),
                    }
                    for det in detections
                ],
                "relations": relation_events(detections),
            }
        )

    video_out = preview_dir / "mask_tracks.mp4"
    try:
        encode_video(preview_dir, video_out, framerate=2)
    except (FileNotFoundError, subprocess.CalledProcessError):
        video_out = None

    track_rows = []
    for track in tracks.values():
        mean_area = sum(track.area_fracs) / len(track.area_fracs) if track.area_fracs else 0.0
        track_rows.append(
            {
                "track_id": track.track_id,
                "label": track.label,
                "first_frame": track.first_frame,
                "last_frame": track.last_frame,
                "time_start_s": track.first_time_s,
                "time_end_s": track.last_time_s,
                "frames_seen": track.frames_seen,
                "mean_mask_area_frac": round(mean_area, 4),
            }
        )

    result = {
        "metadata": {
            "tool": "VINNA box-prompt mask tracks",
            "run_dir": str(run_dir),
            "fps": fps,
            "mask_backend": backend_used,
            "sam_model": sam_model if backend_used == "sam_hf_box_prompt" else None,
            "sam2_ready": True,
            "preview_video": str(video_out) if video_out else None,
        },
        "tracks": track_rows,
        "memory": memory_rows,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--fps", type=float, default=0.1)
    parser.add_argument("--iou-threshold", type=float, default=0.18)
    parser.add_argument("--mask-backend", choices=["auto", "sam", "box"], default="auto")
    parser.add_argument("--sam-model", default=DEFAULT_SAM_MODEL)
    args = parser.parse_args()

    result = build_mask_memory(
        pathlib.Path(args.run_dir),
        pathlib.Path(args.out),
        args.fps,
        args.iou_threshold,
        args.mask_backend,
        args.sam_model,
    )
    print(
        f"wrote {args.out} with {len(result['memory'])} frames "
        f"and {len(result['tracks'])} tracks, backend={result['metadata']['mask_backend']}"
    )
    if result["metadata"]["preview_video"]:
        print(f"preview: {result['metadata']['preview_video']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
