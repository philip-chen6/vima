from __future__ import annotations

import base64

import pytest

from vima_mcp import server


def test_normalize_api_url_defaults_to_api_path(monkeypatch):
    monkeypatch.delenv("VIMA_API_URL", raising=False)
    assert server.normalize_api_url("https://vimaspatial.tech") == "https://vimaspatial.tech/api"
    assert server.normalize_api_url("vimaspatial.tech") == "https://vimaspatial.tech/api"
    assert server.normalize_api_url("http://localhost:8765") == "http://localhost:8765"


def test_image_from_base64_validates_single_input():
    payload = server.image_from_inputs(
        sample=None,
        image_url=None,
        image_base64=base64.b64encode(b"fake image").decode("ascii"),
        filename="frame.png",
        content_type=None,
    )

    assert payload.filename == "frame.png"
    assert payload.content_type == "image/png"
    assert payload.data == b"fake image"


def test_image_from_inputs_requires_exactly_one_source():
    with pytest.raises(server.VimaMcpError, match="exactly one"):
        server.image_from_inputs(
            sample=None,
            image_url=None,
            image_base64=None,
            filename=None,
            content_type=None,
        )


def test_cii_frames_filters_category(monkeypatch):
    rows = [{"category": "P"}, {"category": "C"}, {"category": "P"}]
    monkeypatch.setattr(server, "get_json", lambda path: rows)

    assert server.vima_cii_frames("P") == [{"category": "P"}, {"category": "P"}]


def test_doctor_summarizes_checks(monkeypatch):
    def fake_get(path):
        payloads = {
            "/health": {"status": "ok"},
            "/cii/summary": {"total_frames": 30, "wrench_time_pct": 86.7},
            "/spatial/zones": {"zones": {}},
        }
        return payloads[path]

    monkeypatch.setattr(server, "get_json", fake_get)

    result = server.vima_doctor()

    assert result["ok"] is True
    assert [check["name"] for check in result["checks"]] == ["health", "cii_summary", "spatial_zones"]
