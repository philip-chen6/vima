#!/usr/bin/env python3
"""Answer questions from VINNA episodic memory with cited evidence."""

from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
import pathlib
import queue
import urllib.error
import urllib.request
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


def _gemini_worker(
    output: mp.Queue,
    api_key: str,
    model_name: str,
    query: str,
    context: list[dict[str, Any]],
) -> None:
    import google.generativeai as genai

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
- Write 3 complete sentences.
- Do not use markdown bullets.
- Keep the answer short and useful for a construction productivity/safety judge.
"""
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        output.put({"ok": True, "text": response.text.strip()})
    except Exception as exc:  # noqa: BLE001
        output.put({"ok": False, "error": f"{type(exc).__name__}: {exc}"})


def build_prompt(query: str, context: list[dict[str, Any]]) -> str:
    return f"""
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


def gemini_rest_answer(query: str, context: list[dict[str, Any]], model_name: str, timeout_s: int) -> str:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for --provider gemini.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": build_prompt(query, context)}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini REST HTTP {exc.code}: {detail}") from exc

    candidate = payload.get("candidates", [{}])[0]
    parts = candidate.get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError(f"Gemini REST returned no text: {payload}")
    finish_reason = candidate.get("finishReason")
    if finish_reason and finish_reason != "STOP":
        text = f"{text}\n\n[gemini_finish_reason={finish_reason}]"
    return text


def gemini_legacy_answer(query: str, context: list[dict[str, Any]], model_name: str, timeout_s: int) -> str:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required for --provider gemini.")

    output: mp.Queue = mp.Queue()
    process = mp.Process(target=_gemini_worker, args=(output, api_key, model_name, query, context))
    process.start()
    process.join(timeout_s)
    if process.is_alive():
        process.terminate()
        process.join(2)
        raise TimeoutError(f"Gemini call exceeded {timeout_s}s and was terminated.")

    try:
        result = output.get_nowait()
    except queue.Empty as exc:
        raise RuntimeError("Gemini worker exited without returning a response.") from exc
    if not result["ok"]:
        raise RuntimeError(result["error"])
    return result["text"]


def gemini_answer(
    query: str,
    context: list[dict[str, Any]],
    model_name: str,
    timeout_s: int,
    transport: str,
) -> str:
    if transport == "legacy":
        return gemini_legacy_answer(query, context, model_name, timeout_s)
    return gemini_rest_answer(query, context, model_name, timeout_s)


def answer_query(
    memory_path: pathlib.Path,
    query: str,
    provider: str,
    top_k: int,
    model_name: str,
    timeout_s: int,
    fallback_on_error: bool,
    gemini_transport: str,
) -> dict[str, Any]:
    episodes = load_episodes(memory_path)
    retrieved = retrieve(episodes, query, top_k)
    context = build_context(retrieved)
    error = None
    if provider == "gemini":
        try:
            answer = gemini_answer(query, context, model_name, timeout_s, gemini_transport)
        except Exception as exc:  # noqa: BLE001
            if not fallback_on_error:
                raise
            error = f"{type(exc).__name__}: {exc}"
            answer = heuristic_answer(query, context)
    else:
        answer = heuristic_answer(query, context)

    return {
        "query": query,
        "provider": provider,
        "model": model_name if provider == "gemini" else None,
        "gemini_transport": gemini_transport if provider == "gemini" else None,
        "fallback_used": error is not None,
        "error": error,
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
    parser.add_argument("--timeout-s", type=int, default=20)
    parser.add_argument("--no-fallback", action="store_true")
    parser.add_argument("--gemini-transport", choices=["rest", "legacy"], default="rest")
    args = parser.parse_args()

    load_env()
    result = answer_query(
        pathlib.Path(args.memory),
        args.query,
        args.provider,
        args.top_k,
        args.model,
        args.timeout_s,
        not args.no_fallback,
        args.gemini_transport,
    )
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(result["answer"])
    print(f"\nwrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
