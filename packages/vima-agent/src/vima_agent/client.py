from __future__ import annotations

import json
import mimetypes
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any


DEFAULT_API_URL = "https://vimaspatial.tech/api"


class VimaError(RuntimeError):
    exit_code = 3


class ApiUnavailable(VimaError):
    exit_code = 3


class ApiRefused(VimaError):
    exit_code = 4


class BadResponse(VimaError):
    exit_code = 5


@dataclass(frozen=True)
class ImagePayload:
    data: bytes
    filename: str
    content_type: str


def normalize_api_url(raw: str | None = None) -> str:
    value = (raw or os.getenv("VIMA_API_URL") or DEFAULT_API_URL).strip()
    if not value:
        value = DEFAULT_API_URL
    parsed = urllib.parse.urlparse(value)
    if not parsed.scheme:
        value = f"https://{value}"
        parsed = urllib.parse.urlparse(value)
    path = parsed.path.rstrip("/")
    if parsed.netloc.endswith("vimaspatial.tech") and path in {"", "/"}:
        parsed = parsed._replace(path="/api")
    return urllib.parse.urlunparse(parsed._replace(path=parsed.path.rstrip("/"))).rstrip("/")


class VimaClient:
    def __init__(self, api_url: str | None = None, timeout_s: float = 20.0):
        self.api_url = normalize_api_url(api_url)
        self.timeout_s = timeout_s
        self.api_key = os.getenv("VIMA_API_KEY")

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return self._request_json("GET", path, params=params)

    def post_json(self, path: str, body: Any, params: dict[str, Any] | None = None) -> Any:
        data = json.dumps(body).encode("utf-8")
        headers = {"content-type": "application/json"}
        return self._request_json("POST", path, params=params, data=data, headers=headers)

    def analyze_frame(
        self,
        image: ImagePayload,
        *,
        prompt: str = "vima",
        timestamp: float = 15.0,
        event_id: str = "vima-agent upload",
    ) -> Any:
        boundary = f"----vima-{uuid.uuid4().hex}"
        body = _multipart_body(boundary, "file", image)
        headers = {"content-type": f"multipart/form-data; boundary={boundary}"}
        params = {"prompt": prompt, "timestamp": timestamp, "event_id": event_id}
        return self._request_json("POST", "/analyze/frame", params=params, data=body, headers=headers)

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        url = self._url(path, params)
        req_headers = {"accept": "application/json", **(headers or {})}
        if self.api_key:
            req_headers["authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                return _decode_json(resp.read(), url)
        except urllib.error.HTTPError as exc:
            payload = _decode_json(exc.read(), url, allow_text=True)
            message = _error_message(payload, exc.code, url)
            if exc.code in {401, 403, 429, 503}:
                raise ApiRefused(message) from exc
            raise ApiUnavailable(message) from exc
        except urllib.error.URLError as exc:
            raise ApiUnavailable(f"could not reach vima api at {url}: {exc.reason}") from exc
        except TimeoutError as exc:
            raise ApiUnavailable(f"timed out calling vima api at {url}") from exc

    def _url(self, path: str, params: dict[str, Any] | None = None) -> str:
        suffix = path if path.startswith("/") else f"/{path}"
        url = f"{self.api_url}{suffix}"
        clean_params = {
            key: value
            for key, value in (params or {}).items()
            if value is not None
        }
        if clean_params:
            url = f"{url}?{urllib.parse.urlencode(clean_params)}"
        return url


def load_image(source: str) -> ImagePayload:
    parsed = urllib.parse.urlparse(source)
    if parsed.scheme in {"http", "https"}:
        try:
            with urllib.request.urlopen(source, timeout=20.0) as resp:
                data = resp.read()
                content_type = resp.headers.get_content_type() or "application/octet-stream"
        except urllib.error.URLError as exc:
            raise ApiUnavailable(f"could not download image {source}: {exc.reason}") from exc
        filename = pathlib.Path(parsed.path).name or "upload.jpg"
        return ImagePayload(data=data, filename=filename, content_type=content_type)

    path = pathlib.Path(source).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"image not found: {path}")
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return ImagePayload(data=path.read_bytes(), filename=path.name, content_type=content_type)


def _multipart_body(boundary: str, field_name: str, image: ImagePayload) -> bytes:
    head = (
        f"--{boundary}\r\n"
        f'content-disposition: form-data; name="{field_name}"; filename="{image.filename}"\r\n'
        f"content-type: {image.content_type}\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return head + image.data + tail


def _decode_json(data: bytes, url: str, allow_text: bool = False) -> Any:
    text = data.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        if allow_text:
            return {"message": text.strip()}
        raise BadResponse(f"vima api returned non-json from {url}") from exc


def _error_message(payload: Any, status: int, url: str) -> str:
    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message") or payload.get("error")
        if detail:
            return f"vima api {status} at {url}: {detail}"
    return f"vima api {status} at {url}"
