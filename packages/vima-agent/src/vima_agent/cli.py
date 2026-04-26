from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from . import __version__
from .client import ApiRefused, BadResponse, VimaClient, VimaError, load_image
from .samples import SAMPLES, sample_names
from .skill import install_skill, skill_text


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except BadResponse as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.exit_code
    except ApiRefused as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.exit_code
    except VimaError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.exit_code


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vima", description="portable cli for the vima spatial api")
    parser.add_argument("--api-url", help="override VIMA_API_URL")
    parser.add_argument("--timeout-s", type=float, default=20.0)
    parser.add_argument("--version", action="version", version=f"vima-agent {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    doctor = sub.add_parser("doctor", help="check api health and demo evidence endpoints")
    add_output_flags(doctor)
    doctor.set_defaults(func=cmd_doctor)

    analyze = sub.add_parser("analyze", help="analyze one local/url/sample frame")
    analyze.add_argument("image", nargs="?", help="local image path or image url")
    analyze.add_argument("--sample", choices=sorted(SAMPLES), help=f"sample frame: {sample_names()}")
    analyze.add_argument("--prompt", choices=["vima", "baseline"], default="vima")
    analyze.add_argument("--timestamp", type=float, default=15.0)
    analyze.add_argument("--event-id", default="vima-agent upload")
    add_output_flags(analyze)
    analyze.set_defaults(func=cmd_analyze)

    compare = sub.add_parser("compare", help="compare vima prompt output with baseline output")
    compare.add_argument("image", nargs="?", help="local image path or image url")
    compare.add_argument("--sample", choices=sorted(SAMPLES), help=f"sample frame: {sample_names()}")
    compare.add_argument("--timestamp", type=float, default=15.0)
    compare.add_argument("--event-id", default="vima-agent compare")
    add_output_flags(compare)
    compare.set_defaults(func=cmd_compare)

    cii = sub.add_parser("cii", help="inspect cached cii evidence")
    cii_sub = cii.add_subparsers(dest="cii_command", required=True)
    cii_summary = cii_sub.add_parser("summary", help="get p/c/nc summary")
    add_output_flags(cii_summary)
    cii_summary.set_defaults(func=cmd_cii_summary)
    cii_frames = cii_sub.add_parser("frames", help="get frame-level cii rows")
    cii_frames.add_argument("--filter", choices=["P", "C", "NC"], help="filter rows by category")
    add_output_flags(cii_frames)
    cii_frames.set_defaults(func=cmd_cii_frames)

    zones = sub.add_parser("zones", help="get spatial zone summary")
    add_output_flags(zones)
    zones.set_defaults(func=cmd_zones)

    eval_cmd = sub.add_parser("eval", help="get temporal eval claims and baseline comparison")
    add_output_flags(eval_cmd)
    eval_cmd.set_defaults(func=cmd_eval)

    skill = sub.add_parser("skill", help="print or install the vima agent skill")
    skill_sub = skill.add_subparsers(dest="skill_command", required=True)
    skill_print = skill_sub.add_parser("print", help="print skill markdown")
    skill_print.add_argument("--agent", default="generic")
    skill_print.set_defaults(func=cmd_skill_print)
    skill_install = skill_sub.add_parser("install", help="install skill into known agent skill dirs")
    skill_install.add_argument("--agent", default="auto", help="auto, codex, claude, gstack, or a path")
    skill_install.add_argument("--force", action="store_true")
    add_output_flags(skill_install)
    skill_install.set_defaults(func=cmd_skill_install)

    return parser


def add_output_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--json", action="store_true", help="emit machine-readable json")


def cmd_doctor(args: argparse.Namespace) -> int:
    client = make_client(args)
    checks = []
    for name, path in [
        ("health", "/health"),
        ("cii_summary", "/cii/summary"),
        ("spatial_zones", "/spatial/zones"),
    ]:
        try:
            payload = client.get_json(path)
            checks.append({"name": name, "ok": True, "path": path, "summary": summarize_payload(payload)})
        except VimaError as exc:
            checks.append({"name": name, "ok": False, "path": path, "error": str(exc)})
    result = {"ok": all(check["ok"] for check in checks), "api_url": client.api_url, "checks": checks}
    print_output(result, args.json, title="vima doctor")
    return 0 if result["ok"] else 3


def cmd_analyze(args: argparse.Namespace) -> int:
    client = make_client(args)
    image = resolve_image_arg(args.image, args.sample)
    result = client.analyze_frame(
        load_image(image),
        prompt=args.prompt,
        timestamp=args.timestamp,
        event_id=args.event_id,
    )
    print_output(result, args.json, title="vima analyze")
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    client = make_client(args)
    image_source = resolve_image_arg(args.image, args.sample)
    image = load_image(image_source)
    vima = client.analyze_frame(image, prompt="vima", timestamp=args.timestamp, event_id=args.event_id)
    baseline = client.analyze_frame(image, prompt="baseline", timestamp=args.timestamp, event_id=args.event_id)
    result = {"image": image.filename, "vima": vima, "baseline": baseline}
    print_output(result, args.json, title="vima compare")
    return 0


def cmd_cii_summary(args: argparse.Namespace) -> int:
    result = make_client(args).get_json("/cii/summary")
    print_output(result, args.json, title="vima cii summary")
    return 0


def cmd_cii_frames(args: argparse.Namespace) -> int:
    rows = make_client(args).get_json("/cii/frames")
    if args.filter:
        rows = [row for row in rows if row.get("category") == args.filter]
    print_output(rows, args.json, title="vima cii frames")
    return 0


def cmd_zones(args: argparse.Namespace) -> int:
    result = make_client(args).get_json("/spatial/zones")
    print_output(result, args.json, title="vima zones")
    return 0


def cmd_eval(args: argparse.Namespace) -> int:
    result = make_client(args).get_json("/eval")
    print_output(result, args.json, title="vima eval")
    return 0


def cmd_skill_print(args: argparse.Namespace) -> int:
    print(skill_text(args.agent))
    return 0


def cmd_skill_install(args: argparse.Namespace) -> int:
    installed = install_skill(args.agent, force=args.force)
    result = {
        "installed": [
            {"agent": target.agent, "path": str(target.path)}
            for target in installed
        ],
        "agent": args.agent,
    }
    if not installed:
        result["hint"] = "no new skill installed; use --force to overwrite or `vima skill print` to paste manually"
    print_output(result, args.json, title="vima skill install")
    return 0


def make_client(args: argparse.Namespace) -> VimaClient:
    return VimaClient(api_url=args.api_url, timeout_s=args.timeout_s)


def resolve_image_arg(image: str | None, sample: str | None) -> str:
    if sample:
        return SAMPLES[sample]["url"]
    if image:
        return image
    raise FileNotFoundError("provide an image path/url or --sample")


def print_output(payload: Any, as_json: bool, title: str) -> None:
    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(f"{title}")
    print(_pretty(payload))


def _pretty(payload: Any) -> str:
    if isinstance(payload, list):
        lines = [f"{len(payload)} rows"]
        for row in payload[:12]:
            if isinstance(row, dict):
                lines.append(format_row(row))
            else:
                lines.append(str(row))
        if len(payload) > 12:
            lines.append(f"... {len(payload) - 12} more")
        return "\n".join(lines)
    if isinstance(payload, dict):
        preferred = ["status", "ok", "pnc", "category", "activity", "confidence", "reasoning", "total_frames", "wrench_time_pct", "source"]
        lines = []
        for key in preferred:
            if key in payload:
                lines.append(f"{key}: {payload[key]}")
        for key, value in payload.items():
            if key not in preferred and len(lines) < 14:
                lines.append(f"{key}: {compact(value)}")
        return "\n".join(lines) if lines else json.dumps(payload, indent=2)
    return str(payload)


def format_row(row: dict[str, Any]) -> str:
    parts = []
    for key in ["frame_id", "frame", "timestamp_s", "category", "pnc", "activity", "confidence"]:
        if key in row:
            parts.append(f"{key}={row[key]}")
    return "  " + " ".join(parts) if parts else "  " + compact(row)


def compact(value: Any) -> str:
    if isinstance(value, (dict, list)):
        text = json.dumps(value, sort_keys=True)
        return text if len(text) <= 180 else text[:177] + "..."
    return str(value)


def summarize_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, list):
        return {"rows": len(payload)}
    if isinstance(payload, dict):
        return {key: payload[key] for key in ["status", "total_frames", "wrench_time_pct", "source"] if key in payload}
    return {"type": type(payload).__name__}
