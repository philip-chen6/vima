"""
vima-temporal-v1: multi-frame temporal reasoning over construction footage.

This is the artifact behind the Ironsite "find a task where current VLMs
fail" prompt. Single-frame VLMs (GPT-4o, Gemini, Claude) classify what's IN
a frame. They cannot tell you what CHANGED across frames — that requires
holding multiple frames in working memory simultaneously and reasoning about
state transitions. Frontier multi-frame video models exist (Gemini 1.5/2.5
with video input) but their structured-output behavior on construction
state-change tasks has not been benchmarked publicly, and they tend to
hallucinate fine-grained changes (a wall course growing by 3 blocks vs 4)
without grounding evidence.

vima's contribution is the SCAFFOLDING that makes a frontier VLM emit
state-change claims with frame-level proof citations. Three layers:

1. Strict temporal-claim schema: every claim must cite two proof frames
   (start frame, end frame) so the user can verify the change visually.
2. Domain ontology of state-change types: court_growth, scaffold_relocated,
   material_consumed, worker_position_change, hazard_introduced,
   hazard_resolved. The model picks one, can't make up new types.
3. Refusal pattern: if the model can't ground a claimed change in two
   frames, it MUST emit "no_change_detected" with reasoning. We measure
   refusals as a positive signal of calibration.

This file produces the JSON consumed by the /eval frontend page. Judges
drag a comparison slider between two proof frames and see vima's caption
explaining the state change. The "wow" is: it actually works on real
construction footage, with citations.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import sys
import time
from typing import Optional

import anthropic

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

MODEL = os.getenv("JUDGE_MODEL", "claude-sonnet-4-6")
FRAMES_DIR = ROOT.parent / "frontend" / "public" / "vima-yozakura-frames"
CII_PATH = ROOT / "cii-results.json"
TEMPORAL_OUTPUT = ROOT / "temporal-results.json"


# Constrained ontology of state-change types observed on real construction
# sites. Pinned to the paper's episode types where they overlap (scaffold,
# material_staging) and extended for actual temporal events.
STATE_CHANGE_TYPES = [
    "course_growth",          # wall section grew by N courses
    "scaffold_relocated",     # scaffold moved to a different position
    "material_consumed",      # material stack diminished
    "material_delivered",     # new material arrived
    "worker_position_change", # primary worker moved to different surface/zone
    "hazard_introduced",      # an open_edge / unguarded condition appeared
    "hazard_resolved",        # guardrail or harness added, hazard cleared
    "tool_change",            # worker switched tools
    "no_change_detected",     # explicit refusal — no grounded change visible
]


SYSTEM = f"""You are vima, a multi-frame temporal reasoner for construction site footage. You see N frames captured in sequence (each labeled with its index and timestamp). Your job is to detect state changes BETWEEN frames and output structured claims that cite which two frames prove each change.

You are operating on three principles:

1. EVERY CLAIM MUST CITE TWO PROOF FRAMES. A state-change claim without a start_frame and end_frame is not a claim — it is a hallucination. If you cannot identify two specific frames where the change is visible, emit "no_change_detected" instead.

2. PICK FROM THE ONTOLOGY. The state-change type MUST be one of these:
{chr(10).join(f"   - {t}" for t in STATE_CHANGE_TYPES)}

3. REFUSE WHEN UNGROUNDED. If the frames are too similar to identify a real change, or the change is ambiguous, emit a single claim with type "no_change_detected" and a one-sentence reason. Do not pad the output.

Single-frame VLMs cannot do this task. The hard part is holding all N frames in working memory and identifying ONLY the changes that are visible in two specific frames. Drift, lighting changes, and camera motion are NOT state changes — they are noise.

