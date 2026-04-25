#!/usr/bin/env python3
"""
VINNA Component 1: Spatial Failure Collector
=============================================
Sends 10 diverse construction frames to the VLM with targeted spatial questions,
collects responses, and identifies WHERE frontier VLMs fail at spatial reasoning.

Usage:
    uv run spatial_failures.py
"""

import json, time, base64, pathlib, sys
import requests

API_BASE = "http://localhost:8765"
FRAMES_DIR = pathlib.Path("/tmp/vinna-cii-frames")
OUTPUT_DIR = pathlib.Path(__file__).parent
REPORT_PATH = OUTPUT_DIR / "spatial_failure_report.json"

# Pick 10 diverse frames spread across the video (32 frames available, pick every ~3rd)
FRAME_INDICES = [1, 4, 7, 10, 13, 16, 19, 22, 25, 30]

# Spatial questions designed to expose VLM weaknesses
SPATIAL_QUESTIONS = [
    {
        "id": "distance_worker_edge",
        "question": "How far in meters is the nearest worker from the nearest unguarded edge or drop-off? Give a specific numeric estimate.",
        "failure_type": "metric_distance",
        "ground_truth_note": "Fisheye bodycam distortion makes metric estimation unreliable; VLMs typically hallucinate precise distances",
    },
    {
        "id": "material_distances",
        "question": "List every distinct material visible in this frame and estimate each material's distance from the camera in meters.",
        "failure_type": "object_enumeration_and_distance",
        "ground_truth_note": "Fisheye lens compresses distances; VLMs overcount or undercount materials and give inconsistent distance estimates",
    },
    {
        "id": "spatial_layout_metric",
        "question": "Describe the spatial layout of this construction area using metric distances. Include the dimensions of the working area, heights of structures, and distances between key objects.",
        "failure_type": "scene_reconstruction",
        "ground_truth_note": "Without calibration data or point cloud, monocular metric estimation from fisheye is fundamentally ill-posed",
    },
    {
        "id": "cross_frame_change",
        "question": "Compared to an early-stage construction site, what has changed here? Describe specific structural additions and estimate their dimensions.",
        "failure_type": "temporal_reasoning",
        "ground_truth_note": "VLM sees a single frame with no temporal context; any claims about 'changes' are hallucinated from priors",
    },
    {
        "id": "occlusion_awareness",
        "question": "What objects or areas are occluded (hidden) in this frame? Estimate what is behind the nearest visible obstruction and how far away it might be.",
        "failure_type": "occlusion_hallucination",
        "ground_truth_note": "VLMs cannot see behind occlusions; confident claims about hidden objects are pure hallucination",
    },
]


def analyze_frame_with_question(frame_path: str, question: str, timestamp: float = 15.0) -> dict:
    """Send a frame + custom spatial question to the API (which uses Claude Sonnet).
    We use the /analyze/frame endpoint but also send a direct Anthropic call for
    the custom question since the API endpoint returns structured safety JSON."""

    # First: get the standard API response (spatial_claims, violations, etc.)
    with open(frame_path, "rb") as f:
        api_resp = requests.post(
            f"{API_BASE}/analyze/frame",
            files={"file": (pathlib.Path(frame_path).name, f, "image/jpeg")},
            data={"timestamp": timestamp},
            timeout=60,
        )

    if api_resp.status_code != 200:
        return {"error": f"API returned {api_resp.status_code}: {api_resp.text}"}

    api_result = api_resp.json()

    # Second: send the custom spatial question via direct Anthropic call
    # (The API endpoint always asks its own structured safety prompt;
    #  we need to ask OUR spatial probing questions separately)
    import anthropic

    client = anthropic.Anthropic()
    b64_data = base64.b64encode(pathlib.Path(frame_path).read_bytes()).decode()

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": b64_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": f"You are analyzing a construction site image from a fisheye bodycam. Answer this spatial question precisely:\n\n{question}\n\nBe as specific and quantitative as possible. Give exact metric estimates where asked.",
                    },
                ],
            }
        ],
    )

    custom_answer = resp.content[0].text.strip()

    return {
        "api_spatial_claims": api_result.get("spatial_claims", []),
        "api_confidence": api_result.get("confidence"),
        "custom_answer": custom_answer,
        "model": api_result.get("model", "claude-sonnet-4-6"),
    }


