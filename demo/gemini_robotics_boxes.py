#!/usr/bin/env python3
"""Ask Gemini Robotics-ER for semantic bounding boxes on one construction frame."""

from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import re
import urllib.error
import urllib.request
from typing import Any

from PIL import Image


DEFAULT_IMAGE = pathlib.Path("tools/yolodex/runs/vinna-hardhat/frames/frame_000001.jpg")
DEFAULT_OUTPUT = pathlib.Path("demo/gemini_robotics_boxes.json")
DEFAULT_MODEL = "gemini-robotics-er-1.6-preview"
DEFAULT_QUERIES = [
    "worker",
    "concrete block wall",
    "scaffold",
    "guardrail or open edge",
    "material stack",
    "tool in hand",
]


def load_env(path: pathlib.Path = pathlib.Path(".env")) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def extract_json_array(text: str) -> list[dict[str, Any]]:
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        raise ValueError(f"no JSON array found in response: {text}")
    data = json.loads(match.group(0))
    if not isinstance(data, list):
        raise ValueError(f"expected JSON list, got {type(data).__name__}")
    return data


def normalized_box_to_pixels(box: list[int | float], width: int, height: int) -> list[int]:
    ymin, xmin, ymax, xmax = box
    return [
        round(float(xmin) / 1000 * width),
        round(float(ymin) / 1000 * height),
        round(float(xmax) / 1000 * width),
        round(float(ymax) / 1000 * height),
    ]


def robotics_boxes(
    image_path: pathlib.Path,
    queries: list[str],
    model_name: str,
    timeout_s: int,
) -> dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is required.")

    image_bytes = image_path.read_bytes()
    mime_type = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    prompt = f"""
Return bounding boxes as a JSON array with labels. Never return masks, markdown,
or code fencing. Limit to 25 objects. Find these construction objects if visible:
{", ".join(queries)}.

If an object is present multiple times, name instances uniquely.
The format must be exactly:
[{{"box_2d": [ymin, xmin, ymax, xmax], "label": "label"}}]

Coordinates are normalized integers from 0 to 1000. If no objects are found,
return [].
"""
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                    {"text": prompt},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
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
        raise RuntimeError(f"Gemini Robotics REST HTTP {exc.code}: {detail}") from exc

    parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    boxes = extract_json_array(text)
    width, height = Image.open(image_path).size
    return {
        "image": str(image_path),
        "model": model_name,
        "queries": queries,
        "raw_text": text,
        "boxes": [
            {
                **box,
                "pixel_xyxy": normalized_box_to_pixels(box["box_2d"], width, height)
                if "box_2d" in box
                else None,
            }
            for box in boxes
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", default=str(DEFAULT_IMAGE))
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--query", action="append", dest="queries")
    parser.add_argument("--timeout-s", type=int, default=20)
    args = parser.parse_args()

    load_env()
    queries = args.queries or DEFAULT_QUERIES
    result = robotics_boxes(pathlib.Path(args.image), queries, args.model, args.timeout_s)
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result["boxes"], indent=2))
    print(f"\nwrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
