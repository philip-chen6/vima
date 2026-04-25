"""
3.1 spatial judge — sends frame + geometry stats to the model, gets structured JSON back.
Model: JUDGE_MODEL env var (default: claude-sonnet-4-6). Josh specified "3.1" = cheaper/flash tier.
"""
import os, base64, json, pathlib
import anthropic

MODEL = os.getenv("JUDGE_MODEL", "claude-sonnet-4-6")

ONTOLOGY = [
    "worker", "scaffold", "guardrail", "handrail",
    "open_edge", "ladder", "material_stack", "blocked_path",
]

SYSTEM = """You are a construction site safety AI (OSHA CFR 29 1926 domain).
Given:
- A fisheye egocentric frame from a worker's bodycam
- 3D point cloud geometry stats for the same timestamp

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

    user_content = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        },
        {
            "type": "text",
            "text": f"""Event: {event_id} @ {timestamp_s:.1f}s

Point cloud geometry stats:
{json.dumps(geometry_stats, indent=2)}

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
    return result
