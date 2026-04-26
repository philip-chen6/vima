#!/usr/bin/env python3
"""
Add mask-aware depth to VINNA object tracks.

The preferred backend is a monocular depth model such as Depth Anything V2 via
Hugging Face transformers. The script also includes a deterministic geometric
proxy so the pipeline can run without heavyweight model weights:

  mask tracks -> per-frame depth map -> per-object depth bands -> depth memory
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


DEFAULT_INPUT = pathlib.Path("demo/mask_track_memory.json")
DEFAULT_OUTPUT = pathlib.Path("demo/depth_track_memory.json")
DEFAULT_YOLODEX_ROOT = pathlib.Path("tools/yolodex")
DEFAULT_HF_MODEL = "depth-anything/Depth-Anything-V2-Small-hf"


@dataclass
class DepthResult:
    depth: np.ndarray
    backend: str


def normalize(arr: np.ndarray) -> np.ndarray:
    arr = arr.astype(np.float32)
    mn = float(np.min(arr))
    mx = float(np.max(arr))
    if mx - mn < 1e-6:
        return np.zeros_like(arr, dtype=np.float32)
    return (arr - mn) / (mx - mn)


def load_hf_pipeline(model_id: str) -> Any | None:
    try:
        from transformers import pipeline  # type: ignore
    except ImportError:
        return None

    try:
        return pipeline("depth-estimation", model=model_id)
    except Exception:
        return None


def estimate_depth_hf(image: Image.Image, pipe: Any) -> np.ndarray:
    result = pipe(image)
    depth_image = result["depth"]
    if not isinstance(depth_image, Image.Image):
        depth_image = Image.fromarray(np.asarray(depth_image))
    return normalize(np.asarray(depth_image.resize(image.size), dtype=np.float32))


def estimate_depth_proxy(image: Image.Image) -> np.ndarray:
    """Create a deterministic relative-closeness map from monocular cues.

    This is not metric depth. It is a cheap RGB-only pseudo-sensor:
    lower image rows, darker high-contrast foreground, and central fisheye
    regions score closer to the camera.
    """
    width, height = image.size
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    gray = np.asarray(ImageOps.grayscale(image), dtype=np.float32) / 255.0

    yy, xx = np.mgrid[0:height, 0:width]
    y_norm = yy / max(height - 1, 1)
    x_norm = xx / max(width - 1, 1)
    center_dist = np.sqrt((x_norm - 0.5) ** 2 + (y_norm - 0.58) ** 2)
    center_prior = 1.0 - normalize(center_dist)

    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = np.abs(gray[:, 2:] - gray[:, :-2])
    gy[1:-1, :] = np.abs(gray[2:, :] - gray[:-2, :])
    edge = normalize(gx + gy)

    saturation = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    dark_foreground = 1.0 - gray

    closeness = (
        0.58 * y_norm
        + 0.18 * center_prior
        + 0.14 * edge
        + 0.10 * dark_foreground * (0.5 + saturation)
    )
    return normalize(closeness)


def estimate_depth(image: Image.Image, backend: str, pipe: Any | None) -> DepthResult:
    if backend in {"auto", "depth-anything"} and pipe is not None:
        try:
            return DepthResult(estimate_depth_hf(image, pipe), "depth_anything_hf")
        except Exception:
            if backend == "depth-anything":
                raise
    return DepthResult(estimate_depth_proxy(image), "geometric_proxy")


def depth_to_image(depth: np.ndarray) -> Image.Image:
    arr = (normalize(depth) * 255).astype(np.uint8)
    return Image.fromarray(arr, mode="L")


def colorize_depth(depth: np.ndarray) -> Image.Image:
    norm = normalize(depth)
    h, w = norm.shape
    out = np.zeros((h, w, 3), dtype=np.uint8)
    far = np.array([18, 24, 32], dtype=np.float32)
    mid = np.array([127, 96, 70], dtype=np.float32)
    near = np.array([244, 205, 137], dtype=np.float32)
    low = norm < 0.55
    high = ~low
    out[low] = (far + (mid - far) * (norm[low][..., None] / 0.55)).astype(np.uint8)
    out[high] = (mid + (near - mid) * ((norm[high][..., None] - 0.55) / 0.45)).astype(np.uint8)
    return Image.fromarray(out, mode="RGB")


def resolve_run_dir(memory: dict[str, Any], yolodex_root: pathlib.Path) -> pathlib.Path:
    run_dir = pathlib.Path(memory["metadata"]["run_dir"])
    if run_dir.is_absolute():
        return run_dir
    if (yolodex_root / run_dir).exists():
        return yolodex_root / run_dir
    return run_dir


def resolve_mask_path(raw_path: str | None, yolodex_root: pathlib.Path) -> pathlib.Path | None:
    if not raw_path:
        return None
    path = pathlib.Path(raw_path)
    if path.is_absolute() or path.exists():
        return path
    if (yolodex_root / path).exists():
        return yolodex_root / path
    return path


def read_mask(mask_path: pathlib.Path, size: tuple[int, int]) -> np.ndarray:
    mask = Image.open(mask_path).convert("L").resize(size)
    return np.asarray(mask, dtype=np.uint8) > 0


def band(score: float) -> str:
    if score >= 0.66:
        return "near"
    if score >= 0.38:
        return "mid"
    return "far"


def draw_depth_preview(
    frame: Image.Image,
    depth: np.ndarray,
    objects: list[dict[str, Any]],
    out_path: pathlib.Path,
) -> None:
    base = frame.convert("RGBA")
    depth_rgba = colorize_depth(depth).convert("RGBA")
    blended = Image.blend(base, depth_rgba, 0.38)
    draw = ImageDraw.Draw(blended)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 15)
    except OSError:
        font = ImageFont.load_default()

    for obj in objects:
        x1, y1, x2, y2 = obj["bbox_xyxy"]
        depth_info = obj.get("depth", {})
        label = f"{obj.get('track_id', '?')}:{depth_info.get('band', '?')}"
        color = (246, 210, 145, 255) if depth_info.get("band") == "near" else (132, 212, 255, 255)
        draw.rectangle((x1, y1, x2, y2), outline=color, width=3)
        draw.text((x1 + 4, max(0, y1 - 17)), label, fill=color, font=font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    blended.convert("RGB").save(out_path)


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


def build_depth_memory(
    input_path: pathlib.Path,
    output_path: pathlib.Path,
    yolodex_root: pathlib.Path,
    backend: str,
    hf_model: str,
) -> dict[str, Any]:
    memory = json.loads(input_path.read_text(encoding="utf-8"))
    run_dir = resolve_run_dir(memory, yolodex_root)
    depth_dir = run_dir / "depth"
    preview_dir = run_dir / "depth_preview"
    depth_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    pipe = load_hf_pipeline(hf_model) if backend in {"auto", "depth-anything"} else None
    backends_used: set[str] = set()
    enriched_rows = []
    track_scores: dict[str, list[float]] = {}

    for row in memory["memory"]:
        frame_path = run_dir / "frames" / row["frame"]
        frame = Image.open(frame_path).convert("RGB")
        depth_result = estimate_depth(frame, backend, pipe)
        backends_used.add(depth_result.backend)
        depth = depth_result.depth

        depth_png = depth_dir / row["frame"].replace(".jpg", "_depth.png")
        depth_to_image(depth).save(depth_png)

        enriched_objects = []
        for obj in row["objects"]:
            mask_path = resolve_mask_path(obj.get("mask_path"), yolodex_root)
            if mask_path and mask_path.exists():
                mask = read_mask(mask_path, frame.size)
            else:
                x1, y1, x2, y2 = [int(round(v)) for v in obj["bbox_xyxy"]]
                mask = np.zeros(depth.shape, dtype=bool)
                mask[max(0, y1):min(depth.shape[0], y2), max(0, x1):min(depth.shape[1], x2)] = True

            values = depth[mask]
            score = float(np.mean(values)) if values.size else 0.0
            p10 = float(np.quantile(values, 0.10)) if values.size else 0.0
            p90 = float(np.quantile(values, 0.90)) if values.size else 0.0
            track_id = obj.get("track_id") or "unknown_track"
            track_scores.setdefault(track_id, []).append(score)

            enriched = dict(obj)
            enriched["depth"] = {
                "relative_closeness": round(score, 4),
                "band": band(score),
                "p10": round(p10, 4),
                "p90": round(p90, 4),
                "source": depth_result.backend,
            }
            enriched_objects.append(enriched)

        ordered = sorted(
            enriched_objects,
            key=lambda item: item["depth"]["relative_closeness"],
            reverse=True,
        )
        for rank, obj in enumerate(ordered, start=1):
            obj["depth"]["rank_closest_in_frame"] = rank

        draw_depth_preview(frame, depth, enriched_objects, preview_dir / row["frame"])
        enriched_rows.append({
            **row,
            "depth_map_path": str(depth_png),
            "objects": enriched_objects,
            "depth_order_closest_first": [
                obj.get("track_id") for obj in ordered if obj.get("track_id")
            ],
        })

    track_depth = []
    for track in memory["tracks"]:
        scores = track_scores.get(track["track_id"], [])
        mean_score = float(np.mean(scores)) if scores else 0.0
        track_depth.append({
            **track,
            "mean_relative_closeness": round(mean_score, 4),
            "depth_band": band(mean_score),
        })

    video_out = preview_dir / "depth_tracks.mp4"
    try:
        encode_video(preview_dir, video_out, framerate=2)
    except (FileNotFoundError, subprocess.CalledProcessError):
        video_out = None

    result = {
        "metadata": {
            "tool": "VINNA mask-aware depth memory",
            "input": str(input_path),
            "run_dir": str(run_dir),
            "backend_requested": backend,
            "backends_used": sorted(backends_used),
            "hf_model": hf_model if "depth_anything_hf" in backends_used else None,
            "depth_semantics": "higher relative_closeness means closer to camera",
            "preview_video": str(video_out) if video_out else None,
        },
        "tracks": track_depth,
        "memory": enriched_rows,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--yolodex-root", default=str(DEFAULT_YOLODEX_ROOT))
    parser.add_argument("--backend", choices=["auto", "depth-anything", "proxy"], default="auto")
    parser.add_argument("--hf-model", default=DEFAULT_HF_MODEL)
    args = parser.parse_args()

    result = build_depth_memory(
        pathlib.Path(args.input),
        pathlib.Path(args.out),
        pathlib.Path(args.yolodex_root),
        args.backend,
        args.hf_model,
    )
    print(
        f"wrote {args.out} with {len(result['memory'])} frames, "
        f"{len(result['tracks'])} tracks, backend={','.join(result['metadata']['backends_used'])}"
    )
    if result["metadata"]["preview_video"]:
        print(f"preview: {result['metadata']['preview_video']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
