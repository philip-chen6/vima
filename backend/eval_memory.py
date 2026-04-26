#!/usr/bin/env python3
"""Tiny VIMA eval: raw Gemini frames vs memory-augmented Gemini answers."""

from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import time
import urllib.error
import urllib.request
from typing import Any

from answer_from_memory import answer_query, load_env
from memory_retrieval import load_episodes, retrieve


DEFAULT_QUESTIONS = pathlib.Path("configs/eval_questions.json")
DEFAULT_MEMORY = pathlib.Path("demo/episodic_memory.json")
DEFAULT_FRAMES_DIR = pathlib.Path("tools/yolodex/runs/vima-hardhat/frames")
DEFAULT_OUTPUT = pathlib.Path("demo/eval_results.json")
DEFAULT_MARKDOWN = pathlib.Path("docs/eval_results.md")
DEFAULT_MODEL = "gemini-2.5-flash"


def retry_delay_from_error(detail: str, default_s: float) -> float:
    marker = '"retryDelay": "'
    if marker not in detail:
        return default_s
    try:
        suffix = detail.split(marker, 1)[1]
        value = suffix.split('"', 1)[0]
        if value.endswith("s"):
            return max(default_s, float(value[:-1]) + 1.0)
    except (IndexError, ValueError):
        return default_s
    return default_s


def gemini_rest_parts(
    parts: list[dict[str, Any]],
    model: str,
    timeout_s: int,
    retries: int,
    retry_s: float,
) -> str:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout_s) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 429 and attempt < retries:
                delay = retry_delay_from_error(detail, retry_s)
                print(f"[rate-limit] sleeping {delay:.1f}s before retry")
                time.sleep(delay)
                continue
            raise RuntimeError(f"Gemini REST HTTP {exc.code}: {detail}") from exc
    candidate = payload.get("candidates", [{}])[0]
    text_parts = candidate.get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in text_parts).strip()
    return text or f"[empty response: {payload}]"


def image_part(path: pathlib.Path) -> dict[str, Any]:
    mime_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return {
        "inline_data": {
            "mime_type": mime_type,
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        }
    }


def evidence_frames(question: str, memory_path: pathlib.Path, frames_dir: pathlib.Path, top_k: int, max_images: int) -> list[pathlib.Path]:
    episodes = retrieve(load_episodes(memory_path), question, top_k)
    frames: list[pathlib.Path] = []
    seen: set[pathlib.Path] = set()
    for episode in episodes:
        for item in episode.get("evidence_frames", []):
            frame_name = item.get("frame")
            if not frame_name:
                continue
            path = frames_dir / frame_name
            if path.exists() and path not in seen:
                seen.add(path)
                frames.append(path)
            if len(frames) >= max_images:
                return frames
    return frames


def raw_frame_answer(
    question: str,
    frame_paths: list[pathlib.Path],
    model: str,
    timeout_s: int,
    retries: int,
    retry_s: float,
) -> str:
    parts: list[dict[str, Any]] = []
    parts.extend(image_part(path) for path in frame_paths)
    parts.append(
        {
            "text": (
                "Answer this question using only the provided hardhat video frames. "
                "Be concise. If the evidence is uncertain, say so.\n\n"
                f"Question: {question}"
            )
        }
    )
    return gemini_rest_parts(parts, model, timeout_s, retries, retry_s)


def memory_answer_with_retry(args: argparse.Namespace, question: str) -> dict[str, Any]:
    for attempt in range(args.retries + 1):
        result = answer_query(
            pathlib.Path(args.memory),
            question,
            "gemini",
            args.top_k,
            args.model,
            args.timeout_s,
            False,
            "rest",
        )
        return result
    raise AssertionError("unreachable")


def score_answer(answer: str, expected_terms: list[str]) -> float:
    text = answer.lower()
    if not expected_terms:
        return 0.0
    hits = sum(1 for term in expected_terms if term.lower() in text)
    return round(hits / len(expected_terms), 3)