Return JSON ONLY (no prose, no markdown fences). Schema:
{{
  "n_frames_examined": <int>,
  "claims": [
    {{
      "type": "<one of the ontology types>",
      "description": "<≤80 char description of what changed>",
      "start_frame": <int — index of frame showing 'before' state>,
      "end_frame": <int — index of frame showing 'after' state>,
      "evidence": "<≤120 char description of what's visible in start vs end>",
      "confidence": <0.0-1.0>,
      "severity": "info|warning|critical"
    }}
  ],
  "refusals": [
    {{
      "between_frames": [<int>, <int>],
      "reason": "<why you refused to make a claim about this pair>"
    }}
  ]
}}"""


def _encode_image(p: pathlib.Path) -> tuple[str, str]:
    data = p.read_bytes()
    ext = p.suffix.lower().lstrip(".")
    media = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext, "image/jpeg")
    return base64.standard_b64encode(data).decode(), media


def detect_state_changes(
    frame_paths: list[pathlib.Path],
    frame_meta: list[dict],
    model: str = MODEL,
) -> dict:
    """Send N frames to the VLM in a single call, get back structured
    state-change claims with proof-frame citations.

    Args:
        frame_paths: ordered list of frame paths
        frame_meta: parallel list of {timestamp_s, activity, ...} for each frame

    Returns: parsed JSON matching the schema in SYSTEM.
    """
    if len(frame_paths) != len(frame_meta):
        raise ValueError("frame_paths and frame_meta must be parallel")

    client = anthropic.Anthropic()

    user_content: list = []
    for i, (p, meta) in enumerate(zip(frame_paths, frame_meta)):
        b64, media = _encode_image(p)
        user_content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media, "data": b64},
        })
        ts = meta.get("timestamp_s", i * 1.0)
        activity_hint = meta.get("activity", "")
        user_content.append({
            "type": "text",
            "text": f"Frame {i} @ t={ts:.1f}s" + (f" (CII activity: {activity_hint})" if activity_hint else ""),
        })

    user_content.append({
        "type": "text",
        "text": (
            f"You have just seen {len(frame_paths)} frames. Identify every state change "
            "you can ground in two specific frames. Cite start_frame and end_frame indices "
            "(0-indexed). If two frames are too similar to ground a change, list them under "
            '"refusals" instead of inventing a claim. Return the JSON schema exactly.'
        ),
    })

    started = time.time()
    resp = client.messages.create(
        model=model,
        max_tokens=2000,
        system=SYSTEM,
        messages=[{"role": "user", "content": user_content}],
    )
    elapsed = time.time() - started

    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "n_frames_examined": len(frame_paths),
            "claims": [],
            "refusals": [],
            "parse_error": True,
            "raw": raw,
            "elapsed_s": round(elapsed, 1),
            "model": model,
        }

    result["elapsed_s"] = round(elapsed, 1)
    result["model"] = model
    # Frame paths in the result are repo-root-relative when possible (so the
    # frontend can fetch them as /<path>), otherwise we just stringify. The
    # latter happens in unit tests with /tmp paths.
    repo_root = ROOT.parent
    rel_paths = []
    for p in frame_paths:
        try:
            rel_paths.append(str(p.relative_to(repo_root)))
        except ValueError:
            rel_paths.append(str(p))
    result["frame_paths"] = rel_paths
    result["frame_meta"] = frame_meta
    return result


def baseline_single_frame_changes(frame_paths: list[pathlib.Path]) -> dict:
    """The floor: ask the VLM to detect state changes BUT only show it ONE
    frame at a time and ask 'what just changed?' This is what a naive
    pipeline does — and it cannot succeed by construction. Used in the
    eval to demonstrate the gap.

    Returns shape compatible with detect_state_changes for side-by-side."""
    client = anthropic.Anthropic()
    started = time.time()
    claims = []
    for i, p in enumerate(frame_paths):
        b64, media = _encode_image(p)
        resp = client.messages.create(
            model=MODEL,
            max_tokens=200,
            system="You see one construction-site frame. Describe in JSON {\"change_since_last_frame\":\"<text>\"} what changed since the previous frame. JSON only.",
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media, "data": b64}},
                {"type": "text", "text": f"Frame index {i}. What changed since the previous frame?"},
            ]}],
        )
        raw = resp.content[0].text.strip().lstrip("`json").rstrip("`").strip()
        try:
            parsed = json.loads(raw)
            claims.append({"frame": i, "claim": parsed.get("change_since_last_frame", "")})
        except json.JSONDecodeError:
            claims.append({"frame": i, "claim": raw[:120]})
    return {
        "method": "single_frame_baseline",
        "n_frames_examined": len(frame_paths),
        "per_frame_claims": claims,
        "elapsed_s": round(time.time() - started, 1),
    }


def extract_video_frames(
    video_path: pathlib.Path,
    n_frames: int = 8,
    out_dir: pathlib.Path | None = None,
) -> tuple[list[pathlib.Path], list[dict]]:
    """Run ffmpeg to pull N evenly-spaced frames out of a video.

    Used by /api/temporal to generate live multi-frame sequences from the
    coldpath demo video on the box (frontend/public/demo/coldpath.mp4).
    Returns (paths, meta) parallel lists where meta has timestamp_s + a
    placeholder activity hint.

    No ffmpeg-python dependency — we call the system binary directly.
    Caches frames in `out_dir` (default: /tmp/vima-temporal-frames-<basename>)
    keyed by video size+mtime so repeated calls don't re-decode the video."""
    import subprocess

    if not video_path.exists():
        raise FileNotFoundError(f"video not found: {video_path}")

    # Probe duration so we can space frames evenly across the timeline.
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
        check=True, capture_output=True, text=True,
    )
    duration_s = float(probe.stdout.strip())

    # Cache key — invalidate when source changes
    stat = video_path.stat()
    cache_key = f"{video_path.stem}-{int(stat.st_size)}-{int(stat.st_mtime)}-{n_frames}"
    out_dir = out_dir or pathlib.Path("/tmp/vima-temporal-frames") / cache_key
    out_dir.mkdir(parents=True, exist_ok=True)

    paths: list[pathlib.Path] = []
    meta: list[dict] = []

    # Pick timestamps that hit the meaty middle of the video — skip first
    # and last 5% so we don't grab black frames or end cards.
    margin = duration_s * 0.05
    span = duration_s - 2 * margin
    for i in range(n_frames):
        t = margin + (span * i / max(1, n_frames - 1))
        out_path = out_dir / f"frame_{i:03d}.jpg"
        if not out_path.exists():
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error",
                 "-ss", f"{t:.2f}", "-i", str(video_path),
                 "-frames:v", "1", "-q:v", "3", str(out_path)],
                check=True, capture_output=True,
            )
        paths.append(out_path)
        meta.append({
            "timestamp_s": round(t, 1),
            "activity": f"video frame at t={t:.1f}s",
            "frame": out_path.name,
        })

    return paths, meta


