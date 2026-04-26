#!/usr/bin/env python3
"""Answer questions from VINNA episodic memory with cited evidence."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
from typing import Any

from memory_retrieval import compact_episode, load_episodes, retrieve


DEFAULT_MEMORY = pathlib.Path("demo/episodic_memory.json")
DEFAULT_OUTPUT = pathlib.Path("demo/memory_answer.json")
DEFAULT_MODEL = "gemini-2.5-flash"


def load_env(path: pathlib.Path = pathlib.Path(".env")) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def build_context(episodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [compact_episode(episode) for episode in episodes]


def heuristic_answer(query: str, context: list[dict[str, Any]]) -> str:
    if not context:
        return "I could not find a matching episode in memory."

    top = context[0]
    lines = [
        f"Answer: The strongest matching memory is {top['episode_id']} ({top['event_type']}) "
        f"from {top['time_start_s']}s to {top['time_end_s']}s.",
        f"Why: {top['observation']}",
    ]
    if top.get("spatial_facts"):
        lines.append("Spatial evidence: " + "; ".join(top["spatial_facts"][:3]))
    if top.get("relations"):
        lines.append("Relations: " + ", ".join(top["relations"][:3]))
    frames = [item["frame"] for item in top.get("evidence_frames", [])[:3]]
    if frames:
        lines.append("Evidence frames: " + ", ".join(frames))
    lines.append(f"Query: {query}")
    return "\n".join(lines)


def gemini_answer(query: str, context: list[dict[str, Any]], model_name: str) -> str:
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for --provider gemini.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    prompt = f"""
You answer from structured construction-video episodic memory.

User question:
{query}

Retrieved evidence episodes as JSON:
{json.dumps(context, indent=2)}

Rules:
- Answer only from the retrieved episodes.
- Cite episode_id and evidence frame names.
- Be explicit when evidence is only a candidate, not proof.
- Keep the answer short and useful for a construction productivity/safety judge.
"""
    response = model.generate_content(prompt)
    return response.text.strip()


def answer_query(
    memory_path: pathlib.Path,
    query: str,
    provider: str,
    top_k: int,
    model_name: str,
) -> dict[str, Any]:
    episodes = load_episodes(memory_path)
    retrieved = retrieve(episodes, query, top_k)
    context = build_context(retrieved)
    if provider == "gemini":
        answer = gemini_answer(query, context, model_name)
    else:
        answer = heuristic_answer(query, context)

    return {
        "query": query,
        "provider": provider,
        "model": model_name if provider == "gemini" else None,
        "answer": answer,
        "retrieved_episodes": context,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--memory", default=str(DEFAULT_MEMORY))
    parser.add_argument("--query", required=True)
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--provider", choices=["heuristic", "gemini"], default="heuristic")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--top-k", type=int, default=4)
    args = parser.parse_args()

    load_env()
    result = answer_query(pathlib.Path(args.memory), args.query, args.provider, args.top_k, args.model)
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(result["answer"])
    print(f"\nwrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