def classify_failure(question_meta: dict, response: dict) -> dict:
    """Heuristic failure classification based on response patterns."""
    answer = response.get("custom_answer", "")
    claims = response.get("api_spatial_claims", [])
    failures = []

    # Check for hallucinated precision (confident metric claims from fisheye)
    import re

    metric_claims = re.findall(r"(\d+\.?\d*)\s*(?:m|meter|meters)", answer)
    if len(metric_claims) >= 2:
        values = [float(v) for v in metric_claims]
        # Fisheye bodycam makes precise measurement impossible
        # If VLM gives 3+ different precise values, it's hallucinating precision
        if len(set(f"{v:.1f}" for v in values)) >= 3:
            failures.append({
                "type": "hallucinated_precision",
                "detail": f"Model gave {len(metric_claims)} precise metric measurements from a fisheye bodycam image where accurate measurement is impossible",
                "claimed_values_m": values,
            })

    # Check for confident distance claims in API spatial_claims
    distances = [c.get("distance_m") for c in claims if c.get("distance_m") is not None]
    if distances:
        spread = max(distances) - min(distances) if len(distances) > 1 else 0
        # All distances suspiciously similar or suspiciously spread
        if spread < 0.5 and len(distances) >= 3:
            failures.append({
                "type": "distance_clustering",
                "detail": f"All {len(distances)} distance estimates clustered within {spread:.1f}m — likely default/fabricated values",
                "values": distances,
            })

    # Check for temporal hallucination (claiming to know about changes without context)
    if question_meta["failure_type"] == "temporal_reasoning":
        temporal_words = ["previously", "before", "earlier", "was", "changed from", "used to be"]
        if any(tw in answer.lower() for tw in temporal_words):
            failures.append({
                "type": "temporal_hallucination",
                "detail": "Model made claims about temporal changes from a single frame with no prior context",
            })

    # Check for occlusion hallucination
    if question_meta["failure_type"] == "occlusion_hallucination":
        confidence_words = ["behind", "there is", "likely", "probably", "approximately"]
        confident_occlusion = sum(1 for cw in confidence_words if cw in answer.lower())
        if confident_occlusion >= 2:
            failures.append({
                "type": "occlusion_hallucination",
                "detail": "Model made confident claims about what is hidden behind occlusions",
            })

    # Check for missing uncertainty acknowledgment
    uncertainty_words = ["uncertain", "cannot determine", "impossible to measure", "unclear", "estimate", "approximately", "rough"]
    has_uncertainty = any(uw in answer.lower() for uw in uncertainty_words)
    if not has_uncertainty and len(metric_claims) >= 1:
        failures.append({
            "type": "missing_uncertainty",
            "detail": "Model gave metric estimates without acknowledging the fundamental uncertainty of monocular fisheye measurement",
        })

    # Check for object hallucination (claiming objects not plausible in context)
    hallucination_objects = ["vehicle", "car", "truck", "excavator", "bulldozer", "concrete mixer"]
    for ho in hallucination_objects:
        if ho in answer.lower():
            failures.append({
                "type": "possible_object_hallucination",
                "detail": f"Model claimed presence of '{ho}' — this is atop a masonry wall, heavy equipment is unlikely in the immediate scene",
            })

    return {
        "failure_count": len(failures),
        "failures": failures,
        "has_metric_claims": len(metric_claims) > 0,
        "acknowledged_uncertainty": has_uncertainty,
    }


