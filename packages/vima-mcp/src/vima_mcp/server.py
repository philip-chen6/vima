from __future__ import annotations

import base64
import json
import mimetypes
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Literal

from fastmcp import FastMCP
from starlette.responses import JSONResponse

DEFAULT_API_URL = "https://vimaspatial.tech/api"
DEFAULT_TIMEOUT_S = 30.0

SAMPLES = {
    "masonry-p": {
        "url": "https://vimaspatial.tech/masonry-frames/frame_000.jpg",
        "filename": "masonry-p.jpg",
        "description": "productive masonry work sample frame",
    },
    "masonry-c": {
        "url": "https://vimaspatial.tech/masonry-frames/frame_005.jpg",
        "filename": "masonry-c.jpg",
        "description": "contributory construction context sample frame",
    },
    "masonry-nc": {
        "url": "https://vimaspatial.tech/masonry-frames/frame_010.jpg",
        "filename": "masonry-nc.jpg",
        "description": "non-contributory/uncertain construction sample frame",
    },
}

mcp = FastMCP(
    name="vima spatial api",
    instructions=(
        "use these tools to inspect vima construction-video spatial evidence. "
        "prefer cached evidence tools before calling live frame analysis."
    ),
)


class VimaMcpError(RuntimeError):
    pass


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
        parsed = urllib.parse.urlparse(f"https://{value}")
    path = parsed.path.rstrip("/")
    if parsed.netloc.endswith("vimaspatial.tech") and path in {"", "/"}:
        parsed = parsed._replace(path="/api")
    return urllib.parse.urlunparse(parsed._replace(path=parsed.path.rstrip("/"))).rstrip("/")


