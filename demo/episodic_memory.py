#!/usr/bin/env python3
"""
Compile object/depth tracks into object-event episodic memory.

This is the layer a retrieval system or VLM should consume:
  depth_track_memory.json -> high-level episodes with evidence frames
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any

from memory_retrieval import retrieve


DEFAULT_INPUT = pathlib.Path("demo/depth_track_memory.json")
DEFAULT_OUTPUT = pathlib.Path("demo/episodic_memory.json")


@dataclass
class FrameEvent:
    event_type: str
    timestamp_s: float
    frame: str
    confidence: float
    tracks: set[str] = field(default_factory=set)
    labels: set[str] = field(default_factory=set)
    relations: list[str] = field(default_factory=list)
    depth_order: list[str] = field(default_factory=list)
    facts: list[str] = field(default_factory=list)


@dataclass
class Episode:
    event_type: str
    events: list[FrameEvent] = field(default_factory=list)

    @property
    def time_start_s(self) -> float:
        return min(event.timestamp_s for event in self.events)

    @property
    def time_end_s(self) -> float:
        return max(event.timestamp_s for event in self.events)


def object_by_track(row: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        obj["track_id"]: obj
        for obj in row.get("objects", [])
        if obj.get("track_id")
    }


def relation_tracks(relation: str) -> list[str]:
    return re.findall(r"(?:worker|concrete_block_wall|guardrail|open_edge|scaffold|material_stack)_\d+", relation)


def summarize_depth(row: dict[str, Any], tracks: set[str]) -> list[str]:
    by_track = object_by_track(row)
    facts = []
    for track_id in row.get("depth_order_closest_first", [])[:3]:
        obj = by_track.get(track_id)
        if not obj:
            continue
        depth = obj.get("depth", {})
        label = obj.get("label", "object")
        facts.append(
            f"{track_id} ({label}) is {depth.get('band', 'unknown')} "
            f"depth rank {depth.get('rank_closest_in_frame', '?')}"
        )
    for track_id in sorted(tracks):
        obj = by_track.get(track_id)
        if not obj:
            continue
        depth = obj.get("depth", {})
        facts.append(
            f"{track_id} {obj.get('label')} depth={depth.get('band')} "
            f"score={depth.get('relative_closeness')}"
        )
    return facts


def make_frame_events(row: dict[str, Any]) -> list[FrameEvent]:
    objects = row.get("objects", [])
    labels = {obj.get("label") for obj in objects}
    by_track = object_by_track(row)
    relations = row.get("relations", [])
    depth_order = row.get("depth_order_closest_first", [])
    timestamp = float(row.get("timestamp_s", 0.0))
    frame = row.get("frame", "")
    events: list[FrameEvent] = []

    masonry_tracks: set[str] = set()
    masonry_relations = [rel for rel in relations if "_near_concrete_block_wall_" in rel]
    for rel in masonry_relations:
        masonry_tracks.update(relation_tracks(rel))
    if masonry_relations or {"worker", "concrete block wall"}.issubset(labels):
        if not masonry_tracks:
            masonry_tracks = {
                obj["track_id"]
                for obj in objects
                if obj.get("track_id") and obj.get("label") in {"worker", "concrete block wall"}
            }
        events.append(
            FrameEvent(
                event_type="masonry_work_candidate",
                timestamp_s=timestamp,
                frame=frame,
                confidence=0.86 if masonry_relations else 0.64,
                tracks=masonry_tracks,
                labels={"worker", "concrete block wall"},
                relations=masonry_relations,
                depth_order=depth_order,
                facts=summarize_depth(row, masonry_tracks),
            )
        )

    edge_relations = [rel for rel in relations if "_edge_context_" in rel]
    if edge_relations or "open edge" in labels or "guardrail" in labels:
        tracks = set()
        for rel in edge_relations:
            tracks.update(relation_tracks(rel))
        if not tracks:
            tracks = {
                obj["track_id"]
                for obj in objects
                if obj.get("track_id") and obj.get("label") in {"worker", "guardrail", "open edge"}
            }
        events.append(
            FrameEvent(
                event_type="safety_edge_context",
                timestamp_s=timestamp,
                frame=frame,
                confidence=0.80 if edge_relations else 0.58,
                tracks=tracks,
                labels={"worker", "guardrail", "open edge"} & labels,
                relations=edge_relations,
                depth_order=depth_order,
                facts=summarize_depth(row, tracks),
            )
        )

    if "scaffold" in labels:
        tracks = {obj["track_id"] for obj in objects if obj.get("label") == "scaffold" and obj.get("track_id")}
        events.append(
            FrameEvent(
                event_type="scaffold_zone_visible",
                timestamp_s=timestamp,
                frame=frame,
                confidence=0.74,
                tracks=tracks,
                labels={"scaffold"},
                depth_order=depth_order,
                facts=summarize_depth(row, tracks),
            )
        )

    if "material stack" in labels:
        tracks = {obj["track_id"] for obj in objects if obj.get("label") == "material stack" and obj.get("track_id")}
        events.append(
            FrameEvent(
                event_type="material_staging_visible",
                timestamp_s=timestamp,
                frame=frame,
                confidence=0.68,
                tracks=tracks,
                labels={"material stack"},
                depth_order=depth_order,
                facts=summarize_depth(row, tracks),
            )
        )

    foreground_workers = [
        obj
        for obj in objects
        if obj.get("label") == "worker" and obj.get("depth", {}).get("band") == "near"
    ]
    if foreground_workers:
        tracks = {obj["track_id"] for obj in foreground_workers if obj.get("track_id")}
        events.append(
            FrameEvent(
                event_type="foreground_worker_present",
                timestamp_s=timestamp,
                frame=frame,
                confidence=0.70,
                tracks=tracks,
                labels={"worker"},
                depth_order=depth_order,
                facts=summarize_depth(row, tracks),
            )
        )

    return events


def group_events(events: list[FrameEvent], max_gap_s: float) -> list[Episode]:
    episodes: list[Episode] = []
    open_by_type: dict[str, Episode] = {}

    for event in sorted(events, key=lambda item: (item.timestamp_s, item.event_type)):
        current = open_by_type.get(event.event_type)
        if current and event.timestamp_s - current.time_end_s <= max_gap_s:
            current.events.append(event)
        else:
            episode = Episode(event_type=event.event_type, events=[event])
            episodes.append(episode)
            open_by_type[event.event_type] = episode

    return episodes


def episode_observation(event_type: str, labels: set[str], tracks: set[str]) -> str:
    if event_type == "masonry_work_candidate":
        return "Worker and concrete block wall are co-present, with proximity evidence where available."
    if event_type == "safety_edge_context":
        return "Guardrail or open-edge context is visible near worker/site activity."
    if event_type == "scaffold_zone_visible":
        return "Scaffold structure is visible and anchors the spatial zone."
    if event_type == "material_staging_visible":
        return "Material stack is visible and can anchor staging/storage moments."
    if event_type == "foreground_worker_present":
        return "A worker is among the closest tracked objects in the egocentric view."
    return f"{event_type} involving {', '.join(sorted(labels or tracks))}."


def serialize_episode(index: int, episode: Episode) -> dict[str, Any]:
    tracks: set[str] = set()
    labels: set[str] = set()
    relations: list[str] = []
    facts: list[str] = []
    frame_counter: Counter[str] = Counter()
    confidence_values = []

    for event in episode.events:
        tracks.update(event.tracks)
        labels.update(label for label in event.labels if label)
        relations.extend(event.relations)
        facts.extend(event.facts)
        frame_counter[event.frame] += 1
        confidence_values.append(event.confidence)

    evidence_frames = [
        {"frame": frame, "votes": votes}
        for frame, votes in frame_counter.most_common()
    ]
    unique_facts = list(dict.fromkeys(facts))[:12]
    confidence = sum(confidence_values) / max(len(confidence_values), 1)
    confidence += min(0.08, 0.015 * max(0, len(episode.events) - 1))
    confidence = min(0.98, confidence)

    query_terms = [
        episode.event_type,
        *sorted(labels),
        *sorted(tracks),
        *relations,
        episode_observation(episode.event_type, labels, tracks),
    ]

    return {
        "episode_id": f"episode_{index:03d}",
        "event_type": episode.event_type,
        "time_start_s": round(episode.time_start_s, 2),
        "time_end_s": round(episode.time_end_s, 2),
        "duration_s": round(max(0.0, episode.time_end_s - episode.time_start_s), 2),
        "frames": [event.frame for event in episode.events],
        "evidence_frames": evidence_frames[:5],
        "involved_tracks": sorted(tracks),
        "labels": sorted(labels),
        "relations": list(dict.fromkeys(relations)),
        "confidence": round(confidence, 3),
        "observation": episode_observation(episode.event_type, labels, tracks),
        "spatial_facts": unique_facts,
        "query_text": " ".join(str(term) for term in query_terms if term),
    }


def build_episodic_memory(input_path: pathlib.Path, output_path: pathlib.Path, max_gap_s: float) -> dict[str, Any]:
    depth_memory = json.loads(input_path.read_text(encoding="utf-8"))
    frame_events: list[FrameEvent] = []
    for row in depth_memory.get("memory", []):
        frame_events.extend(make_frame_events(row))

    episodes = group_events(frame_events, max_gap_s=max_gap_s)
    serialized = [
        serialize_episode(index, episode)
        for index, episode in enumerate(episodes, start=1)
    ]
    event_counts = Counter(episode["event_type"] for episode in serialized)

    result = {
        "metadata": {
            "tool": "VINNA object-event episodic memory",
            "input": str(input_path),
            "source_depth_backend": depth_memory.get("metadata", {}).get("backends_used", []),
            "source_mask_preview": depth_memory.get("metadata", {}).get("preview_video"),
            "frames": len(depth_memory.get("memory", [])),
            "frame_events": len(frame_events),
            "episodes": len(serialized),
            "max_gap_s": max_gap_s,
        },
        "summary": {
            "event_counts": dict(event_counts),
            "episode_types": sorted(event_counts),
        },
        "episodes": serialized,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--max-gap-s", type=float, default=15.0)
    parser.add_argument("--query", default=None)
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()

    memory = build_episodic_memory(pathlib.Path(args.input), pathlib.Path(args.out), args.max_gap_s)
    print(
        f"wrote {args.out} with {memory['metadata']['episodes']} episodes "
        f"from {memory['metadata']['frame_events']} frame events"
    )
    if args.query:
        print(f"\nquery: {args.query}")
        for episode in retrieve(memory["episodes"], args.query, args.top_k):
            print(
                f"- {episode['episode_id']} {episode['event_type']} "
                f"{episode['time_start_s']}-{episode['time_end_s']}s "
                f"conf={episode['confidence']} :: {episode['observation']}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
