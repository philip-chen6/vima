"""
Tests for vima-prompt-v1 — the spatial-reasoning scaffolding.

These are unit tests of the prompt structure and parser logic. They do NOT
hit the live Anthropic API (that costs money + time). API integration is
covered separately by running eval_v1.py against real frames.

Run:
    pytest backend/tests/test_prompt_v1.py -v
"""
import json
import pathlib
import sys
from unittest.mock import MagicMock, patch

import pytest

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import prompt_v1
from prompt_v1 import (
    BASELINE_PROMPT,
    EPISODE_TYPES,
    FEW_SHOT,
    ONTOLOGY,
    VIMA_PROMPT_V1,
    EvalRow,
    _build_few_shot_text,
    _encode_image,
    baseline_classify,
    vima_classify,
)


# ── Schema constants ──────────────────────────────────────────────────────
class TestSchemaConstants:
    def test_episode_types_match_paper(self):
        """Paper specifies five episode types — landing copy depends on this."""
        expected = {
            "masonry_work_candidate",
            "scaffold_zone_visible",
            "safety_edge_context",
            "foreground_worker_present",
            "material_staging_visible",
        }
        assert set(EPISODE_TYPES) == expected

    def test_ontology_includes_core_construction_objects(self):
        """At minimum the ontology must cover the things a construction
        superintendent would expect to be flagged."""
        required = {"worker", "scaffold", "guardrail", "open_edge", "ladder"}
        assert required.issubset(set(ONTOLOGY))

    def test_vima_prompt_mentions_OSHA(self):
        """Domain grounding — the prompt must cite OSHA explicitly."""
        assert "OSHA" in VIMA_PROMPT_V1

    def test_vima_prompt_mentions_episode_types(self):
        """All five paper episode types must appear in the system prompt."""
        for episode in EPISODE_TYPES:
            assert episode in VIMA_PROMPT_V1, f"missing {episode}"

    def test_vima_prompt_specifies_json_only(self):
        """Schema enforcement — must instruct JSON-only output."""
        assert "JSON" in VIMA_PROMPT_V1
        assert "no markdown fences" in VIMA_PROMPT_V1.lower() or "no prose" in VIMA_PROMPT_V1.lower()

    def test_baseline_prompt_is_minimal(self):
        """Baseline must be a true floor — one line, no scaffolding. If it
        starts looking like vima, the eval becomes meaningless."""
        assert len(BASELINE_PROMPT) < 200, "baseline prompt should be tiny"
        assert "OSHA" not in BASELINE_PROMPT  # no domain grounding
        assert "episode" not in BASELINE_PROMPT.lower()  # no schema


# ── Few-shot bank ─────────────────────────────────────────────────────────
class TestFewShotBank:
    def test_covers_all_three_pnc_categories(self):
        """One example each of P, C, NC. Without coverage, the model
        will skew toward whichever class dominates the bank."""
        labels = [ex["output"]["pnc"] for ex in FEW_SHOT]
        assert "P" in labels
        assert "C" in labels
        assert "NC" in labels

    def test_examples_have_valid_episode_types(self):
        """Every example's episode field must be one of the five canonical
        types — otherwise we're teaching the model to hallucinate."""
        for ex in FEW_SHOT:
            episode = ex["output"]["episode"]
            assert episode in EPISODE_TYPES, f"bad episode in example: {episode}"

    def test_examples_have_valid_ontology_objects(self):
        """spatial_claims[].object must always be from the ontology."""
        for ex in FEW_SHOT:
            for claim in ex["output"]["spatial_claims"]:
                assert claim["object"] in ONTOLOGY, f"off-ontology: {claim['object']}"

    def test_examples_have_confidence_in_range(self):
        for ex in FEW_SHOT:
            conf = ex["output"]["confidence"]
            assert 0.0 <= conf <= 1.0

    def test_nc_example_has_violation_flag(self):
        """An NC example without a violation flag is a missed teaching
        opportunity — NC frames are exactly when violations happen."""
        nc_examples = [ex for ex in FEW_SHOT if ex["output"]["pnc"] == "NC"]
        assert nc_examples, "must have at least one NC few-shot"
        for ex in nc_examples:
            flags = ex["output"]["violation_flags"]
            assert flags, f"NC example missing violation_flags: {ex['input'][:50]}"

    def test_few_shot_text_includes_all_examples(self):
        """The text builder must inline every example — drop one and you
        lose a teaching slot."""
        text = _build_few_shot_text()
        for i in range(1, len(FEW_SHOT) + 1):
            assert f"Example {i}:" in text