def request_json(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
    timeout_s: float | None = None,
) -> Any:
    api_url = normalize_api_url()
    suffix = path if path.startswith("/") else f"/{path}"
    url = f"{api_url}{suffix}"
    clean_params = {key: value for key, value in (params or {}).items() if value is not None}
    if clean_params:
        url = f"{url}?{urllib.parse.urlencode(clean_params)}"
    req_headers = {"accept": "application/json", **(headers or {})}
    api_key = os.getenv("VIMA_API_KEY")
    if api_key:
        req_headers["authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout_s or DEFAULT_TIMEOUT_S) as resp:
            return decode_json(resp.read(), url)
    except urllib.error.HTTPError as exc:
        payload = decode_json(exc.read(), url, allow_text=True)
        raise VimaMcpError(error_message(payload, exc.code, url)) from exc
    except urllib.error.URLError as exc:
        raise VimaMcpError(f"could not reach vima api at {url}: {exc.reason}") from exc
    except TimeoutError as exc:
        raise VimaMcpError(f"timed out calling vima api at {url}") from exc


def get_json(path: str, params: dict[str, Any] | None = None) -> Any:
    return request_json("GET", path, params=params)


def post_frame(
    image: ImagePayload,
    *,
    prompt: Literal["vima", "baseline"],
    timestamp_s: float,
    event_id: str,
) -> Any:
    boundary = f"----vima-mcp-{uuid.uuid4().hex}"
    body = multipart_body(boundary, "file", image)
    headers = {"content-type": f"multipart/form-data; boundary={boundary}"}
    params = {"prompt": prompt, "timestamp": timestamp_s, "event_id": event_id}
    return request_json("POST", "/analyze/frame", params=params, data=body, headers=headers)


def image_from_inputs(
    *,
    sample: str | None,
    image_url: str | None,
    image_base64: str | None,
    filename: str | None,
    content_type: str | None,
) -> ImagePayload:
    inputs = [bool(sample), bool(image_url), bool(image_base64)]
    if sum(inputs) != 1:
        raise VimaMcpError("provide exactly one of sample, image_url, or image_base64")
    if sample:
        if sample not in SAMPLES:
            raise VimaMcpError(f"unknown sample '{sample}'. choose one of: {', '.join(sorted(SAMPLES))}")
        sample_def = SAMPLES[sample]
        return download_image(sample_def["url"], filename=sample_def["filename"])
    if image_url:
        return download_image(image_url)
    assert image_base64 is not None
    try:
        data = base64.b64decode(image_base64, validate=True)
    except ValueError as exc:
        raise VimaMcpError("image_base64 must be valid base64") from exc
    return ImagePayload(
        data=data,
        filename=filename or "upload.jpg",
        content_type=content_type or mimetypes.guess_type(filename or "upload.jpg")[0] or "image/jpeg",
    )


def download_image(url: str, *, filename: str | None = None) -> ImagePayload:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise VimaMcpError("image_url must be an http(s) url")
    try:
        with urllib.request.urlopen(url, timeout=20.0) as resp:
            data = resp.read()
            content_type = resp.headers.get_content_type() or "application/octet-stream"
    except urllib.error.URLError as exc:
        raise VimaMcpError(f"could not download image {url}: {exc.reason}") from exc
    resolved_filename = filename or pathlib.Path(parsed.path).name or "upload.jpg"
    return ImagePayload(data=data, filename=resolved_filename, content_type=content_type)


def multipart_body(boundary: str, field_name: str, image: ImagePayload) -> bytes:
    head = (
        f"--{boundary}\r\n"
        f'content-disposition: form-data; name="{field_name}"; filename="{image.filename}"\r\n'
        f"content-type: {image.content_type}\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return head + image.data + tail


def decode_json(data: bytes, url: str, allow_text: bool = False) -> Any:
    text = data.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        if allow_text:
            return {"message": text.strip()}
        raise VimaMcpError(f"vima api returned non-json from {url}") from exc


def error_message(payload: Any, status: int, url: str) -> str:
    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message") or payload.get("error")
        if detail:
            return f"vima api {status} at {url}: {detail}"
    return f"vima api {status} at {url}"


@mcp.custom_route("/health", methods=["GET"])
async def health_check(request) -> JSONResponse:
    return JSONResponse({"status": "ok", "api_url": normalize_api_url(), "mcp_path": "/mcp"})


@mcp.tool
def vima_doctor() -> dict[str, Any]:
    """check vima api health and cached evidence endpoints."""
    checks = []
    for name, path in [
        ("health", "/health"),
        ("cii_summary", "/cii/summary"),
        ("spatial_zones", "/spatial/zones"),
    ]:
        try:
            payload = get_json(path)
            checks.append({"name": name, "ok": True, "path": path, "summary": summarize_payload(payload)})
        except VimaMcpError as exc:
            checks.append({"name": name, "ok": False, "path": path, "error": str(exc)})
    return {"ok": all(check["ok"] for check in checks), "api_url": normalize_api_url(), "checks": checks}


@mcp.tool
def vima_analyze_frame(
    sample: Literal["masonry-p", "masonry-c", "masonry-nc"] | None = None,
    image_url: str | None = None,
    image_base64: str | None = None,
    filename: str | None = None,
    content_type: str | None = None,
    prompt: Literal["vima", "baseline"] = "vima",
    timestamp_s: float = 15.0,
    event_id: str = "vima mcp upload",
) -> dict[str, Any]:
    """analyze one construction frame from a sample, image url, or base64 image."""
    image = image_from_inputs(
        sample=sample,
        image_url=image_url,
        image_base64=image_base64,
        filename=filename,
        content_type=content_type,
    )
    return post_frame(image, prompt=prompt, timestamp_s=timestamp_s, event_id=event_id)


@mcp.tool
def vima_compare_frame(
    sample: Literal["masonry-p", "masonry-c", "masonry-nc"] | None = None,
    image_url: str | None = None,
    image_base64: str | None = None,
    filename: str | None = None,
    content_type: str | None = None,
    timestamp_s: float = 15.0,
    event_id: str = "vima mcp compare",
) -> dict[str, Any]:
    """compare vima prompt output with the baseline prompt for one frame."""
    image = image_from_inputs(
        sample=sample,
        image_url=image_url,
        image_base64=image_base64,
        filename=filename,
        content_type=content_type,
    )
    return {
        "image": image.filename,
        "vima": post_frame(image, prompt="vima", timestamp_s=timestamp_s, event_id=event_id),
        "baseline": post_frame(image, prompt="baseline", timestamp_s=timestamp_s, event_id=event_id),
    }


@mcp.tool
def vima_cii_summary() -> dict[str, Any]:
    """get cached cii wrench-time summary stats."""
    return get_json("/cii/summary")


@mcp.tool
def vima_cii_frames(category: Literal["P", "C", "NC"] | None = None) -> list[dict[str, Any]]:
    """get cached frame-level cii rows, optionally filtered by category."""
    rows = get_json("/cii/frames")
    if category:
        rows = [row for row in rows if row.get("category") == category]
    return rows


@mcp.tool
def vima_spatial_zones() -> dict[str, Any]:
    """get zone-level spatial productivity evidence."""
    return get_json("/spatial/zones")


@mcp.tool
def vima_eval() -> dict[str, Any]:
    """get temporal eval claims and baseline comparison."""
    return get_json("/eval")


def summarize_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, list):
        return {"rows": len(payload)}
    if isinstance(payload, dict):
        return {
            key: payload[key]
            for key in ["status", "total_frames", "wrench_time_pct", "source"]
            if key in payload
        }
    return {"type": type(payload).__name__}


def main() -> None:
    host = os.getenv("VIMA_MCP_HOST", "0.0.0.0")
    port = int(os.getenv("VIMA_MCP_PORT", "8766"))
    mcp.run(transport="http", host=host, port=port)
