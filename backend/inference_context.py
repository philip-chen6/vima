"""
Loader for the precomputed depth + SAM inference manifest.

The manifest is built offline by backend/scripts/precompute_inference.py and
ships as a static asset under frontend/public/inference/manifest.json. It
contains per-frame:
  - raw monocular depth statistics (depth-anything-v2-small): min/max/mean,
    p10/p50/p90, quadrant means
  - SAM segment list: bbox, centroid, area, score, depth-under-mask stats

This module exposes a tiny API:
    get_inference_context(frame_filename) -> dict | None

The dict is shaped to be dropped straight into a judge prompt as JSON. If the
frame isn't in the manifest (e.g. live-uploaded user frame, not part of the
fixed masonry set), returns None and the caller should fall back to the old
geometry-stats-only flow.
"""
from __future__ import annotations
import json
import pathlib
from typing import Optional

# Manifest sits under the frontend's public dir so it's both judge-readable
# (Python) and browser-fetchable (JSON). Single source of truth.
_MANIFEST_PATH = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "public" / "inference" / "manifest.json"

# Cache the manifest in-process — it's <1MB and immutable per deploy.
_cached: Optional[dict[str, dict]] = None


def _load() -> dict[str, dict]:
    global _cached
    if _cached is not None:
        return _cached
    if not _MANIFEST_PATH.exists():
        _cached = {}
        return _cached
    raw = json.loads(_MANIFEST_PATH.read_text())
    # Index by both filename ("frame_0013_00026000.jpg") and frame_id
    # ("frame_0013_00026000") so callers can pass either.
    idx: dict[str, dict] = {}
    for entry in raw:
        idx[entry["filename"]] = entry
        idx[entry["frame_id"]] = entry
    _cached = idx
    return _cached


def get_inference_context(frame_filename: str) -> Optional[dict]:
    """Return the precomputed depth + segment context for a frame, or None.

    Accepts either the full filename ('frame_0013_00026000.jpg') or the
    bare frame_id ('frame_0013_00026000'). Also accepts an absolute path —
    we strip to the basename.
    """
    if not frame_filename:
        return None
    name = pathlib.Path(frame_filename).name
    stem = pathlib.Path(frame_filename).stem
    idx = _load()
    return idx.get(name) or idx.get(stem)


def build_judge_payload(frame_filename: str, top_k_segments: int = 12) -> Optional[dict]:
    """Return a compact judge-prompt-friendly payload.

    We trim to the top-K largest segments to keep the prompt under control —
    50+ segments per frame is too noisy for the judge and most are tiny
    background patches. Sorting by area descending picks the salient ones.
    """
    ctx = get_inference_context(frame_filename)
    if ctx is None:
        return None

    depth = ctx["depth"]
    segments = sorted(
        ctx["mask"].get("segments", []),
        key=lambda s: s.get("area_frac", 0),
        reverse=True,
    )[:top_k_segments]

    # Compact each segment: drop pixel-coord bbox/centroid (judge can't reason
    # about pixels), keep normalized centroid + area_frac + relative depth.
    compact_segs = []
    for s in segments:
        item = {
            "id": s["id"],
            "centroid": s["centroid_norm"],  # [x_frac, y_frac] in [0,1]
            "area_frac": s["area_frac"],
            "score": round(s["score"], 2),
        }
        if "depth_median_raw" in s:
            item["rel_depth"] = round(s["depth_median_raw"], 3)
        compact_segs.append(item)

    return {
        "depth_stats": {
            # Raw depth-anything-v2 inverse-depth values. Larger = closer to
            # camera. Useful for relative ordering, not metric.
            "p10": round(depth["depth_p10"], 3),
            "p50_median": round(depth["depth_p50"], 3),
            "p90": round(depth["depth_p90"], 3),
            "quadrant_means": {
                k: round(v, 3) for k, v in depth["depth_quadrants"].items()
            },
            "_units": "depth-anything-v2 inverse depth, larger=closer (relative, not metric)",
        },
        "segments": compact_segs,
        "_segments_meta": {
            "total_detected": ctx["mask"]["n_masks"],
            "shown_top_k_by_area": len(compact_segs),
            "method": "SAM-ViT-base, 8x8 prompt grid",
            "centroid_units": "normalized [x_frac, y_frac] in [0,1]",
        },
    }
