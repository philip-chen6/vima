# VIMA Architecture

VIMA is a small hosted spatial-evidence stack for the HackTech Ironsite demo.
The production path favors cached and precomputed evidence over live heavy
perception so it can run on a 1 vCPU / 2 GB VPS.

## Production Services

| Service | Internal Port | Role |
| --- | --- | --- |
| Caddy | `80`, `443` | TLS and reverse proxy |
| Frontend | `3000` | landing, dashboard, review, and eval pages |
| Backend | `8765` | FastAPI evidence API |
| MCP | `8766` | hosted agent tool endpoint |

Routing:

```text
https://vimaspatial.tech/       -> frontend:3000
https://vimaspatial.tech/api/*  -> backend:8765
https://vimaspatial.tech/mcp*   -> mcp:8766
```

## Hosted Evidence Flow

```text
sampled masonry frames
  -> cached CII classifications
  -> spatial zone rollups
  -> temporal eval JSON
  -> dashboard / API / CLI / MCP responses
```

The hosted backend serves the bundled `backend/cii-results.json` snapshot when
the developer-local CII path is absent. Production currently reports 30 frames,
26 productive rows, 0 contributory rows, 4 non-contributory rows, and 86.7%
wrench time.

## Live Reasoning

`POST /analyze/frame` can run a live Anthropic-powered frame analysis when an
API key is configured. `POST /temporal/run?n=8` can run live temporal reasoning
and persists `temporal-results.json`, which later `GET /eval` calls read.

Video-backed timestamp endpoints still exist for local development, but the
production VPS does not bundle the full source video. Use cached `/cii/*`,
`/spatial/zones`, and `/eval` endpoints for hosted verification.

## Agent Surfaces

- CLI source: `packages/vima-agent`
- MCP source: `packages/vima-mcp`
- MCP health: `https://vimaspatial.tech/mcp/health`
- Streamable HTTP MCP endpoint: `https://vimaspatial.tech/mcp`

The CLI and MCP server are thin clients around the hosted API. They should not
import or run SAM, Depth Anything, local COLMAP, Torch, Transformers, or other
heavy perception dependencies.

## CII Categories

Construction Industry Institute categories:

- **P (Productive)**: direct hands-on work visible
- **C (Contributory)**: support work such as measuring or staging
- **NC (Non-Contributory)**: idle, waiting, no work visible, or failed inference

The hosted summary uses `productive / total_frames * 100` for wrench time.

## Env Vars

```text
ANTHROPIC_API_KEY  # live frame and temporal reasoning
IRONSITE_VIDEO     # local source video path, default ~/Downloads/01_production_masonry.mp4
VIMA_API_URL       # CLI/MCP API override
VIMA_MCP_HOST      # MCP bind host, default 0.0.0.0 in compose
VIMA_MCP_PORT      # MCP bind port, default 8766
```
