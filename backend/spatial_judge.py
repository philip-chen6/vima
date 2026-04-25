"""
Spatial Intelligence Judge — sends frame(s) + depth/detection context to the model,
gets structured spatial claims back.

NOT violation detection. Spatial reasoning: distances, relationships, changes.

Model: JUDGE_MODEL env var (default: claude-sonnet-4-6).
"""
import os, base64, json, pathlib
from typing import Optional
import anthropic

MODEL = os.getenv("JUDGE_MODEL", "claude-sonnet-4-6")

# Open vocabulary — not a fixed OSHA ontology. These are spatial object classes
# the model should look for, but it can detect anything.
SPATIAL_ONTOLOGY = [
    "scaffold", "guardrail", "handrail", "ladder", "rebar_cage",
    "material_stack", "concrete_form", "trench", "open_edge",
    "crane", "equipment", "vehicle", "worker", "tool",
    "pipe", "conduit", "beam", "column", "wall", "floor", "ceiling",
]

# ── Single-frame spatial reasoning ──────────────────────────────────────────

SYSTEM_SPATIAL = """You are a construction site SPATIAL INTELLIGENCE system.
You reason about 3D space from egocentric bodycam imagery.

You are NOT an OSHA violation detector. You are a spatial reasoner.

Given:
- An egocentric fisheye frame from a worker's bodycam
- 3D geometry stats (from point cloud or depth estimation)
- Optionally: detected objects with bounding boxes

Your job: describe the SPATIAL STATE of the scene. Estimate distances.
Identify spatial relationships between objects. Quantify what you see.

Return JSON ONLY (no prose, no markdown fences). Schema:
{
  "scene_description": "<1-2 sentence spatial summary of what the camera sees>",
  "spatial_claims": [
    {
      "object": "<what>",
      "location": "<spatial description relative to camera/other objects>",
      "distance_from_camera_m": <float|null>,
      "dimensions_estimate": "<e.g. '~2m wide, ~1.5m tall' or null>",
      "spatial_relationships": ["<e.g. 'left of scaffold', 'above trench', '~1m from open edge'>"]
    }
  ],
  "distance_estimates": [
    {
      "from": "<object A>",
      "to": "<object B>",
      "distance_m": <float>,
      "confidence": <0.0-1.0>,
      "method": "<how you estimated: depth cue, perspective, known object size, geometry stats>"
    }
  ],
  "zone_classification": "<e.g. 'elevated platform near east edge', 'ground level rebar work area'>",
  "worker_spatial_context": {
    "count": <int>,
    "positions": ["<spatial description of each worker's position>"],
    "density_description": "<e.g. 'clustered within 3m near scaffold' or 'spread across 10m work area'>"
  },
  "notable_spatial_features": ["<anything spatially interesting: open edges, height changes, confined spaces, access paths>"],
  "confidence": <0.0-1.0>,
  "reasoning": "<2-3 sentences explaining your spatial analysis — what depth cues, perspective lines, known object sizes did you use?>"
}

Known construction object classes (use these when applicable, but detect anything you see):
""" + ", ".join(SPATIAL_ONTOLOGY)


# ── Frame-pair change detection ─────────────────────────────────────────────

SYSTEM_CHANGE_DETECTION = """You are a construction site SPATIAL CHANGE DETECTOR.
You compare two egocentric frames from the SAME location at different times to identify
what physically changed in 3D space.

Given:
- Frame T1 (earlier walkthrough) with geometry stats
- Frame T2 (later walkthrough) with geometry stats
- Optionally: detected objects in each frame

Your job: identify SPATIAL CHANGES between T1 and T2. Estimate displacement,
addition, removal. Quantify the physical delta.

Return JSON ONLY (no prose, no markdown fences). Schema:
{
  "changes": [
    {
      "claim": "<human-readable spatial change claim>",
      "object": "<what changed>",
      "change_type": "added|removed|moved|modified|grown|shrunk",
      "estimated_displacement_m": <float|null>,
      "estimated_size_delta": "<e.g. '+2m length', '-40% area', null>",
      "t1_location": "<where it was in T1, or 'not present'>",
      "t2_location": "<where it is in T2, or 'not present'>",
      "confidence": <0.0-1.0>,
      "evidence": "<what visual/depth cues support this claim>"
    }
  ],
  "unchanged": ["<objects/features that appear stable between T1 and T2>"],
  "spatial_summary": "<1-2 sentence summary of net spatial change>",
  "progress_assessment": {
    "construction_progress": "forward|stalled|regression",
    "evidence": "<brief justification>"
  },
  "confidence": <0.0-1.0>,
  "reasoning": "<2-3 sentences on how you determined changes — alignment cues, perspective matching, object correspondence>"
}

Known construction object classes (use these when applicable, but detect anything you see):
""" + ", ".join(SPATIAL_ONTOLOGY)


# ── Spatial query answering ─────────────────────────────────────────────────

