#!/usr/bin/env python3
"""Small CLI wrapper for the VIMA hardhat memory pipeline."""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys


DEFAULT_RUN_DIR = pathlib.Path("tools/yolodex/runs/vima-hardhat")
DEFAULT_FRAME = DEFAULT_RUN_DIR / "frames/frame_000001.jpg"


def run_step(args: list[str], dry_run: bool) -> None:
    printable = " ".join(args)
    print(f"\n$ {printable}")
    if dry_run:
        return
    subprocess.run(args, check=True)


def py(script: str, *args: str | pathlib.Path) -> list[str]:
    return [sys.executable, script, *[str(arg) for arg in args]]


def box_queries(args: argparse.Namespace) -> list[str]:
    queries = getattr(args, "box_queries", None)
    if queries:
        return list(queries)
    return []


def cmd_robotics(args: argparse.Namespace) -> None:
    out_path = getattr(args, "robotics_out", None) or args.out
    command = py(
        "backend/gemini_robotics_boxes.py",
        "--image",
        args.image,
        "--out",
        out_path,
        "--timeout-s",
        str(args.timeout_s),
    )
    for query in box_queries(args):
        command.extend(["--query", query])
    run_step(command, args.dry_run)


def cmd_merge(args: argparse.Namespace) -> None:
    command = py(
        "backend/merge_robotics_boxes.py",
        "--robotics",
        args.robotics,
        "--run-dir",
        args.run_dir,
        "--iou-threshold",
        str(args.iou_threshold),
    )
    if args.frame_name:
        command.extend(["--frame-name", args.frame_name])
    if args.merge_dry_run:
        command.append("--dry-run")
    run_step(command, args.dry_run)


def cmd_memory(args: argparse.Namespace) -> None:
    if args.use_robotics:
        cmd_robotics(args)
        cmd_merge(args)

    run_step(
        py(
            "backend/mask_track_memory.py",
            "--run-dir",
            args.run_dir,
            "--out",
            args.mask_out,
            "--fps",
            str(args.fps),
        ),
        args.dry_run,
    )
    run_step(
        py(
            "backend/depth_memory.py",
            "--input",
            args.mask_out,
            "--out",
            args.depth_out,
            "--backend",
            args.depth_backend,
        ),
        args.dry_run,
    )
    run_step(
        py(
            "backend/episodic_memory.py",
            "--input",
            args.depth_out,
            "--out",
            args.episodes_out,
            "--query",
            args.query,
        ),
        args.dry_run,
    )


def cmd_ask(args: argparse.Namespace) -> None:
    run_step(
        py(
            "backend/answer_from_memory.py",
            "--memory",
            args.memory,
            "--query",
            args.query,
            "--provider",
            args.provider,
            "--out",
            args.out,
            "--top-k",
            str(args.top_k),
            "--timeout-s",
            str(args.timeout_s),
        ),
        args.dry_run,
    )


