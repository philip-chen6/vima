from __future__ import annotations

from vima_agent.client import ImagePayload, _multipart_body, normalize_api_url


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
