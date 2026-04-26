#!/usr/bin/env python3
"""
VIMA Component 2: Event Memory Layer
=======================================
Lightweight temporal memory system that detects visual change events across
construction footage frames using color histograms, edge density, and structural
metrics as embedding proxies.

Builds a timeline of change events and provides temporal context to augment
VLM spatial reasoning.

Usage:
    uv run event_memory.py
"""

import json, time, pathlib, base64
import numpy as np
from PIL import Image, ImageFilter

FRAMES_DIR = pathlib.Path("/tmp/vima-cii-frames")
FULL_FRAMES_DIR = pathlib.Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/frames")
OUTPUT_DIR = pathlib.Path(__file__).parent
TIMELINE_PATH = OUTPUT_DIR / "event_timeline.json"

# Use a wider frame set from the full 638-frame corpus for better temporal coverage
# We'll sample every 20th frame = ~32 frames
SAMPLE_STEP = 20


def compute_feature_vector(img: Image.Image) -> np.ndarray:
    """
    Compute a lightweight feature vector for a frame using:
    1. Color histogram (RGB, 32 bins each = 96 dims)
    2. Edge density (Sobel-like via PIL, 1 dim)
    3. Brightness statistics (mean, std, 2 dims)
    4. Structural metrics: horizontal/vertical edge ratio (1 dim)
    Total: 100 dimensions
    """
    # Resize for consistency and speed
    img_resized = img.resize((256, 256)).convert("RGB")
    arr = np.array(img_resized, dtype=np.float32)

    # 1. Color histograms (32 bins per channel)
    features = []
    for ch in range(3):
        hist, _ = np.histogram(arr[:, :, ch], bins=32, range=(0, 255))
        hist = hist.astype(np.float64)
        hist = hist / (hist.sum() + 1e-8)  # Normalize
        features.append(hist)

    # 2. Edge density
    gray = img_resized.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edges, dtype=np.float32)
    edge_density = edge_arr.mean() / 255.0
    features.append(np.array([edge_density]))

    # 3. Brightness stats
    gray_arr = np.array(gray, dtype=np.float32)
    features.append(np.array([gray_arr.mean() / 255.0, gray_arr.std() / 255.0]))

    # 4. Structural: horizontal vs vertical edge ratio
    h_edges = gray.filter(ImageFilter.Kernel(
        size=(3, 3), kernel=[-1, -2, -1, 0, 0, 0, 1, 2, 1], scale=1, offset=128
    ))
    v_edges = gray.filter(ImageFilter.Kernel(
        size=(3, 3), kernel=[-1, 0, 1, -2, 0, 2, -1, 0, 1], scale=1, offset=128
    ))
    h_energy = np.array(h_edges, dtype=np.float32).var()
    v_energy = np.array(v_edges, dtype=np.float32).var()
    hv_ratio = h_energy / (v_energy + 1e-8)
    features.append(np.array([min(hv_ratio, 5.0) / 5.0]))  # Clamp and normalize

    return np.concatenate(features)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    if norm < 1e-12:
        return 0.0
    return float(dot / norm)


def describe_change(prev_features: np.ndarray, curr_features: np.ndarray) -> str:
    """Generate a human-readable description of what changed between frames."""
    changes = []

    # Compare color histograms (first 96 dims: 32 bins x 3 channels)
    for ch, name in enumerate(["red", "green", "blue"]):
        prev_hist = prev_features[ch * 32 : (ch + 1) * 32]
        curr_hist = curr_features[ch * 32 : (ch + 1) * 32]
        hist_diff = np.abs(prev_hist - curr_hist).sum()
        if hist_diff > 0.3:
            changes.append(f"significant {name} channel shift ({hist_diff:.2f})")

    # Compare edge density (dim 96)
    edge_diff = abs(float(curr_features[96]) - float(prev_features[96]))
    if edge_diff > 0.05:
        direction = "increased" if curr_features[96] > prev_features[96] else "decreased"
        changes.append(f"edge complexity {direction} ({edge_diff:.3f})")

    # Compare brightness (dims 97-98)
    bright_diff = abs(float(curr_features[97]) - float(prev_features[97]))
    if bright_diff > 0.08:
        direction = "brighter" if curr_features[97] > prev_features[97] else "darker"
        changes.append(f"scene got {direction} ({bright_diff:.3f})")

    # Compare structure (dim 99)
    struct_diff = abs(float(curr_features[99]) - float(prev_features[99]))
    if struct_diff > 0.1:
        changes.append(f"structural orientation shifted ({struct_diff:.3f})")

    if not changes:
        changes.append("subtle visual changes detected")

    return "; ".join(changes)


