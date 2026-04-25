"""
Ironsite Spatial Reasoning Pipeline
event_id + timestamp → source_frame + cloud_crop → 3.1 judge → JSON claim + evidence

Usage:
    from pipeline import run_event
    result = run_event("NC_015.0s", 15.0, frame_path="frames/015.jpg", cloud_path=None)
    # cloud_path=None → uses synthetic stub until Josh/Lucas confirm Drive format
"""
import json, subprocess, pathlib, os, tempfile
from cloud_loader import load_cloud
from judge import judge_event


def extract_frame(video_path: str, timestamp_s: float, out_dir: str = "/tmp/ironsite-frames") -> str:
    """ffmpeg: extract single frame at timestamp from video."""
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


def run_event(
    event_id: str,
    timestamp_s: float,
    frame_path: str | None = None,
    cloud_path: str | None = None,
    video_path: str | None = None,
) -> dict:
    """
    Core pipeline entry point.

    Args:
        event_id: Ironsite event label, e.g. "NC event candidate 015.0s"
        timestamp_s: Timestamp in seconds
        frame_path: Direct path to pre-extracted frame JPG/PNG (skip ffmpeg)
        cloud_path: Path to point cloud file (.ply/.npy/.npz/.bin). None → stub
        video_path: Source video — used to extract frame if frame_path is None

    Returns:
        Structured JSON from the judge with pnc, spatial_claims, violation_flags
    """
    # 1. Get frame
    if frame_path is None:
        if video_path is None:
            raise ValueError("Must supply either frame_path or video_path")
        frame_path = extract_frame(video_path, timestamp_s)

    # 2. Load point cloud (stub until format confirmed)
    cloud = load_cloud(cloud_path)

    # 3. Judge
    result = judge_event(
        frame_path=frame_path,
        geometry_stats=cloud.geometry_stats(),
        event_id=event_id,
        timestamp_s=timestamp_s,
    )

    result["cloud_stub"] = cloud_path is None
    result["cloud_n_points"] = cloud.n_points
    return result


def run_batch(events: list[dict], video_path: str | None = None) -> list[dict]:
    """
    events: list of {"event_id": str, "timestamp_s": float, "frame_path": str|None, "cloud_path": str|None}
    """
    results = []
    for ev in events:
        try:
            r = run_event(
                event_id=ev["event_id"],
                timestamp_s=ev["timestamp_s"],
                frame_path=ev.get("frame_path"),
                cloud_path=ev.get("cloud_path"),
                video_path=video_path,
            )
            results.append(r)
        except Exception as e:
            results.append({"event_id": ev["event_id"], "error": str(e)})
    return results
