"""
3.1 spatial judge — sends frame + geometry stats to the model, gets structured JSON back.
Model: JUDGE_MODEL env var (default: claude-sonnet-4-6). Josh specified "3.1" = cheaper/flash tier.

When the frame is part of the precomputed inference set (see
backend/inference_context.py), we ALSO inject monocular depth percentiles +
SAM segment summaries into the prompt so the judge can ground spatial
claims in real geometry instead of guessing from the 2D image.
"""
import os, base64, json, pathlib
import anthropic

from inference_context import build_judge_payload

MODEL = os.getenv("JUDGE_MODEL", "claude-sonnet-4-6")

ONTOLOGY = [
    "worker", "scaffold", "guardrail", "handrail",
    "open_edge", "ladder", "material_stack", "blocked_path",
]

SYSTEM = """You are a construction site safety AI (OSHA CFR 29 1926 domain).
Given:
- A fisheye egocentric frame from a worker's bodycam
- 3D point cloud geometry stats for the same timestamp
- (When available) Monocular depth statistics from depth-anything-v2 — relative
  inverse-depth percentiles + per-quadrant means. Larger values = closer to
  the camera. Use these to ground "near" vs "far" claims rather than guessing
  from the 2D image alone.
- (When available) SAM segmentation summary — for each salient object: a
  normalized [x,y] centroid in [0,1] (image coords, top-left origin), the
  fraction of the frame it covers, and its median relative depth. Use these
  to make precise spatial claims like "worker centered at (0.4, 0.7) covering
  8% of frame at relative depth 0.61 — close-foreground".

Return JSON ONLY (no prose, no markdown fences). Schema:
{
  "pnc": "P|C|NC",
  "activity": "<30 char description>",
  "spatial_claims": [
    {"object": "<ontology class>", "location": "<spatial description>", "distance_m": <float|null>}
  ],
  "violation_flags": [
    {"rule": "<OSHA rule or description>", "severity": "high|medium|low", "evidence": "<brief>"}
  ],
  "confidence": <0.0-1.0>,
  "reasoning": "<1-2 sentences why P/C/NC>"
}

Ontology classes: """ + ", ".join(ONTOLOGY)


def _encode_image(frame_path: str) -> tuple[str, str]:
    data = pathlib.Path(frame_path).read_bytes()
    ext = pathlib.Path(frame_path).suffix.lower().lstrip(".")
    media_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext, "image/jpeg")
    return base64.standard_b64encode(data).decode(), media_type


def judge_event(
    frame_path: str,
    geometry_stats: dict,
    event_id: str,
    timestamp_s: float,
) -> dict:
    client = anthropic.Anthropic()

    b64, media_type = _encode_image(frame_path)

    # Optional: enrich with precomputed depth + SAM stats if this frame is in
    # the inference manifest. Falls back silently to the geometry-only flow
    # for live-uploaded frames that aren't part of the fixed set.
    inference_payload = build_judge_payload(frame_path)
    inference_block = ""
    if inference_payload is not None:
        inference_block = (
            "\n\nMonocular depth + SAM segmentation context:\n"
            + json.dumps(inference_payload, indent=2)
        )

    user_content = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        },
        {
            "type": "text",
            "text": f"""Event: {event_id} @ {timestamp_s:.1f}s

Point cloud geometry stats:
{json.dumps(geometry_stats, indent=2)}{inference_block}

Classify this event and identify any spatial safety claims or OSHA violations.
Return the JSON schema exactly as specified.""",
        },
    ]

    resp = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=SYSTEM,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    result = json.loads(raw)
    result["event_id"] = event_id
    result["timestamp_s"] = timestamp_s
    result["frame_path"] = frame_path
    result["model"] = MODEL
    # Surface whether the spatial-grounding context was actually attached, so
    # downstream consumers (UI, ablations) can tell informed claims from
    # vision-only ones.
    result["used_inference_context"] = inference_payload is not None
    return result