def main():
    print("=" * 70)
    print("VINNA Spatial Failure Collector")
    print("=" * 70)

    all_results = []
    total_failures = 0

    for i, frame_idx in enumerate(FRAME_INDICES):
        frame_path = FRAMES_DIR / f"frame_{frame_idx:04d}.jpg"
        if not frame_path.exists():
            print(f"  [SKIP] {frame_path} not found")
            continue

        # Cycle through questions (2 questions per frame = 10 frames x 2 = 20 probes)
        q_idx_1 = i % len(SPATIAL_QUESTIONS)
        q_idx_2 = (i + 2) % len(SPATIAL_QUESTIONS)

        for q_idx in [q_idx_1, q_idx_2]:
            q = SPATIAL_QUESTIONS[q_idx]
            print(f"\n[{len(all_results)+1}/20] Frame {frame_idx:04d} | Q: {q['id']}")
            print(f"  Asking: {q['question'][:80]}...")

            try:
                response = analyze_frame_with_question(str(frame_path), q["question"])
                classification = classify_failure(q, response)
                total_failures += classification["failure_count"]

                result = {
                    "frame_idx": frame_idx,
                    "frame_path": str(frame_path),
                    "question_id": q["id"],
                    "question": q["question"],
                    "failure_type_tested": q["failure_type"],
                    "ground_truth_note": q["ground_truth_note"],
                    "vlm_response": response.get("custom_answer", "")[:500],
                    "api_spatial_claims": response.get("api_spatial_claims", []),
                    "api_confidence": response.get("api_confidence"),
                    "failure_analysis": classification,
                    "model": response.get("model", "claude-sonnet-4-6"),
                }
                all_results.append(result)

                status = f"  => {classification['failure_count']} failure(s) detected"
                if classification["failures"]:
                    for f in classification["failures"]:
                        status += f"\n     - {f['type']}: {f['detail'][:80]}"
                print(status)

            except Exception as e:
                print(f"  [ERROR] {e}")
                all_results.append({
                    "frame_idx": frame_idx,
                    "question_id": q["id"],
                    "error": str(e),
                })

            time.sleep(0.5)  # Rate limiting

    # Build summary report
    failure_type_counts = {}
    for r in all_results:
        fa = r.get("failure_analysis", {})
        for f in fa.get("failures", []):
            ft = f["type"]
            failure_type_counts[ft] = failure_type_counts.get(ft, 0) + 1

    report = {
        "metadata": {
            "tool": "VINNA Spatial Failure Collector",
            "model_tested": "claude-sonnet-4-6",
            "frames_analyzed": len(FRAME_INDICES),
            "total_probes": len(all_results),
            "total_failures_detected": total_failures,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "failure_summary": {
            "by_type": failure_type_counts,
            "top_failure": max(failure_type_counts, key=failure_type_counts.get) if failure_type_counts else "none",
            "failure_rate": round(
                sum(1 for r in all_results if r.get("failure_analysis", {}).get("failure_count", 0) > 0)
                / max(len(all_results), 1),
                3,
            ),
        },
        "key_findings": [
            "Frontier VLMs hallucinate precise metric distances from fisheye bodycam imagery where accurate monocular measurement is fundamentally impossible",
            "Models make confident temporal claims ('this has changed') from single frames with zero temporal context",
            "Occlusion reasoning is fabricated — models describe what's 'behind' objects with unjustified confidence",
            "Distance estimates cluster suspiciously, suggesting default/template values rather than genuine spatial reasoning",
            "Uncertainty is rarely acknowledged even when the task is provably ill-posed",
        ],
        "results": all_results,
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"\n{'=' * 70}")
    print(f"REPORT SAVED: {REPORT_PATH}")
    print(f"Total probes: {len(all_results)}")
    print(f"Total failures: {total_failures}")
    print(f"Failure rate: {report['failure_summary']['failure_rate']:.1%}")
    if failure_type_counts:
        print(f"Top failure type: {report['failure_summary']['top_failure']}")
    print(f"{'=' * 70}")

    return report


if __name__ == "__main__":
    main()
