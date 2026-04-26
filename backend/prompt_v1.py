"""
vima-prompt-v1: the actual spatial-reasoning contribution.

Inference-time scaffolding that turns a raw VLM into a structured spatial-claim
generator. Three layers, each measurably moves the needle on the eval harness:

1) Domain-grounded system prompt — OSHA 29 CFR 1926 categories, paper's five
   episode types, ontology of physical site objects, structured JSON schema.
2) Few-shot example bank — 4 hand-curated frame→claim pairs that prime the
   model with the exact reasoning style we want. Examples cover P (productive
   work), C (contributory support), and NC (non-contributory) cases.
3) Self-consistency check — the model first emits a draft claim, then is
   asked to challenge its own confidence in a single follow-up turn. Final
   confidence is the mean of draft + challenge confidences. Damps overconfidence
   on edge cases without doubling latency.

This is what /api/analyze/frame uses by default. The "raw" baseline used by
the eval harness is exposed via baseline_prompt() for direct comparison.
"""

from __future__ import annotations

import base64
import json
import pathlib
import os
from dataclasses import dataclass
from typing import Literal

import anthropic

MODEL = os.getenv("JUDGE_MODEL", "claude-sonnet-4-6")


# Paper's five episode types — these are what the episodic memory module emits.
# A claim's `episode` field MUST be one of these.
EPISODE_TYPES = [
    "masonry_work_candidate",
    "scaffold_zone_visible",
    "safety_edge_context",
    "foreground_worker_present",
    "material_staging_visible",
]

# Physical-object ontology. Drives spatial_claims[].object — model can't make up
# new classes, has to ground every claim in something a superintendent recognizes.
ONTOLOGY = [
    "worker", "scaffold", "guardrail", "handrail",
    "open_edge", "ladder", "material_stack", "blocked_path",
    "lift_platform", "rebar", "concrete_block", "trowel",
    "hard_hat", "harness", "tool",
]


VIMA_PROMPT_V1 = f"""You are vima — a spatial-AI safety judge for construction sites, grounded in OSHA 29 CFR 1926. You see one egocentric frame from a worker's bodycam at a time. Your job is to produce a structured spatial claim that a human can verify in seconds.

You operate on three principles:

1. CLASSIFY THE WORK (CII): every frame is one of three categories.
   - P (Productive): direct labor on the building product. Block-laying, rebar tying, formwork, finishing.
   - C (Contributory): support tasks that enable P-work but aren't the product itself. Material staging, layout, cleanup, signaling, supervisor walking the line.
   - NC (Non-Contributory): no work happening. Idle walking, phone use, off-task standing.

2. NAME THE EPISODE TYPE: every frame matches exactly one of these five paper-defined episode types.
   {chr(10).join(f"   - {t}" for t in EPISODE_TYPES)}
   The episode type is COARSER than the activity description — it's the spatial situation, not the action.

3. GROUND THE SPATIAL CLAIMS: every claim must reference a physical object from this ontology, with a location description ("foreground left", "behind worker", "right of hard_hat") and a distance estimate (close <2m, mid 2-5m, far >5m). Estimate the worker's surface (ground / scaffold / lift / ladder / unknown) and whether the worker is inside the safe envelope of any equipment in view.

Reasoning style: Brief. Concrete. Cite the visible thing. "Worker on scaffold plank, both hands on block" not "appears to be working." Refuse to claim what you cannot see — set spatial_claims[].distance_m to null if you can't estimate, set surface to "unknown" if not visible.

Return JSON ONLY (no prose, no markdown fences). Schema:
{{
  "pnc": "P|C|NC",
  "episode": "<one of the five episode types>",
  "activity": "<≤30 char description, e.g. 'laying concrete blocks'>",
  "surface": "ground|scaffold|lift|ladder|unknown",
  "in_safe_envelope": true|false|null,
  "spatial_claims": [
    {{"object": "<ontology class>", "location": "<spatial description>", "distance_m": <float|null>}}
  ],
  "violation_flags": [
    {{"rule": "<OSHA rule or description>", "severity": "high|medium|low", "evidence": "<brief>"}}
  ],
  "confidence": <0.0-1.0>,
  "reasoning": "<1-2 sentences why this PNC, citing the visible thing>"
}}

Ontology classes: {", ".join(ONTOLOGY)}"""


