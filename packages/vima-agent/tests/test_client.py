from __future__ import annotations

import importlib.resources

from vima_agent.client import ImagePayload, _multipart_body, normalize_api_url
from vima_agent.skill import detect_targets, install_skill


def test_normalize_default_host_adds_api_path():
    assert normalize_api_url("https://vimaspatial.tech") == "https://vimaspatial.tech/api"


def test_normalize_localhost_does_not_add_api_path():
    assert normalize_api_url("http://localhost:8765") == "http://localhost:8765"


def test_multipart_body_contains_file_metadata_and_bytes():
    image = ImagePayload(data=b"abc", filename="frame.jpg", content_type="image/jpeg")
    body = _multipart_body("boundary", "file", image)
    assert b'name="file"; filename="frame.jpg"' in body
    assert b"content-type: image/jpeg" in body
    assert b"\r\n\r\nabc\r\n--boundary--" in body


def test_auto_skill_detection_only_uses_existing_roots(tmp_path, monkeypatch):
    monkeypatch.setattr("pathlib.Path.home", lambda: tmp_path)
    assert detect_targets("auto") == []
    tmp_path.joinpath(".codex").mkdir()
    assert [target.agent for target in detect_targets("auto")] == ["codex"]


def test_skill_template_bundles_references_and_golden_samples():
    # Locks the contract that the package ships docs + golden samples — if
    # anyone removes the force-include in pyproject.toml or moves the
    # subdirs, this test catches it before publish.
    root = importlib.resources.files("vima_agent.skill_template")
    references = root.joinpath("references")
    samples = root.joinpath("golden_samples")
    assert references.is_dir()
    assert samples.is_dir()
    expected_refs = {"api-schema.md", "workflows.md", "troubleshooting.md"}
    expected_samples = {
        "doctor.json", "cii-summary.json", "cii-frames.json",
        "zones.json", "eval.json", "analyze-masonry-p.json",
        "compare-masonry-p.json",
    }
    actual_refs = {item.name for item in references.iterdir() if item.is_file()}
    actual_samples = {item.name for item in samples.iterdir() if item.is_file()}
    missing_refs = expected_refs - actual_refs
    missing_samples = expected_samples - actual_samples
    assert not missing_refs, f"missing refs: {missing_refs}"
    assert not missing_samples, f"missing samples: {missing_samples}"


def test_install_copies_references_and_samples(tmp_path, monkeypatch):
    # Install into a sandboxed home and confirm the docs land alongside
    # SKILL.md — protects against a regression where install_skill only
    # writes SKILL.md and forgets the references/golden_samples subdirs.
    monkeypatch.setattr("pathlib.Path.home", lambda: tmp_path)
    tmp_path.joinpath(".codex").mkdir()
    targets = install_skill("codex", force=True)
    assert len(targets) == 1
    installed_root = targets[0].path
    assert installed_root.joinpath("SKILL.md").exists()
    assert installed_root.joinpath("references", "api-schema.md").exists()
    assert installed_root.joinpath("golden_samples", "doctor.json").exists()
