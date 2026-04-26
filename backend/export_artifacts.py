#!/usr/bin/env python3
"""Package VIMA intermediate artifacts for teammates and judges."""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil
from datetime import datetime, timezone
from typing import Any


DEFAULT_RUN_DIR = pathlib.Path("tools/yolodex/runs/vima-hardhat")
DEFAULT_OUT_DIR = pathlib.Path("artifacts")
DEFAULT_JSONS = [
    pathlib.Path("demo/gemini_robotics_boxes.json"),
    pathlib.Path("demo/mask_track_memory.json"),
    pathlib.Path("demo/depth_track_memory.json"),
    pathlib.Path("demo/episodic_memory.json"),
    pathlib.Path("demo/memory_answer_gemini.json"),
]


def copy_file(src: pathlib.Path, dst: pathlib.Path, copied: list[dict[str, Any]], required: bool = False) -> None:
    if not src.exists():
        if required:
            raise FileNotFoundError(src)
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    copied.append({"source": str(src), "dest": str(dst), "bytes": dst.stat().st_size})


def copy_glob(
    pattern: str,
    dst_dir: pathlib.Path,
    copied: list[dict[str, Any]],
    limit: int,
) -> None:
    paths = sorted(pathlib.Path().glob(pattern))
    for src in paths[:limit]:
        copy_file(src, dst_dir / src.name, copied)


def write_markdown(
    bundle_dir: pathlib.Path,
    manifest: dict[str, Any],
    query: str,
) -> None:
    lines = [
        "# VIMA Share Bundle",
        "",
        f"Created: `{manifest['created_at']}`",
        f"Run dir: `{manifest['run_dir']}`",
        f"Query: `{query}`",
        "",
        "## What Is Inside",
        "",
        "- `labels/`: sampled frames, YOLO labels, and class map",
        "- `previews/`: label, mask, and depth preview videos/images",
        "- `masks/`: subset of SAM mask PNGs",
        "- `depth/`: subset of raw relative-depth maps",
        "- `memory/`: Robotics boxes, mask/depth memory, episodes, final answer",
        "- `manifest.json`: exact copied file list",
        "",
        "## Demo Story",
        "",
        "VIMA uses cheap/object-level labels plus optional Gemini Robotics-ER semantic boxes,",
        "turns merged boxes into SAM masks, adds depth, compiles object-event episodes,",
        "then asks Gemini to answer from cited spatial evidence instead of raw video alone.",
        "",
    ]
    (bundle_dir / "README.md").write_text("\n".join(lines), encoding="utf-8")


def build_bundle(
    run_dir: pathlib.Path,
    out_dir: pathlib.Path,
    name: str,
    query: str,
    limit: int,
    make_zip: bool,
) -> dict[str, Any]:
    bundle_dir = out_dir / name
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir)
    bundle_dir.mkdir(parents=True, exist_ok=True)

    copied: list[dict[str, Any]] = []
    copy_file(run_dir / "classes.txt", bundle_dir / "labels/classes.txt", copied)

    copy_glob(str(run_dir / "frames/frame_*.jpg"), bundle_dir / "labels/frames", copied, limit)
    copy_glob(str(run_dir / "frames/frame_*.txt"), bundle_dir / "labels/yolo_txt", copied, limit)
    copy_glob(str(run_dir / "frames/preview/frame_*.jpg"), bundle_dir / "previews/label_frames", copied, limit)
    copy_file(run_dir / "frames/preview/preview.mp4", bundle_dir / "previews/labels_preview.mp4", copied)

    copy_glob(str(run_dir / "masks/*.png"), bundle_dir / "masks", copied, limit * 6)
    copy_glob(str(run_dir / "mask_preview/frame_*.jpg"), bundle_dir / "previews/mask_frames", copied, limit)
    copy_file(run_dir / "mask_preview/mask_tracks.mp4", bundle_dir / "previews/mask_tracks.mp4", copied)

    copy_glob(str(run_dir / "depth/frame_*_depth.png"), bundle_dir / "depth", copied, limit)
    copy_glob(str(run_dir / "depth_preview/frame_*.jpg"), bundle_dir / "previews/depth_frames", copied, limit)
    copy_file(run_dir / "depth_preview/depth_tracks.mp4", bundle_dir / "previews/depth_tracks.mp4", copied)

    for src in DEFAULT_JSONS:
        copy_file(src, bundle_dir / "memory" / src.name, copied)

    manifest = {
        "name": name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "run_dir": str(run_dir),
        "query": query,
        "subset_limit": limit,
        "copied_files": copied,
    }
    write_markdown(bundle_dir, manifest, query)
    manifest_path = bundle_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    zip_path = None
    if make_zip:
        zip_path = shutil.make_archive(str(bundle_dir), "zip", root_dir=bundle_dir)
        manifest["zip_path"] = zip_path
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return {"bundle_dir": str(bundle_dir), "zip_path": zip_path, "files": len(copied)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    parser.add_argument("--name", default="vima_share")
    parser.add_argument("--query", default="Was there masonry work happening near the wall?")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--no-zip", action="store_true")
    args = parser.parse_args()

    result = build_bundle(
        pathlib.Path(args.run_dir),
        pathlib.Path(args.out_dir),
        args.name,
        args.query,
        args.limit,
        not args.no_zip,
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