# ── EvalRow scoring ───────────────────────────────────────────────────────
class TestEvalRow:
    def test_correct_when_pnc_matches(self):
        row = EvalRow(
            frame_path="x.jpg",
            ground_truth="P",
            baseline={"pnc": "P", "confidence": 0.9},
            vima={"pnc": "P", "confidence": 0.88, "spatial_claims": [{"object": "worker"}]},
        )
        assert row.baseline_correct
        assert row.vima_correct

    def test_wrong_when_pnc_diverges(self):
        row = EvalRow(
            frame_path="x.jpg",
            ground_truth="NC",
            baseline={"pnc": "P", "confidence": 0.9},  # confidently wrong
            vima={"pnc": "NC", "confidence": 0.7, "spatial_claims": [{"object": "open_edge"}]},
        )
        assert not row.baseline_correct
        assert row.vima_correct

    def test_grounded_when_vima_emits_spatial_claims(self):
        row = EvalRow(
            frame_path="x.jpg",
            ground_truth="P",
            baseline={"pnc": "P", "confidence": 0.9},
            vima={"pnc": "P", "confidence": 0.9, "spatial_claims": [
                {"object": "worker", "location": "center", "distance_m": 1.0}
            ]},
        )
        assert row.vima_grounded

    def test_not_grounded_when_no_spatial_claims(self):
        row = EvalRow(
            frame_path="x.jpg",
            ground_truth="P",
            baseline={"pnc": "P", "confidence": 0.9},
            vima={"pnc": "P", "confidence": 0.9, "spatial_claims": []},
        )
        assert not row.vima_grounded


# ── Image encoder ─────────────────────────────────────────────────────────
class TestImageEncoder:
    def test_encodes_jpeg(self, tmp_path):
        # Minimal JPEG header: a real one-pixel JPEG
        jpeg = bytes.fromhex(
            "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707"
            "07090908"
        ) + b"\x00" * 10 + b"\xff\xd9"
        f = tmp_path / "tiny.jpg"
        f.write_bytes(jpeg)
        b64, media = _encode_image(str(f))
        assert media == "image/jpeg"
        assert isinstance(b64, str) and len(b64) > 0

    def test_encodes_png(self, tmp_path):
        png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 30
        f = tmp_path / "tiny.png"
        f.write_bytes(png_header)
        b64, media = _encode_image(str(f))
        assert media == "image/png"

    def test_unknown_extension_defaults_to_jpeg(self, tmp_path):
        f = tmp_path / "noext"
        f.write_bytes(b"\x00")
        _, media = _encode_image(str(f))
        assert media == "image/jpeg"


# ── Mocked classifier integration ─────────────────────────────────────────
class TestClassifierMocked:
    """Verify the parsing + structuring logic without hitting the API."""

    @patch("prompt_v1.anthropic.Anthropic")
    def test_baseline_parses_clean_json(self, mock_anthropic, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")
        mock_resp = MagicMock()
        mock_resp.content = [MagicMock(text='{"pnc":"P","activity":"laying","confidence":0.9}')]
        mock_anthropic.return_value.messages.create.return_value = mock_resp

        result = baseline_classify(str(f))
        assert result["pnc"] == "P"
        assert result["confidence"] == 0.9

    @patch("prompt_v1.anthropic.Anthropic")
    def test_baseline_strips_markdown_fences(self, mock_anthropic, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")
        mock_resp = MagicMock()
        mock_resp.content = [MagicMock(text='```json\n{"pnc":"NC","activity":"idle","confidence":0.7}\n```')]
        mock_anthropic.return_value.messages.create.return_value = mock_resp

        result = baseline_classify(str(f))
        assert result["pnc"] == "NC"

    @patch("prompt_v1.anthropic.Anthropic")
    def test_baseline_handles_invalid_json(self, mock_anthropic, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")
        mock_resp = MagicMock()
        mock_resp.content = [MagicMock(text="not json at all")]
        mock_anthropic.return_value.messages.create.return_value = mock_resp

        result = baseline_classify(str(f))
        assert result["pnc"] == "?"  # graceful failure
        assert result["confidence"] == 0.0
        assert "raw" in result  # original output preserved for debugging

    @patch("prompt_v1.anthropic.Anthropic")
    def test_vima_attaches_metadata(self, mock_anthropic, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")
        mock_resp = MagicMock()
        mock_resp.content = [MagicMock(text=json.dumps({
            "pnc": "P", "episode": "masonry_work_candidate", "activity": "block-laying",
            "surface": "ground", "in_safe_envelope": True,
            "spatial_claims": [{"object": "concrete_block", "location": "hands", "distance_m": 0.3}],
            "violation_flags": [], "confidence": 0.92,
            "reasoning": "Both hands on a block.",
        }))]
        mock_anthropic.return_value.messages.create.return_value = mock_resp

        result = vima_classify(str(f), event_id="test-evt", timestamp_s=42.5,
                               self_consistency=False)
        assert result["pnc"] == "P"
        assert result["episode"] == "masonry_work_candidate"
        assert result["event_id"] == "test-evt"
        assert result["timestamp_s"] == 42.5
        assert result["prompt"] == "vima-v1"
        assert "model" in result