def cmd_export(args: argparse.Namespace) -> None:
    command = py(
        "backend/export_artifacts.py",
        "--run-dir",
        args.run_dir,
        "--out-dir",
        args.out_dir,
        "--name",
        args.name,
        "--query",
        args.query,
        "--limit",
        str(args.limit),
    )
    if args.no_zip:
        command.append("--no-zip")
    run_step(command, args.dry_run)


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--dry-run", action="store_true", help="Print commands without running them.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="VIMA hardhat spatial-memory CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    robotics = sub.add_parser("robotics-boxes", help="Ask Gemini Robotics-ER for semantic boxes.")
    robotics.set_defaults(func=cmd_robotics)
    add_common(robotics)
    robotics.add_argument("--image", default=str(DEFAULT_FRAME))
    robotics.add_argument("--out", default="demo/gemini_robotics_boxes.json")
    robotics.add_argument("--timeout-s", type=int, default=20)
    robotics.add_argument("--query", action="append", dest="box_queries")

    merge = sub.add_parser("merge-boxes", help="Merge Robotics-ER boxes into YOLO label files.")
    merge.set_defaults(func=cmd_merge)
    add_common(merge)
    merge.add_argument("--robotics", default="demo/gemini_robotics_boxes.json")
    merge.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    merge.add_argument("--frame-name")
    merge.add_argument("--iou-threshold", type=float, default=0.5)
    merge.add_argument("--merge-dry-run", action="store_true")

    memory = sub.add_parser("memory", help="Build masks, depth, and episodic memory from labels.")
    memory.set_defaults(func=cmd_memory)
    add_common(memory)
    memory.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    memory.add_argument("--fps", type=float, default=0.1)
    memory.add_argument("--query", default="worker laying blocks near wall")
    memory.add_argument("--mask-out", default="demo/mask_track_memory.json")
    memory.add_argument("--depth-out", default="demo/depth_track_memory.json")
    memory.add_argument("--episodes-out", default="demo/episodic_memory.json")
    memory.add_argument("--depth-backend", choices=["auto", "depth-anything", "proxy"], default="auto")
    memory.add_argument("--use-robotics", action="store_true")
    memory.add_argument("--image", default=str(DEFAULT_FRAME))
    memory.add_argument("--robotics-out", default="demo/gemini_robotics_boxes.json")
    memory.add_argument("--robotics", default="demo/gemini_robotics_boxes.json")
    memory.add_argument("--frame-name")
    memory.add_argument("--iou-threshold", type=float, default=0.5)
    memory.add_argument("--merge-dry-run", action="store_true")
    memory.add_argument("--timeout-s", type=int, default=20)
    memory.add_argument("--box-query", action="append", dest="box_queries")

    ask = sub.add_parser("ask", help="Answer from episodic memory.")
    ask.set_defaults(func=cmd_ask)
    add_common(ask)
    ask.add_argument("query")
    ask.add_argument("--memory", default="demo/episodic_memory.json")
    ask.add_argument("--provider", choices=["heuristic", "gemini"], default="gemini")
    ask.add_argument("--out", default="demo/memory_answer_gemini.json")
    ask.add_argument("--top-k", type=int, default=4)
    ask.add_argument("--timeout-s", type=int, default=20)

    export = sub.add_parser("export", help="Package shareable VIMA artifacts into a zip.")
    export.set_defaults(func=cmd_export)
    add_common(export)
    export.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    export.add_argument("--out-dir", default="artifacts")
    export.add_argument("--name", default="vima_share")
    export.add_argument("--query", default="Was there masonry work happening near the wall?")
    export.add_argument("--limit", type=int, default=10)
    export.add_argument("--no-zip", action="store_true")

    run = sub.add_parser("run", help="Build episodic memory, then answer one query.")
    run.set_defaults(func=lambda args: (cmd_memory(args), cmd_ask(args)))
    add_common(run)
    run.add_argument("query")
    run.add_argument("--run-dir", default=str(DEFAULT_RUN_DIR))
    run.add_argument("--fps", type=float, default=0.1)
    run.add_argument("--mask-out", default="demo/mask_track_memory.json")
    run.add_argument("--depth-out", default="demo/depth_track_memory.json")
    run.add_argument("--episodes-out", default="demo/episodic_memory.json")
    run.add_argument("--depth-backend", choices=["auto", "depth-anything", "proxy"], default="auto")
    run.add_argument("--use-robotics", action="store_true")
    run.add_argument("--image", default=str(DEFAULT_FRAME))
    run.add_argument("--out", default="demo/memory_answer_gemini.json")
    run.add_argument("--robotics-out", default="demo/gemini_robotics_boxes.json")
    run.add_argument("--robotics", default="demo/gemini_robotics_boxes.json")
    run.add_argument("--frame-name")
    run.add_argument("--iou-threshold", type=float, default=0.5)
    run.add_argument("--merge-dry-run", action="store_true")
    run.add_argument("--provider", choices=["heuristic", "gemini"], default="gemini")
    run.add_argument("--memory", default="demo/episodic_memory.json")
    run.add_argument("--top-k", type=int, default=4)
    run.add_argument("--timeout-s", type=int, default=20)
    run.add_argument("--box-query", action="append", dest="box_queries")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