SYSTEM_SPATIAL_QUERY = """You are a construction site SPATIAL QUERY system.
You answer specific spatial questions about a construction scene using
egocentric video frames and geometric context.

Given:
- One or more egocentric frames with geometry stats
- A spatial question (e.g. "what is within 3m of the open edge?",
  "how far is the worker from the scaffold?", "is there clearance above the rebar?")

Answer the question with spatial precision. Include distance estimates,
spatial relationships, and confidence levels.

Return JSON ONLY (no prose, no markdown fences). Schema:
{
  "question": "<the spatial question asked>",
  "answer": "<direct answer with spatial specifics>",
  "supporting_claims": [
    {
      "claim": "<spatial fact that supports the answer>",
      "distance_m": <float|null>,
      "confidence": <0.0-1.0>,
      "evidence": "<visual/depth cue>"
    }
  ],
  "confidence": <0.0-1.0>,
  "reasoning": "<how you arrived at this answer spatially>"
}

Known construction object classes: """ + ", ".join(SPATIAL_ONTOLOGY)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _encode_image(frame_path: str) -> tuple[str, str]:
    data = pathlib.Path(frame_path).read_bytes()
    ext = pathlib.Path(frame_path).suffix.lower().lstrip(".")
    media_type = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    }.get(ext, "image/jpeg")
    return base64.standard_b64encode(data).decode(), media_type


def _make_image_block(frame_path: str) -> dict:
    b64, media_type = _encode_image(frame_path)
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": b64},
    }


def _parse_json_response(raw: str) -> dict:
    """Strip markdown fences if present, parse JSON."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


def _call_model(system: str, user_content: list, max_tokens: int = 1500) -> dict:
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    return _parse_json_response(resp.content[0].text)


# ── Public API ──────────────────────────────────────────────────────────────

def judge_spatial(
    frame_path: str,
    geometry_stats: dict,
    event_id: str,
    timestamp_s: float,
    detections: Optional[list[dict]] = None,
) -> dict:
    """
    Single-frame spatial reasoning.
    Returns structured spatial claims about the scene.
    """
    user_content = [
        _make_image_block(frame_path),
        {
            "type": "text",
            "text": f"""Frame: {event_id} @ {timestamp_s:.1f}s

3D geometry stats:
{json.dumps(geometry_stats, indent=2)}

{f"Detected objects:{chr(10)}{json.dumps(detections, indent=2)}" if detections else "No pre-computed detections — identify objects from the image."}

Analyze the spatial state of this construction scene. Estimate distances between objects.
Describe spatial relationships. Quantify what you see.""",
        },
    ]

    result = _call_model(SYSTEM_SPATIAL, user_content, max_tokens=1500)
    result["event_id"] = event_id
    result["timestamp_s"] = timestamp_s
    result["frame_path"] = frame_path
    result["model"] = MODEL
    result["mode"] = "spatial_reasoning"
    return result


def judge_change(
    frame_t1_path: str,
    frame_t2_path: str,
    geometry_stats_t1: dict,
    geometry_stats_t2: dict,
    event_id: str,
    timestamp_t1: float,
    timestamp_t2: float,
    detections_t1: Optional[list[dict]] = None,
    detections_t2: Optional[list[dict]] = None,
) -> dict:
    """
    Frame-pair spatial change detection.
    Compares two frames from different walkthroughs at the same location.
    Returns structured spatial diff.
    """
    user_content = [
        {"type": "text", "text": "=== FRAME T1 (earlier walkthrough) ==="},
        _make_image_block(frame_t1_path),
        {
            "type": "text",
            "text": f"""T1 timestamp: {timestamp_t1:.1f}s
T1 geometry:
{json.dumps(geometry_stats_t1, indent=2)}
{f"T1 detections:{chr(10)}{json.dumps(detections_t1, indent=2)}" if detections_t1 else ""}""",
        },
        {"type": "text", "text": "=== FRAME T2 (later walkthrough) ==="},
        _make_image_block(frame_t2_path),
        {
            "type": "text",
            "text": f"""T2 timestamp: {timestamp_t2:.1f}s
T2 geometry:
{json.dumps(geometry_stats_t2, indent=2)}
{f"T2 detections:{chr(10)}{json.dumps(detections_t2, indent=2)}" if detections_t2 else ""}

Compare these two frames from the same location at different times.
Identify what physically changed in 3D space. Estimate displacements.
Determine if construction progress occurred.""",
        },
    ]

    result = _call_model(SYSTEM_CHANGE_DETECTION, user_content, max_tokens=2000)
    result["event_id"] = event_id
    result["timestamp_t1"] = timestamp_t1
    result["timestamp_t2"] = timestamp_t2
    result["frame_t1_path"] = frame_t1_path
    result["frame_t2_path"] = frame_t2_path
    result["model"] = MODEL
    result["mode"] = "change_detection"
    return result


def judge_spatial_query(
    question: str,
    frame_paths: list[str],
    geometry_stats_list: list[dict],
    event_id: str = "query",
) -> dict:
    """
    Answer a spatial question about one or more frames.
    e.g. "What is within 3m of the open edge?"
    """
    user_content = []
    for i, (fp, gs) in enumerate(zip(frame_paths, geometry_stats_list)):
        if len(frame_paths) > 1:
            user_content.append({"type": "text", "text": f"=== Frame {i+1} ==="})
        user_content.append(_make_image_block(fp))
        user_content.append({
            "type": "text",
            "text": f"Geometry stats:\n{json.dumps(gs, indent=2)}",
        })

    user_content.append({
        "type": "text",
        "text": f"""SPATIAL QUESTION: {question}

Answer this question using the frame(s) and geometry context above.
Be spatially precise — include distance estimates and confidence levels.""",
    })

    result = _call_model(SYSTEM_SPATIAL_QUERY, user_content, max_tokens=1200)
    result["event_id"] = event_id
    result["question"] = question
    result["frame_paths"] = frame_paths
    result["model"] = MODEL
    result["mode"] = "spatial_query"
    return result
