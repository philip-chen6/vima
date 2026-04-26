#!/usr/bin/env python3
"""Retrieve object-event episodes for natural-language queries."""

from __future__ import annotations

import json
import pathlib
import re
from typing import Any


DEFAULT_EPISODES = pathlib.Path("demo/episodic_memory.json")


def load_episodes(path: pathlib.Path = DEFAULT_EPISODES) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("episodes", [])


def tokenize(text: str) -> set[str]:
    return {term for term in re.split(r"[^a-z0-9_]+", text.lower()) if term}


def score_episode(query_terms: set[str], episode: dict[str, Any]) -> float:
    text = episode.get("query_text", "").lower()
    score = sum(1.0 for term in query_terms if term in text)
    score += float(episode.get("confidence", 0.0)) * 0.25
    return score


def retrieve(episodes: list[dict[str, Any]], query: str, top_k: int) -> list[dict[str, Any]]:
    query_terms = tokenize(query)
    ranked = sorted(episodes, key=lambda episode: score_episode(query_terms, episode), reverse=True)
    return ranked[:top_k]


def compact_episode(episode: dict[str, Any]) -> dict[str, Any]:
    """Return the evidence fields worth passing to an answerer."""
    return {
        "episode_id": episode.get("episode_id"),
        "event_type": episode.get("event_type"),
        "time_start_s": episode.get("time_start_s"),
        "time_end_s": episode.get("time_end_s"),
        "confidence": episode.get("confidence"),
        "observation": episode.get("observation"),
        "evidence_frames": episode.get("evidence_frames", []),
        "involved_tracks": episode.get("involved_tracks", []),
        "relations": episode.get("relations", []),
        "spatial_facts": episode.get("spatial_facts", [])[:8],
    }


def format_retrieval(episodes: list[dict[str, Any]]) -> str:
    lines = []
    for episode in episodes:
        compact = compact_episode(episode)
        lines.append(
            f"{compact['episode_id']} | {compact['event_type']} | "
            f"{compact['time_start_s']}-{compact['time_end_s']}s | "
            f"conf={compact['confidence']} | {compact['observation']}"
        )
    return "\n".join(lines)
