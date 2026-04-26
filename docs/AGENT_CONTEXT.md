# VIMA Agent Context

Last updated: 2026-04-26

## Project Summary

VIMA is the HackTech Ironsite spatial-intelligence demo. It turns egocentric
construction footage into auditable evidence surfaces for humans and agents:
dashboard pages, a FastAPI backend, a CLI, and a hosted MCP endpoint.

## Current Production

| Surface | URL |
| --- | --- |
| Landing | `https://vimaspatial.tech` |
| Dashboard | `https://vimaspatial.tech/demo` |
| Temporal eval | `https://vimaspatial.tech/eval` |
| API | `https://vimaspatial.tech/api` |
| MCP health | `https://vimaspatial.tech/mcp/health` |
| MCP endpoint | `https://vimaspatial.tech/mcp` |

Production runs on a Vultr 1 vCPU / 2 GB VPS through Docker Compose:

- Caddy on `80`/`443`
- Next.js frontend on `3000`
- FastAPI backend on `8765`
- FastMCP service on `8766`

## Canonical Verification Commands

```bash
curl -sf https://vimaspatial.tech/api/health | jq
curl -sf https://vimaspatial.tech/api/cii/summary | jq
curl -sf https://vimaspatial.tech/api/spatial/zones | jq
curl -sf https://vimaspatial.tech/api/eval | jq
curl -sf https://vimaspatial.tech/mcp/health | jq
```

Do not use a plain `GET /mcp` as a health check. The route expects an MCP
streamable HTTP client and can return `406 Not Acceptable` without event-stream
headers.

## Current Hosted Facts

- CII snapshot: 30 masonry frames.
- Categories: 26 `P`, 0 `C`, 4 `NC`.
- Wrench time: 86.7%.
- Mean CII confidence from `/api/cii/frames`: 0.893.
- Raffle tickets: 11 above the 30% baseline.
- Spatial zones: three 10-frame zones, currently 90.0%, 100.0%, and 70.0%
  productive time.
- `/api/demo` exists but returns `video_unavailable` on production because the
  full source video is not bundled.
- `/api/eval` serves cached or live temporal JSON. `POST /api/temporal/run`
  persists live output that later `/api/eval` calls read.

## Repo Map

- `backend/api.py`: FastAPI routes and hosted evidence payloads.
- `backend/cii-results.json`: bundled CII fallback used in production.
- `frontend/app`: landing, dashboard, eval, and review pages.
- `packages/vima-agent`: thin CLI around the hosted API.
- `packages/vima-mcp`: hosted MCP wrapper around the same API.
- `infra`: Caddy, Docker Compose, Dockerfiles, deploy notes.
- `docs.json` and `docs/*.mdx`: Mintlify docs source synced to the docs repo.

## Agent CLI

The CLI is not published to PyPI yet. Run it from the repository subdirectory:

```bash
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima doctor
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima analyze --sample masonry-p --json
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima skill print --agent codex
```

## Agent MCP

Hosted MCP health:

```bash
curl -sf https://vimaspatial.tech/mcp/health | jq
```

MCP client URL:

```text
https://vimaspatial.tech/mcp
```

Tools:

- `vima_doctor`
- `vima_analyze_frame`
- `vima_compare_frame`
- `vima_cii_summary`
- `vima_cii_frames`
- `vima_spatial_zones`
- `vima_eval`

## Docs Drift Rules

When changing backend endpoints, CLI commands, MCP tools, production routing, or
deploy health checks, update the relevant docs in the same change. Run:

```bash
python3 scripts/check_docs_drift.py --base origin/main --head WORKTREE
```

For read-only audits, only use GET probes. Avoid `POST /api/temporal/run` unless
a human asks for a fresh live temporal run, because successful runs persist and
change later `/api/eval` output.

## Heavy Dependencies

The production services must stay small. Do not add Torch, Transformers, SAM,
Depth Anything, Open3D, or local COLMAP runtime dependencies to the frontend,
backend, CLI, or MCP production containers. Heavy perception and reconstruction
work belongs in offline/precompute workflows or static artifacts.
