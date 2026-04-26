#!/usr/bin/env python3
"""
VIMA Spatial Intelligence Demo
================================
Takes egocentric construction video frames and outputs spatial claims with evidence.

Three modes:
  1. SPATIAL  — single frame spatial reasoning (distances, relationships, layout)
  2. CHANGE   — frame pair change detection (what moved, added, removed between visits)
  3. QUERY    — answer spatial questions about one or more frames

Usage:
  # Single-frame spatial analysis
  uv run spatial_demo.py spatial --frame frames/015.jpg --timestamp 15.0

  # Change detection between two walkthroughs
  uv run spatial_demo.py change --frame-t1 frames/day1_015.jpg --frame-t2 frames/day2_015.jpg

  # Spatial query
  uv run spatial_demo.py query --frame frames/015.jpg --question "What is within 3m of the open edge?"

  # Batch spatial analysis from video
  uv run spatial_demo.py spatial --video footage.mp4 --timestamps 15.0,30.0,45.0,60.0

  # With real point cloud data
  uv run spatial_demo.py spatial --frame frames/015.jpg --cloud data/crop_015.ply
"""
import argparse, json, sys, pathlib, subprocess

from cloud_loader import load_cloud
from spatial_judge import judge_spatial, judge_change, judge_spatial_query


# ── Frame extraction ────────────────────────────────────────────────────────

def extract_frame(video_path: str, timestamp_s: float, out_dir: str = "/tmp/vima-spatial-frames") -> str:
    """ffmpeg: extract single frame at timestamp."""
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
    out = f"{out_dir}/frame_{timestamp_s:.1f}.jpg"
    if pathlib.Path(out).exists():
        return out
    cmd = [
        "ffmpeg", "-ss", str(timestamp_s), "-i", video_path,
        "-frames:v", "1", "-q:v", "2", "-y", out,
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()[:300]}")
    return out


# ── Pretty output ───────────────────────────────────────────────────────────