class EventMemory:
    """Temporal memory system for construction footage."""

    def __init__(self):
        self.frames: list[dict] = []  # [{frame_idx, path, features, timestamp_est}]
        self.events: list[dict] = []  # [{frame_idx, timestamp, change_score, ...}]
        self.feature_matrix: list[np.ndarray] = []

    def ingest_frames(self, frames_dir: pathlib.Path, step: int = SAMPLE_STEP):
        """Load and compute features for sampled frames."""
        frame_files = sorted(frames_dir.glob("frame_*.jpg"))
        if not frame_files:
            print(f"No frames found in {frames_dir}")
            return

        print(f"Found {len(frame_files)} total frames, sampling every {step}th")

        for i, fpath in enumerate(frame_files):
            if i % step != 0:
                continue

            # Extract frame index from filename
            stem = fpath.stem  # e.g. "frame_0001"
            frame_idx = int(stem.split("_")[-1])

            img = Image.open(fpath)
            features = compute_feature_vector(img)

            # Estimate timestamp (assuming ~1 fps for extracted frames, or use index)
            timestamp_est = frame_idx * 1.0  # Rough estimate

            self.frames.append({
                "frame_idx": frame_idx,
                "path": str(fpath),
                "timestamp_est": timestamp_est,
            })
            self.feature_matrix.append(features)

            print(f"  Ingested frame {frame_idx:04d} | edge_density={features[96]:.3f} | brightness={features[97]:.3f}")

        print(f"Ingested {len(self.frames)} frames")

    def detect_events(self, threshold: float = 0.015):
        """Detect change events where consecutive frame similarity drops."""
        if len(self.frames) < 2:
            return

        print(f"\nDetecting change events (threshold={threshold})...")

        similarities = []
        for i in range(1, len(self.frames)):
            sim = cosine_similarity(self.feature_matrix[i - 1], self.feature_matrix[i])
            change_score = 1.0 - sim
            similarities.append(change_score)

            self.frames[i]["similarity_to_prev"] = sim
            self.frames[i]["change_score"] = change_score

        # Compute adaptive threshold: mean + 1.5 * std of change scores
        scores = np.array(similarities)
        adaptive_threshold = max(threshold, float(scores.mean() + 1.0 * scores.std()))
        print(f"  Change scores: mean={scores.mean():.4f}, std={scores.std():.4f}, adaptive_threshold={adaptive_threshold:.4f}")

        for i in range(1, len(self.frames)):
            change_score = similarities[i - 1]
            if change_score > adaptive_threshold:
                description = describe_change(
                    self.feature_matrix[i - 1], self.feature_matrix[i]
                )
                event = {
                    "event_idx": len(self.events),
                    "frame_idx": self.frames[i]["frame_idx"],
                    "prev_frame_idx": self.frames[i - 1]["frame_idx"],
                    "timestamp_est": self.frames[i]["timestamp_est"],
                    "change_score": round(change_score, 4),
                    "change_description": description,
                    "before_frame": self.frames[i - 1]["path"],
                    "after_frame": self.frames[i]["path"],
                }
                self.events.append(event)
                print(f"  EVENT #{len(self.events)}: frame {event['prev_frame_idx']:04d} -> {event['frame_idx']:04d} | score={change_score:.4f} | {description[:80]}")

        print(f"\nDetected {len(self.events)} change events from {len(self.frames)} sampled frames")

    def get_context_for_frame(self, target_frame_idx: int) -> dict:
        """
        For a given frame, return temporal context:
        - The most recent change event before this frame
        - Before/after frames around that change
        - A text summary for VLM augmentation
        """
        recent_events = [e for e in self.events if e["frame_idx"] <= target_frame_idx]

        if not recent_events:
            return {
                "has_context": False,
                "context_text": "No prior change events detected before this frame.",
                "recent_event": None,
            }

        most_recent = recent_events[-1]
        frames_since_event = target_frame_idx - most_recent["frame_idx"]

        context_text = (
            f"TEMPORAL CONTEXT: {frames_since_event} frames ago (at frame {most_recent['frame_idx']}), "
            f"a significant visual change was detected: {most_recent['change_description']}. "
            f"Change magnitude: {most_recent['change_score']:.4f}. "
            f"This suggests the scene has recently undergone: {most_recent['change_description']}. "
            f"Total change events detected so far in this sequence: {len(recent_events)}."
        )

        # Include full event history summary
        if len(recent_events) > 1:
            history = "; ".join(
                f"frame {e['frame_idx']}: {e['change_description'][:50]}"
                for e in recent_events[-3:]  # Last 3 events
            )
            context_text += f"\nRecent history: {history}"

        return {
            "has_context": True,
            "context_text": context_text,
            "recent_event": most_recent,
            "event_history_count": len(recent_events),
            "frames_since_last_event": frames_since_event,
        }

    def build_timeline(self) -> dict:
        """Export the full timeline as JSON."""
        return {
            "metadata": {
                "tool": "VIMA Event Memory Layer",
                "frames_ingested": len(self.frames),
                "events_detected": len(self.events),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            "frames": [
                {
                    "frame_idx": f["frame_idx"],
                    "timestamp_est": f["timestamp_est"],
                    "change_score": f.get("change_score", 0.0),
                    "similarity_to_prev": f.get("similarity_to_prev", 1.0),
                }
                for f in self.frames
            ],
            "events": self.events,
        }


def main():
    print("=" * 70)
    print("VIMA Event Memory Layer")
    print("=" * 70)

    memory = EventMemory()

    # Try full frames first, fall back to sample frames
    if FULL_FRAMES_DIR.exists():
        memory.ingest_frames(FULL_FRAMES_DIR, step=SAMPLE_STEP)
    else:
        print(f"Full frames dir not found, using {FRAMES_DIR}")
        memory.ingest_frames(FRAMES_DIR, step=1)  # Already sparse

    memory.detect_events()

    # Export timeline
    timeline = memory.build_timeline()
    TIMELINE_PATH.write_text(json.dumps(timeline, indent=2))
    print(f"\nTIMELINE SAVED: {TIMELINE_PATH}")
    print(f"Events: {len(memory.events)}")

    # Demo: show context for a specific frame
    demo_frame = 300
    ctx = memory.get_context_for_frame(demo_frame)
    print(f"\n--- Context for frame {demo_frame} ---")
    print(ctx["context_text"])

    return memory


if __name__ == "__main__":
    main()