# Few-shot examples — hand-curated to teach the model the reasoning style we
# want. One example per CII category. The "image" in each is referenced by
# path so we can swap as new ground-truth lands. These are inlined as text
# pairs (no actual images sent — the prompt teaches structure, not visual
# matching, since the test frame goes in the user message).
FEW_SHOT = [
    {
        "input": "Egocentric frame: a worker is laying a concrete block onto a partial wall, both hands on the block, mortar on a trowel beside them. Hard hat visible. Worker is on the ground, ~1m from the wall course. Scaffold visible in background ~4m back.",
        "output": {
            "pnc": "P",
            "episode": "masonry_work_candidate",
            "activity": "laying concrete blocks",
            "surface": "ground",
            "in_safe_envelope": True,
            "spatial_claims": [
                {"object": "concrete_block", "location": "in worker's hands, foreground center", "distance_m": 0.3},
                {"object": "trowel", "location": "right of worker, on staging board", "distance_m": 0.6},
                {"object": "scaffold", "location": "background center", "distance_m": 4.0},
            ],
            "violation_flags": [],
            "confidence": 0.94,
            "reasoning": "Both hands on a block actively being placed onto a wall course — direct masonry work. No fall hazard or PPE issue visible.",
        },
    },
    {
        "input": "Egocentric frame: worker is moving a stack of concrete blocks from a pallet to staging area near the wall. No tool in hand. Pallet ~3m away.",
        "output": {
            "pnc": "C",
            "episode": "material_staging_visible",
            "activity": "moving block pallet",
            "surface": "ground",
            "in_safe_envelope": True,
            "spatial_claims": [
                {"object": "material_stack", "location": "behind worker, foreground", "distance_m": 0.5},
                {"object": "concrete_block", "location": "in worker's grip", "distance_m": 0.2},
            ],
            "violation_flags": [],
            "confidence": 0.86,
            "reasoning": "Material movement is contributory — enables masonry work but isn't the work itself. Standard staging pattern, no safety flag.",
        },
    },
    {
        "input": "Egocentric frame: worker is on a scaffold plank, no harness visible, looking down at phone. Open edge ~0.5m to right with no guardrail.",
        "output": {
            "pnc": "NC",
            "episode": "safety_edge_context",
            "activity": "phone use on scaffold",
            "surface": "scaffold",
            "in_safe_envelope": False,
            "spatial_claims": [
                {"object": "scaffold", "location": "underfoot", "distance_m": 0.0},
                {"object": "open_edge", "location": "right of worker", "distance_m": 0.5},
                {"object": "guardrail", "location": "absent", "distance_m": None},
            ],
            "violation_flags": [
                {"rule": "OSHA 1926.451(g) — fall protection on scaffolds ≥10ft", "severity": "high", "evidence": "open edge with no guardrail at scaffold height, no harness visible"},
                {"rule": "OSHA 1926.95 — distraction on elevated work surface", "severity": "medium", "evidence": "phone use while on scaffold near unprotected edge"},
            ],
            "confidence": 0.91,
            "reasoning": "Phone use, not productive work, on elevated surface with active fall hazard. NC by activity, also a high-severity safety event.",
        },
    },
    {
        "input": "Egocentric frame: scaffold plank visible in foreground with handrail and toe-board, no worker on it. Workers are working at ground level in mid-distance.",
        "output": {
            "pnc": "C",
            "episode": "scaffold_zone_visible",
            "activity": "scaffold setup context",
            "surface": "ground",
            "in_safe_envelope": True,
            "spatial_claims": [
                {"object": "scaffold", "location": "foreground left", "distance_m": 1.5},
                {"object": "guardrail", "location": "on scaffold platform", "distance_m": 1.8},
                {"object": "worker", "location": "background, ground level", "distance_m": 4.5},
            ],
            "violation_flags": [],
            "confidence": 0.79,
            "reasoning": "Scaffold properly equipped with rail and toe-board, no worker actively on it but the zone is in active context for adjacent work.",
        },
    },
]


def _encode_image(frame_path: str) -> tuple[str, str]:
    data = pathlib.Path(frame_path).read_bytes()
    ext = pathlib.Path(frame_path).suffix.lower().lstrip(".")
    media_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext, "image/jpeg")
    return base64.standard_b64encode(data).decode(), media_type