def print_spatial_summary(result: dict) -> None:
    """Human-readable spatial analysis summary."""
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"  SPATIAL ANALYSIS — {result.get('event_id', '?')}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)

    if desc := result.get("scene_description"):
        print(f"\n  Scene: {desc}", file=sys.stderr)

    if zone := result.get("zone_classification"):
        print(f"  Zone: {zone}", file=sys.stderr)

    if claims := result.get("spatial_claims"):
        print(f"\n  Spatial Claims ({len(claims)}):", file=sys.stderr)
        for c in claims:
            dist = f" @ {c['distance_from_camera_m']:.1f}m" if c.get("distance_from_camera_m") else ""
            dims = f" ({c['dimensions_estimate']})" if c.get("dimensions_estimate") else ""
            print(f"    - {c['object']}{dist}{dims}", file=sys.stderr)
            print(f"      Location: {c['location']}", file=sys.stderr)
            if rels := c.get("spatial_relationships"):
                for r in rels:
                    print(f"        -> {r}", file=sys.stderr)

    if dists := result.get("distance_estimates"):
        print(f"\n  Distance Estimates ({len(dists)}):", file=sys.stderr)
        for d in dists:
            conf = f" (conf: {d['confidence']:.0%})" if d.get("confidence") else ""
            print(f"    {d['from']} <-> {d['to']}: {d['distance_m']:.1f}m{conf}", file=sys.stderr)

    if ctx := result.get("worker_spatial_context"):
        print(f"\n  Workers: {ctx.get('count', '?')} — {ctx.get('density_description', '')}", file=sys.stderr)

    if feats := result.get("notable_spatial_features"):
        print(f"\n  Notable Spatial Features:", file=sys.stderr)
        for f in feats:
            print(f"    * {f}", file=sys.stderr)

    print(f"\n  Confidence: {result.get('confidence', '?')}", file=sys.stderr)
    if reasoning := result.get("reasoning"):
        print(f"  Reasoning: {reasoning}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)


def print_change_summary(result: dict) -> None:
    """Human-readable change detection summary."""
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"  SPATIAL CHANGE DETECTION — {result.get('event_id', '?')}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)

    if summary := result.get("spatial_summary"):
        print(f"\n  Summary: {summary}", file=sys.stderr)

    if changes := result.get("changes"):
        print(f"\n  Changes Detected ({len(changes)}):", file=sys.stderr)
        for c in changes:
            icon = {"added": "+", "removed": "-", "moved": "~", "modified": "*",
                    "grown": "^", "shrunk": "v"}.get(c.get("change_type", ""), "?")
            disp = f" ({c['estimated_displacement_m']:.1f}m)" if c.get("estimated_displacement_m") else ""
            delta = f" [{c['estimated_size_delta']}]" if c.get("estimated_size_delta") else ""
            conf = f" (conf: {c['confidence']:.0%})" if c.get("confidence") else ""
            print(f"    [{icon}] {c['claim']}{disp}{delta}{conf}", file=sys.stderr)
            if c.get("evidence"):
                print(f"        Evidence: {c['evidence']}", file=sys.stderr)

    if unchanged := result.get("unchanged"):
        print(f"\n  Unchanged: {', '.join(unchanged)}", file=sys.stderr)

    if prog := result.get("progress_assessment"):
        status = prog.get("construction_progress", "unknown").upper()
        print(f"\n  Progress: {status}", file=sys.stderr)
        if ev := prog.get("evidence"):
            print(f"    {ev}", file=sys.stderr)

    print(f"\n  Confidence: {result.get('confidence', '?')}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)


def print_query_summary(result: dict) -> None:
    """Human-readable spatial query answer."""
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"  SPATIAL QUERY", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    print(f"\n  Q: {result.get('question', '?')}", file=sys.stderr)
    print(f"  A: {result.get('answer', '?')}", file=sys.stderr)

    if claims := result.get("supporting_claims"):
        print(f"\n  Supporting Evidence ({len(claims)}):", file=sys.stderr)
        for c in claims:
            dist = f" ({c['distance_m']:.1f}m)" if c.get("distance_m") else ""
            conf = f" [conf: {c['confidence']:.0%}]" if c.get("confidence") else ""
            print(f"    - {c['claim']}{dist}{conf}", file=sys.stderr)

    print(f"\n  Confidence: {result.get('confidence', '?')}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)


# ── Commands ────────────────────────────────────────────────────────────────

def cmd_spatial(args) -> list[dict]:
    """Single-frame spatial reasoning — one or more frames."""
    frames = []
    if args.frame:
        frames.append((args.frame, args.timestamp or 0.0))
    elif args.video:
        timestamps = [float(t) for t in args.timestamps.split(",")]
        for ts in timestamps:
            fp = extract_frame(args.video, ts)
            frames.append((fp, ts))
    else:
        print("ERROR: --frame or --video required", file=sys.stderr)
        sys.exit(1)

    cloud = load_cloud(args.cloud)
    results = []

    for frame_path, ts in frames:
        event_id = args.event or f"spatial_{ts:.1f}s"
        print(f"Analyzing: {event_id} @ {ts:.1f}s ...", file=sys.stderr)
        if args.cloud is None:
            print("  cloud: STUB (pass --cloud for real geometry)", file=sys.stderr)

        result = judge_spatial(
            frame_path=frame_path,
            geometry_stats=cloud.geometry_stats(),
            event_id=event_id,
            timestamp_s=ts,
        )
        result["cloud_stub"] = args.cloud is None
        results.append(result)
        print_spatial_summary(result)

    return results


def cmd_change(args) -> dict:
    """Frame-pair spatial change detection."""
    if not args.frame_t1 or not args.frame_t2:
        print("ERROR: --frame-t1 and --frame-t2 required for change detection", file=sys.stderr)
        sys.exit(1)

    cloud_t1 = load_cloud(args.cloud_t1)
    cloud_t2 = load_cloud(args.cloud_t2)
    ts1 = args.timestamp_t1 or 0.0
    ts2 = args.timestamp_t2 or 0.0
    event_id = args.event or f"change_{ts1:.0f}s_vs_{ts2:.0f}s"

    print(f"Change detection: {event_id}", file=sys.stderr)
    print(f"  T1: {args.frame_t1} @ {ts1:.1f}s", file=sys.stderr)
    print(f"  T2: {args.frame_t2} @ {ts2:.1f}s", file=sys.stderr)

    result = judge_change(
        frame_t1_path=args.frame_t1,
        frame_t2_path=args.frame_t2,
        geometry_stats_t1=cloud_t1.geometry_stats(),
        geometry_stats_t2=cloud_t2.geometry_stats(),
        event_id=event_id,
        timestamp_t1=ts1,
        timestamp_t2=ts2,
    )
    result["cloud_t1_stub"] = args.cloud_t1 is None
    result["cloud_t2_stub"] = args.cloud_t2 is None
    print_change_summary(result)
    return result


def cmd_query(args) -> dict:
    """Answer a spatial question about one or more frames."""
    if not args.question:
        print("ERROR: --question required for query mode", file=sys.stderr)
        sys.exit(1)

    frame_paths = []
    if args.frame:
        frame_paths.append(args.frame)
    elif args.frames:
        frame_paths = args.frames.split(",")
    else:
        print("ERROR: --frame or --frames required", file=sys.stderr)
        sys.exit(1)

    clouds = [load_cloud(args.cloud)] * len(frame_paths)
    geo_stats = [c.geometry_stats() for c in clouds]

    print(f"Spatial query: \"{args.question}\"", file=sys.stderr)
    print(f"  Frames: {len(frame_paths)}", file=sys.stderr)

    result = judge_spatial_query(
        question=args.question,
        frame_paths=frame_paths,
        geometry_stats_list=geo_stats,
        event_id=args.event or "query",
    )
    print_query_summary(result)
    return result


# ── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="VIMA Spatial Intelligence Demo — spatial reasoning from egocentric construction video",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # spatial
    sp = sub.add_parser("spatial", help="Single-frame spatial analysis")
    sp.add_argument("--frame", help="Pre-extracted frame JPG/PNG")
    sp.add_argument("--video", help="Source video (ffmpeg extracts frames)")
    sp.add_argument("--timestamps", help="Comma-separated timestamps for video mode (e.g. 15.0,30.0,45.0)")
    sp.add_argument("--timestamp", type=float, help="Timestamp for single frame mode")
    sp.add_argument("--cloud", help="Point cloud path. Omit for synthetic stub.")
    sp.add_argument("--event", help="Event label")
    sp.add_argument("--out", help="Write JSON to file")

    # change
    ch = sub.add_parser("change", help="Frame-pair spatial change detection")
    ch.add_argument("--frame-t1", required=True, help="Earlier walkthrough frame")
    ch.add_argument("--frame-t2", required=True, help="Later walkthrough frame")
    ch.add_argument("--cloud-t1", help="Point cloud for T1. Omit for stub.")
    ch.add_argument("--cloud-t2", help="Point cloud for T2. Omit for stub.")
    ch.add_argument("--timestamp-t1", type=float, help="T1 timestamp")
    ch.add_argument("--timestamp-t2", type=float, help="T2 timestamp")
    ch.add_argument("--event", help="Event label")
    ch.add_argument("--out", help="Write JSON to file")

    # query
    qu = sub.add_parser("query", help="Answer spatial questions about frames")
    qu.add_argument("--frame", help="Single frame path")
    qu.add_argument("--frames", help="Comma-separated frame paths for multi-frame query")
    qu.add_argument("--question", "-q", required=True, help="Spatial question to answer")
    qu.add_argument("--cloud", help="Point cloud path. Omit for stub.")
    qu.add_argument("--event", help="Event label")
    qu.add_argument("--out", help="Write JSON to file")

    args = parser.parse_args()

    # Dispatch
    if args.command == "spatial":
        result = cmd_spatial(args)
    elif args.command == "change":
        result = cmd_change(args)
    elif args.command == "query":
        result = cmd_query(args)
    else:
        parser.print_help()
        sys.exit(1)

    # Output JSON
    out_json = json.dumps(result, indent=2)
    if hasattr(args, "out") and args.out:
        pathlib.Path(args.out).write_text(out_json)
        print(f"Saved to {args.out}", file=sys.stderr)
    print(out_json)


if __name__ == "__main__":
    main()
