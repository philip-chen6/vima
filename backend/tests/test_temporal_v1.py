"""
Tests for vima-temporal-v1 — multi-frame state-change detection.

These cover prompt structure, ontology, parser logic, and frame-selection
helpers. They mock the Anthropic client so no API is hit. Live integration
is tested separately by running `python temporal_v1.py --n 8` against real
construction frames.

Run:
    pytest backend/tests/test_temporal_v1.py -v
"""
import json
import pathlib
import sys
from unittest.mock import MagicMock, patch

import pytest

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import temporal_v1
from temporal_v1 import (
    STATE_CHANGE_TYPES,
    SYSTEM,
    _encode_image,
    detect_state_changes,
    select_demo_sequence,
    baseline_single_frame_changes,
)


# ── Schema constants ──────────────────────────────────────────────────────
class TestStateChangeOntology:
    def test_includes_all_paper_relevant_types(self):
        """The ontology has to cover the changes a construction
        superintendent would expect to flag — wall progress, scaffold
        movement, hazard appearance/resolution."""
        required = {
            "course_growth",
            "scaffold_relocated",
            "worker_position_change",
            "hazard_introduced",
            "hazard_resolved",
        }
        assert required.issubset(set(STATE_CHANGE_TYPES))

    def test_includes_explicit_refusal_type(self):
        """A model that can't refuse will hallucinate. 'no_change_detected'
        is the safety valve."""
        assert "no_change_detected" in STATE_CHANGE_TYPES

    def test_no_duplicate_types(self):
        assert len(STATE_CHANGE_TYPES) == len(set(STATE_CHANGE_TYPES))


# ── System prompt ─────────────────────────────────────────────────────────
class TestSystemPrompt:
    def test_demands_proof_frame_citations(self):
        """The headline constraint that distinguishes vima from raw VLMs."""
        assert "start_frame" in SYSTEM
        assert "end_frame" in SYSTEM
        assert "PROOF" in SYSTEM or "proof" in SYSTEM

    def test_lists_every_ontology_type(self):
        for t in STATE_CHANGE_TYPES:
            assert t in SYSTEM, f"missing {t} from system prompt"

    def test_demands_json_only_output(self):
        """If the model emits prose around the JSON, the parser breaks."""
        assert "JSON ONLY" in SYSTEM

    def test_explicit_refusal_instruction(self):
        """The prompt has to actively reward refusal — otherwise the model
        will always output something to be helpful."""
        assert "REFUSE" in SYSTEM or "refuse" in SYSTEM.lower()
        assert "no_change_detected" in SYSTEM

    def test_drift_warning_present(self):
        """Cameras drift, lighting changes — these aren't state changes.
        The prompt must call this out or the model will treat noise as
        signal."""
        lower = SYSTEM.lower()
        assert "drift" in lower or "lighting" in lower or "noise" in lower


