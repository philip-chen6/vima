#!/usr/bin/env python3
"""
Ironsite Spatial Reasoning — Demo CLI
Usage:
    uv run demo.py --frame frames/015.jpg --timestamp 15.0 --event "NC event candidate 015.0s"
    uv run demo.py --video footage.mp4 --timestamp 15.0
    uv run demo.py --frame frames/015.jpg --cloud data/crop_015.ply --timestamp 15.0
"""
import argparse, json, sys
from pipeline import run_event

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--frame", help="Pre-extracted frame JPG/PNG")
    p.add_argument("--video", help="Source video (ffmpeg will extract frame)")
    p.add_argument("--cloud", help="Point cloud path (.ply/.npy/.npz/.bin). Omit to use stub.")
    p.add_argument("--timestamp", type=float, required=True, help="Event timestamp in seconds")
    p.add_argument("--event", default="NC event candidate", help="Event label")
    p.add_argument("--out", help="Write JSON result to file")
    args = p.parse_args()

    if not args.frame and not args.video:
        print("ERROR: --frame or --video required", file=sys.stderr)
        sys.exit(1)

    print(f"Running event: {args.event} @ {args.timestamp}s", file=sys.stderr)
    if args.cloud is None:
        print("  cloud: STUB (synthetic — pass --cloud path to use real data)", file=sys.stderr)

    result = run_event(
        event_id=args.event,
        timestamp_s=args.timestamp,
        frame_path=args.frame,
        cloud_path=args.cloud,
        video_path=args.video,
    )

    out = json.dumps(result, indent=2)
    if args.out:
        open(args.out, "w").write(out)
        print(f"Saved to {args.out}", file=sys.stderr)
    print(out)

    # Summary
    print(f"\n=== RESULT ===", file=sys.stderr)
    print(f"PNC: {result.get('pnc')} | Confidence: {result.get('confidence')}", file=sys.stderr)
    print(f"Activity: {result.get('activity')}", file=sys.stderr)
    if result.get("violation_flags"):
        print(f"Violations:", file=sys.stderr)
        for v in result["violation_flags"]:
            print(f"  [{v['severity'].upper()}] {v['rule']}", file=sys.stderr)

if __name__ == "__main__":
    main()
