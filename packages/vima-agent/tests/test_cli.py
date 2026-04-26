from __future__ import annotations

import json

import vima_agent.cli as cli


class FakeClient:
    api_url = "https://example.test/api"

    def get_json(self, path):
        if path == "/health":
            return {"status": "ok"}
        if path == "/cii/summary":
            return {"total_frames": 30, "wrench_time_pct": 86.7}
        if path == "/spatial/zones":
            return {"zones": {"zone a": {"frames": 10}}}
        if path == "/cii/frames":
            return [
                {"frame_id": "a", "category": "P"},
                {"frame_id": "b", "category": "NC"},
            ]
        raise AssertionError(path)


def test_doctor_json(monkeypatch, capsys):
    monkeypatch.setattr(cli, "make_client", lambda args: FakeClient())
    code = cli.main(["doctor", "--json"])
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["ok"] is True
    assert [check["name"] for check in payload["checks"]] == ["health", "cii_summary", "spatial_zones"]


def test_cii_frame_filter(monkeypatch, capsys):
    monkeypatch.setattr(cli, "make_client", lambda args: FakeClient())
    code = cli.main(["cii", "frames", "--filter", "NC", "--json"])
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload == [{"category": "NC", "frame_id": "b"}]


def test_skill_print_contains_no_hallucination_rule(capsys):
    code = cli.main(["skill", "print", "--agent", "codex"])
    assert code == 0
    assert "do not invent construction claims" in capsys.readouterr().out