def run_eval(args: argparse.Namespace) -> dict[str, Any]:
    load_env()
    questions = json.loads(pathlib.Path(args.questions).read_text(encoding="utf-8"))
    if args.limit:
        questions = questions[: args.limit]
    results = []
    for index, item in enumerate(questions, start=1):
        question = item["question"]
        print(f"[{index}/{len(questions)}] {question}")
        frames = evidence_frames(
            question,
            pathlib.Path(args.memory),
            pathlib.Path(args.frames_dir),
            args.top_k,
            args.max_images,
        )
        raw_answer = raw_frame_answer(
            question,
            frames,
            args.model,
            args.timeout_s,
            args.retries,
            args.retry_s,
        )
        if args.request_gap_s:
            time.sleep(args.request_gap_s)
        try:
            memory_result = memory_answer_with_retry(args, question)
        except RuntimeError as exc:
            if "429" not in str(exc) or args.retries <= 0:
                raise
            print(f"[rate-limit] sleeping {args.retry_s:.1f}s before retry")
            time.sleep(args.retry_s)
            memory_result = memory_answer_with_retry(args, question)
        expected_terms = item.get("expected_terms", [])
        results.append(
            {
                "id": item.get("id"),
                "question": question,
                "frames": [path.name for path in frames],
                "expected_evidence": item.get("expected_evidence", []),
                "expected_terms": expected_terms,
                "raw_answer": raw_answer,
                "memory_answer": memory_result["answer"],
                "raw_term_score": score_answer(raw_answer, expected_terms),
                "memory_term_score": score_answer(memory_result["answer"], expected_terms),
                "retrieved_episodes": [
                    episode.get("episode_id") for episode in memory_result.get("retrieved_episodes", [])
                ],
            }
        )
        if args.request_gap_s:
            time.sleep(args.request_gap_s)
    return {
        "model": args.model,
        "memory": args.memory,
        "frames_dir": args.frames_dir,
        "results": results,
        "summary": summarize(results),
    }


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    if not results:
        return {}
    raw = sum(item["raw_term_score"] for item in results) / len(results)
    memory = sum(item["memory_term_score"] for item in results) / len(results)
    retrieval_hits = 0
    for item in results:
        expected = set(item.get("expected_evidence", []))
        retrieved = set(item.get("retrieved_episodes", []))
        if expected and expected & retrieved:
            retrieval_hits += 1
    return {
        "questions": len(results),
        "raw_avg_term_score": round(raw, 3),
        "memory_avg_term_score": round(memory, 3),
        "retrieval_hit_rate": round(retrieval_hits / len(results), 3),
    }


def write_markdown(report: dict[str, Any], path: pathlib.Path) -> None:
    lines = [
        "# VIMA Tiny Eval",
        "",
        f"Model: `{report['model']}`",
        f"Memory: `{report['memory']}`",
        "",
        "## Summary",
        "",
        "| metric | value |",
        "|---|---:|",
    ]
    for key, value in report["summary"].items():
        lines.append(f"| {key} | {value} |")
    lines.extend(["", "## Questions", ""])
    lines.append("| id | raw score | memory score | retrieved |")
    lines.append("|---|---:|---:|---|")
    for item in report["results"]:
        retrieved = ", ".join(item["retrieved_episodes"][:3])
        lines.append(
            f"| {item['id']} | {item['raw_term_score']} | "
            f"{item['memory_term_score']} | {retrieved} |"
        )
    lines.extend(["", "## Notes", ""])
    lines.append("Scores are lightweight keyword-coverage sanity checks, not final human labels.")
    lines.append("Use this to choose dashboard examples and paper figures before the full run.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", default=str(DEFAULT_QUESTIONS))
    parser.add_argument("--memory", default=str(DEFAULT_MEMORY))
    parser.add_argument("--frames-dir", default=str(DEFAULT_FRAMES_DIR))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--markdown", default=str(DEFAULT_MARKDOWN))
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--max-images", type=int, default=4)
    parser.add_argument("--timeout-s", type=int, default=20)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--request-gap-s", type=float, default=13.0)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--retry-s", type=float, default=25.0)
    args = parser.parse_args()

    report = run_eval(args)
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_markdown(report, pathlib.Path(args.markdown))
    print(json.dumps(report["summary"], indent=2))
    print(f"wrote {out}")
    print(f"wrote {args.markdown}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