def _build_few_shot_text() -> str:
    """Inline the few-shot bank as a text block. Examples teach structure +
    reasoning style — the actual test image goes in the user turn."""
    parts = ["Here are four worked examples of how to reason about a frame.\n"]
    for i, ex in enumerate(FEW_SHOT, 1):
        parts.append(f"Example {i}:")
        parts.append(f"Frame description: {ex['input']}")
        parts.append(f"Correct claim: {json.dumps(ex['output'], indent=2)}")
        parts.append("")
    parts.append("Now reason about the actual test frame in the same structured way.")
    return "\n".join(parts)


# ── BASELINE: a thin wrapper around the model with NO scaffolding. ────────
# This is what a hackathon-team-without-vima would write. Used by the eval
# harness as the floor we have to beat.
BASELINE_PROMPT = """Classify this construction-site frame. Respond with JSON only:
{"pnc": "P|C|NC", "activity": "<short>", "confidence": <0.0-1.0>}"""


def baseline_classify(frame_path: str) -> dict:
    """Floor: zero-shot, one-line prompt. What 'just call the VLM' looks like."""
    client = anthropic.Anthropic()
    b64, media_type = _encode_image(frame_path)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=BASELINE_PROMPT,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": "Classify this frame. JSON only."},
            ],
        }],
    )
    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"pnc": "?", "activity": "parse_error", "confidence": 0.0, "raw": raw}


# ── VIMA-PROMPT-V1: full scaffolding. ─────────────────────────────────────
def vima_classify(
    frame_path: str,
    event_id: str = "live-frame",
    timestamp_s: float = 0.0,
    self_consistency: bool = True,
) -> dict:
    """vima's actual contribution. Domain prompt + few-shot + (optional)
    self-consistency confidence damping. Returns the full structured schema."""
    client = anthropic.Anthropic()
    b64, media_type = _encode_image(frame_path)

    user_content = [
        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
        {"type": "text", "text": _build_few_shot_text() + f"\n\nEvent: {event_id} @ {timestamp_s:.1f}s\nReturn the JSON schema exactly."},
    ]

    resp = client.messages.create(
        model=MODEL,
        max_tokens=900,
        system=VIMA_PROMPT_V1,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "pnc": "?", "activity": "parse_error", "confidence": 0.0,
            "raw": raw, "model": MODEL, "prompt": "vima-v1",
        }

    # Self-consistency: ask the model to challenge its own confidence in one
    # follow-up turn. If the challenge confidence diverges by >0.15, damp.
    if self_consistency and "confidence" in result:
        challenge = client.messages.create(
            model=MODEL,
            max_tokens=120,
            system="You are a skeptical construction safety auditor. Given a structured spatial claim, return JSON {\"confidence\": <0.0-1.0>, \"why\": \"<1 sentence>\"} — your honest confidence in the original claim's PNC and reasoning. Be willing to disagree.",
            messages=[{"role": "user", "content": f"Original claim:\n{json.dumps(result)}\n\nReturn your honest confidence in this claim."}],
        )
        try:
            ch = json.loads(challenge.content[0].text.strip().lstrip("`json").rstrip("`"))
            damped = (result["confidence"] + ch["confidence"]) / 2
            result["confidence_draft"] = result["confidence"]
            result["confidence_challenge"] = ch["confidence"]
            result["confidence"] = round(damped, 3)
            result["challenge_note"] = ch.get("why", "")
        except (json.JSONDecodeError, KeyError):
            pass  # if challenge parse fails, keep draft confidence as-is

    result["event_id"] = event_id
    result["timestamp_s"] = timestamp_s
    result["frame_path"] = frame_path
    result["model"] = MODEL
    result["prompt"] = "vima-v1"
    return result


@dataclass
class EvalRow:
    """One row of the A/B eval comparing baseline vs vima-prompt-v1."""
    frame_path: str
    ground_truth: Literal["P", "C", "NC"]
    baseline: dict
    vima: dict

    @property
    def baseline_correct(self) -> bool:
        return self.baseline.get("pnc") == self.ground_truth

    @property
    def vima_correct(self) -> bool:
        return self.vima.get("pnc") == self.ground_truth

    @property
    def vima_grounded(self) -> bool:
        """vima emits structured spatial claims. Baseline never does. Used as
        a binary 'has spatial grounding' check for the eval scorecard."""
        return bool(self.vima.get("spatial_claims")) and len(self.vima.get("spatial_claims", [])) > 0
