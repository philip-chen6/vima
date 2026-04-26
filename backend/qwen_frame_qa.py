#!/usr/bin/env python3
"""Run Qwen-VL over retrieved evidence frames plus episodic memory context."""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Any

from memory_retrieval import compact_episode, load_episodes, retrieve


DEFAULT_MEMORY = pathlib.Path("demo/episodic_memory.json")
DEFAULT_FRAMES_DIR = pathlib.Path("tools/yolodex/runs/vima-hardhat/frames")
DEFAULT_OUTPUT = pathlib.Path("demo/qwen_answer.json")
DEFAULT_MODEL = "Qwen/Qwen2-VL-2B-Instruct"


def resolve_evidence_images(
    episodes: list[dict[str, Any]],
    frames_dir: pathlib.Path,
    max_images: int,
) -> list[pathlib.Path]:
    paths: list[pathlib.Path] = []
    seen: set[pathlib.Path] = set()
    for episode in episodes:
        for frame in episode.get("evidence_frames", []):
            frame_name = frame.get("frame")
            if not frame_name:
                continue
            path = (frames_dir / frame_name).resolve()
            if path.exists() and path not in seen:
                seen.add(path)
                paths.append(path)
            if len(paths) >= max_images:
                return paths
    return paths


def build_messages(query: str, context: list[dict[str, Any]], image_paths: list[pathlib.Path]) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = [
        {"type": "image", "image": f"file://{path}"} for path in image_paths
    ]
    content.append(
        {
            "type": "text",
            "text": (
                "Answer the construction-video question from these evidence frames and "
                "the structured episodic memory. Cite episode ids and frame filenames. "
                "Do not invent objects that are not visible or listed.\n\n"
                f"Question: {query}\n\n"
                f"Episodic memory:\n{json.dumps(context, indent=2)}"
            ),
        }
    )
    return [{"role": "user", "content": content}]


def run_qwen(
    query: str,
    context: list[dict[str, Any]],
    image_paths: list[pathlib.Path],
    model_name: str,
    max_new_tokens: int,
    local_files_only: bool,
) -> str:
    try:
        import torch
        from qwen_vl_utils import process_vision_info
        from transformers import AutoModelForImageTextToText, AutoProcessor
    except ImportError as exc:
        raise RuntimeError(
            "Qwen dependencies are missing. Install with: "
            "python3 -m pip install 'transformers>=4.51.0' qwen-vl-utils torch torchvision accelerate pillow"
        ) from exc

    messages = build_messages(query, context, image_paths)
    model = AutoModelForImageTextToText.from_pretrained(
        model_name,
        torch_dtype="auto",
        device_map="auto",
        local_files_only=local_files_only,
    )
    processor = AutoProcessor.from_pretrained(model_name, local_files_only=local_files_only)
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    ).to(model.device)

    with torch.inference_mode():
        generated_ids = model.generate(**inputs, max_new_tokens=max_new_tokens)
    trimmed = [
        output_ids[len(input_ids) :]
        for input_ids, output_ids in zip(inputs.input_ids, generated_ids)
    ]
    return processor.batch_decode(
        trimmed,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    )[0].strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--memory", default=str(DEFAULT_MEMORY))
    parser.add_argument("--frames-dir", default=str(DEFAULT_FRAMES_DIR))
    parser.add_argument("--query", required=True)
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--max-images", type=int, default=4)
    parser.add_argument("--max-new-tokens", type=int, default=192)
    parser.add_argument("--local-files-only", action="store_true")
    args = parser.parse_args()

    episodes = retrieve(load_episodes(pathlib.Path(args.memory)), args.query, args.top_k)
    context = [compact_episode(episode) for episode in episodes]
    image_paths = resolve_evidence_images(episodes, pathlib.Path(args.frames_dir), args.max_images)
    if not image_paths:
        raise SystemExit(f"no evidence frames found under {args.frames_dir}")

    answer = run_qwen(
        args.query,
        context,
        image_paths,
        args.model,
        args.max_new_tokens,
        args.local_files_only,
    )
    result = {
        "query": args.query,
        "model": args.model,
        "answer": answer,
        "evidence_images": [str(path) for path in image_paths],
        "retrieved_episodes": context,
    }
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(answer)
    print(f"\nwrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
