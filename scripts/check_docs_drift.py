#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys


WATCHED_PREFIXES = (
    "packages/vima-agent/",
    "packages/vima-mcp/",
)

WATCHED_FILES = {
    "backend/api.py",
    "backend/inference_context.py",
    "infra/Caddyfile",
    "infra/docker-compose.yml",
    "infra/Dockerfile.mcp",
}

DOC_PREFIXES = (
    "docs/",
)

DOC_FILES = {
    "docs.json",
    "README.md",
    "infra/README.md",
    "frontend/app/page.tsx",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="fail if public surface changes without docs updates")
    parser.add_argument("--base", required=True, help="base git ref")
    parser.add_argument("--head", default="HEAD", help="head git ref, or WORKTREE for unstaged/staged changes")
    args = parser.parse_args()

    changed = changed_files(args.base, args.head)
    watched = sorted(path for path in changed if is_watched(path))
    docs = sorted(path for path in changed if is_docs(path))

    if watched and not docs:
        print("docs drift check failed: public surface changed without docs updates", file=sys.stderr)
        print("\nwatched changes:", file=sys.stderr)
        for path in watched:
            print(f"  - {path}", file=sys.stderr)
        print("\nupdate one of: docs/**, docs.json, README.md, infra/README.md, frontend/app/page.tsx", file=sys.stderr)
        print("agent prompt: docs/AGENT_DOCS_AUDIT.md", file=sys.stderr)
        return 1

    if watched:
        print("docs drift check passed")
        print("watched changes:")
        for path in watched:
            print(f"  - {path}")
        print("docs changes:")
        for path in docs:
            print(f"  - {path}")
    else:
        print("docs drift check skipped: no watched public-surface changes")
    return 0


def changed_files(base: str, head: str) -> set[str]:
    if head == "WORKTREE":
        output = run(["git", "diff", "--name-only", base])
        staged = run(["git", "diff", "--cached", "--name-only", base])
        untracked = run(["git", "ls-files", "--others", "--exclude-standard"])
        return clean_paths(output + "\n" + staged + "\n" + untracked)
    output = run(["git", "diff", "--name-only", f"{base}...{head}"])
    return clean_paths(output)


def clean_paths(output: str) -> set[str]:
    return {line.strip() for line in output.splitlines() if line.strip()}


def is_watched(path: str) -> bool:
    return path in WATCHED_FILES or path.startswith(WATCHED_PREFIXES)


def is_docs(path: str) -> bool:
    return path in DOC_FILES or path.startswith(DOC_PREFIXES)


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, text=True)
    except subprocess.CalledProcessError as exc:
        print(f"command failed: {' '.join(cmd)}", file=sys.stderr)
        print(exc.output or "", file=sys.stderr)
        raise


if __name__ == "__main__":
    sys.exit(main())