def run_live_demo_video(
    video_path: pathlib.Path | None = None,
    n_frames: int = 8,
    persist: bool = True,
) -> dict:
    """End-to-end: extract frames from the coldpath demo video, run
    temporal-v1 on them, optionally persist to temporal-results.json.
    This is what /api/temporal calls so judges hitting /eval see live
    multi-frame reasoning on real construction footage instead of the
    reference fallback."""
    if video_path is None:
        # Default to the bundled demo video shipped at frontend/public/demo
        video_path = ROOT.parent / "frontend" / "public" / "demo" / "coldpath.mp4"

    paths, meta = extract_video_frames(video_path, n_frames=n_frames)
    vima = detect_state_changes(paths, meta)
    payload = {"vima": vima, "ts": time.time(), "video": str(video_path.name)}

    if persist:
        TEMPORAL_OUTPUT.write_text(json.dumps(payload, indent=2))

    return payload


def select_demo_sequence(n_frames: int = 8) -> tuple[list[pathlib.Path], list[dict]]:
    """Pick a representative sequence from the masonry data: evenly spaced
    frames spanning the full duration so judges see real temporal range.

    Returns (paths, meta) parallel lists."""
    cii = json.loads(CII_PATH.read_text())
    if not cii:
        raise SystemExit("no cii-results.json")

    # Even-stride pick across the dataset
    stride = max(1, len(cii) // n_frames)
    picked_meta = cii[::stride][:n_frames]

    paths = []
    meta = []
    for entry in picked_meta:
        frame_id = entry.get("frame", "")
        candidate = FRAMES_DIR / frame_id
        if not candidate.exists():
            # Fall back to the available yozakura placeholders
            available = sorted(FRAMES_DIR.glob("frame_*.jpg"))
            if not available:
                raise SystemExit(f"no frames in {FRAMES_DIR}")
            try:
                idx = int(frame_id.split("_")[1].split(".")[0]) % len(available)
            except (IndexError, ValueError):
                idx = 0
            candidate = available[idx]
        paths.append(candidate)
        meta.append(entry)

    return paths, meta


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=8, help="number of frames in the temporal sequence")
    parser.add_argument("--with-baseline", action="store_true",
                        help="also run single-frame baseline for side-by-side")
    args = parser.parse_args()

    paths, meta = select_demo_sequence(args.n)
    print(f"selected {len(paths)} frames spanning t={meta[0].get('timestamp_s', 0):.1f}s "
          f"to t={meta[-1].get('timestamp_s', 0):.1f}s", file=sys.stderr)

    print("\n[1/2] vima-temporal-v1: multi-frame reasoning...", file=sys.stderr)
    vima = detect_state_changes(paths, meta)
    print(f"  -> {len(vima.get('claims', []))} claims, "
          f"{len(vima.get('refusals', []))} refusals, "
          f"{vima.get('elapsed_s', 0)}s", file=sys.stderr)

    output = {"vima": vima, "ts": time.time()}

    if args.with_baseline:
        print("\n[2/2] baseline single-frame: per-frame reasoning...", file=sys.stderr)
        baseline = baseline_single_frame_changes(paths)
        print(f"  -> {len(baseline.get('per_frame_claims', []))} per-frame claims, "
              f"{baseline.get('elapsed_s', 0)}s", file=sys.stderr)
        output["baseline"] = baseline

    TEMPORAL_OUTPUT.write_text(json.dumps(output, indent=2))
    print(f"\nwrote {TEMPORAL_OUTPUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