# ── Image encoder ─────────────────────────────────────────────────────────
class TestImageEncoder:
    def test_jpeg(self, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")
        b64, media = _encode_image(f)
        assert media == "image/jpeg"
        assert isinstance(b64, str) and len(b64) > 0

    def test_png(self, tmp_path):
        f = tmp_path / "f.png"
        f.write_bytes(b"\x89PNG\r\n\x1a\n")
        _, media = _encode_image(f)
        assert media == "image/png"

    def test_unknown_defaults_to_jpeg(self, tmp_path):
        f = tmp_path / "f.bin"
        f.write_bytes(b"\x00")
        _, media = _encode_image(f)
        assert media == "image/jpeg"


# ── detect_state_changes integration (mocked Anthropic) ──────────────────
class TestDetectStateChanges:
    def _make_resp(self, payload: dict):
        resp = MagicMock()
        resp.content = [MagicMock(text=json.dumps(payload))]
        return resp

    @patch("temporal_v1.anthropic.Anthropic")
    def test_parses_clean_response(self, mock_client_class, tmp_path):
        # Set up two test frames
        f1 = tmp_path / "f1.jpg"
        f2 = tmp_path / "f2.jpg"
        f1.write_bytes(b"\xff\xd8\xff\xd9")
        f2.write_bytes(b"\xff\xd8\xff\xd9")

        mock_client = MagicMock()
        mock_client.messages.create.return_value = self._make_resp({
            "n_frames_examined": 2,
            "claims": [{
                "type": "course_growth",
                "description": "wall grew 2 courses",
                "start_frame": 0,
                "end_frame": 1,
                "evidence": "courses visible",
                "confidence": 0.85,
                "severity": "info",
            }],
            "refusals": [],
        })
        mock_client_class.return_value = mock_client

        result = detect_state_changes(
            [f1, f2],
            [{"timestamp_s": 0.0}, {"timestamp_s": 60.0}],
        )
        assert result["n_frames_examined"] == 2
        assert len(result["claims"]) == 1
        assert result["claims"][0]["type"] == "course_growth"
        assert "elapsed_s" in result
        assert "model" in result

    @patch("temporal_v1.anthropic.Anthropic")
    def test_strips_markdown_fences(self, mock_client_class, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")

        resp = MagicMock()
        resp.content = [MagicMock(text='```json\n{"n_frames_examined":1,"claims":[],"refusals":[]}\n```')]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = resp
        mock_client_class.return_value = mock_client

        result = detect_state_changes([f], [{"timestamp_s": 0.0}])
        assert result["n_frames_examined"] == 1
        assert result["claims"] == []

    @patch("temporal_v1.anthropic.Anthropic")
    def test_handles_unparseable_response(self, mock_client_class, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")

        resp = MagicMock()
        resp.content = [MagicMock(text="not json at all")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = resp
        mock_client_class.return_value = mock_client

        result = detect_state_changes([f], [{"timestamp_s": 0.0}])
        assert result.get("parse_error") is True
        assert "raw" in result
        assert result["claims"] == []

    def test_rejects_mismatched_lengths(self, tmp_path):
        f = tmp_path / "f.jpg"
        f.write_bytes(b"\xff\xd8\xff\xd9")
        with pytest.raises(ValueError):
            detect_state_changes([f, f], [{"timestamp_s": 0.0}])  # 2 frames, 1 meta

    @patch("temporal_v1.anthropic.Anthropic")
    def test_attaches_frame_paths(self, mock_client_class, tmp_path):
        # frame_paths in result should be relative to repo root for use
        # by the frontend. Use a real path inside the repo for this.
        repo_frame = (
            ROOT.parent
            / "frontend"
            / "public"
            / "vima-yozakura-frames"
            / "frame_001.jpg"
        )
        if not repo_frame.exists():
            pytest.skip("no frame_001.jpg available in repo")

        mock_client = MagicMock()
        mock_client.messages.create.return_value = self._make_resp({
            "n_frames_examined": 1,
            "claims": [],
            "refusals": [],
        })
        mock_client_class.return_value = mock_client

        result = detect_state_changes([repo_frame], [{"timestamp_s": 0.0}])
        # Should be repo-root-relative
        assert "frame_paths" in result
        assert result["frame_paths"][0].startswith("frontend/public/")


# ── select_demo_sequence helper ──────────────────────────────────────────
class TestSelectDemoSequence:
    def test_returns_n_frames(self):
        paths, meta = select_demo_sequence(n_frames=4)
        assert len(paths) <= 4
        assert len(paths) == len(meta)

    def test_paths_are_real_files(self):
        paths, _ = select_demo_sequence(n_frames=4)
        for p in paths:
            assert p.exists(), f"selected non-existent frame: {p}"

    def test_meta_includes_timestamps(self):
        _, meta = select_demo_sequence(n_frames=4)
        for m in meta:
            # cii-results.json rows have timestamp_s + activity + category
            assert isinstance(m, dict)
            assert "timestamp_s" in m or "activity" in m  # at least one
