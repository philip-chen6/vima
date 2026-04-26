# VIMA — Ironsite Spatial Safety Intelligence

**HackTech 2026 @ Caltech** | Ironsite Prize ($17,500)

## What

Spatially-anchored worker intelligence and incentive system for egocentric construction video:
- **P/C/NC classification** (Productive / Contributory / Non-Contributory) per worker via CII standard
- **COLMAP camera pose clustering** — zone attribution (Near Equipment / Scaffold / Material Staging)
- **Solana devnet raffle payout** weighted by wrench-time productivity (real SPL transfer, env-gated)

Results on 30 frames of real Ironsite masonry footage: **86.7% productive**, mean confidence 0.893.

## For Judges

Live verification:

- Dashboard: https://vimaspatial.tech/demo
- Temporal eval: https://vimaspatial.tech/eval

Check the numbers directly from the deployed API:

```bash
curl -s https://vimaspatial.tech/api/cii/summary | jq
curl -s https://vimaspatial.tech/api/cii/frames | jq 'length'
curl -s https://vimaspatial.tech/api/spatial/zones | jq
```

Expected headline values: 30 frames, 86.7% wrench time, 0.893 mean confidence,
and 118 temporal episodes in the eval workspace.

## Team

- **Joshua** — CII classifier, backend, COLMAP spatial layer
- **Philip** — Solana raffle, frontend

## Stack

| Layer | Tech |
|-------|------|
| Backend API | FastAPI + uvicorn (port 8765) |
| Agent MCP | FastMCP streamable HTTP (port 8766) |
| AI judge | Claude Sonnet 4.6 (Anthropic SDK) |
| Frame extraction | ffmpeg |
| Spatial reconstruction | COLMAP (K=3 zone simulation; production: registered camera poses) |
| Payout | Solana devnet SPL (real transfer with SOLANA_PAYER_KEYPAIR set) |

## Running

```bash
cd backend
uv run api.py
# → http://localhost:8765
```

## Agent CLI

Use the hosted VIMA API from any agent shell without cloning the full backend:

```bash
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima doctor
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima analyze --sample masonry-p --json
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima skill install --agent auto
```

For local backend development:

```bash
VIMA_API_URL=http://localhost:8765 uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima doctor
```

The package source lives in `packages/vima-agent/`. It is intentionally a thin
HTTP client around the deployed API, not a wrapper around the local SAM/depth/
memory pipeline.

## Agent MCP

Remote agents can connect directly to the hosted MCP endpoint:

```text
https://vimaspatial.tech/mcp
```

It exposes the same thin API surface as the CLI: doctor, frame analysis,
baseline comparison, CII summary/frames, spatial zones, and temporal eval.
The source lives in `packages/vima-mcp/`; production runs it as a small compose
service next to the frontend and backend.

## Docs

Mintlify docs live in `docs.json` and `docs/*.mdx`. Start with:

- `docs/quickstart.mdx`
- `docs/onboarding.mdx`
- `docs/mcp.mdx`
- `docs/cicd.mdx`

CI runs a docs-drift check whenever the public api, cli, mcp server, or routing
changes. The report-only agent prompt for docs updates lives at
`docs/AGENT_DOCS_AUDIT.md`.

## Object Memory Stage

The repo vendors Yolodex collect/label/preview scripts under `tools/yolodex/`
for the detector stage only. No YOLO training is required.

See `docs/YOLODEX_MEMORY.md` for:

```text
hardhat video -> sampled frames -> bounding boxes -> object-event memory
```

The next perception layer turns those boxes into mask tracks:

```bash
python3 backend/mask_track_memory.py \
  --run-dir tools/yolodex/runs/vima-hardhat \
  --out demo/mask_track_memory.json \
  --fps 0.1
```

This writes persistent track IDs, prompt masks, relation events, and a local
mask-track preview under `tools/yolodex/runs/vima-hardhat/`.

Compile the final object-event episodic memory:

```bash
python3 backend/episodic_memory.py \
  --input demo/depth_track_memory.json \
  --out demo/episodic_memory.json \
  --query "worker laying blocks near wall"
```

This emits compact episodes with time ranges, evidence frames, object tracks,
depth facts, and retrieval text for downstream VLM synthesis.

Answer a natural-language question from the retrieved memory:

```bash
python3 backend/answer_from_memory.py \
  --query "Was there masonry work happening near the wall?" \
  --provider gemini \
  --timeout-s 12 \
  --out demo/memory_answer_gemini.json
```

The answer layer retrieves compact episodes first, then asks the VLM to synthesize
from cited evidence. Gemini uses direct REST by default so demos do not hang on
the legacy SDK transport. For an open-model comparison, use the optional Qwen-VL
probe in `backend/qwen_frame_qa.py` after installing the Qwen dependencies.

Package a teammate/judge share bundle:

```bash
python3 backend/vima_cli.py export --name vima_share --limit 12
```

This writes `artifacts/vima_share.zip` with a subset of frames, YOLO labels,
SAM masks, depth maps, preview videos, memory JSON, final answer JSON, and a
manifest. Keep big artifacts out of git; upload the zip to Drive, Slack, or a
GitHub Release.

Run a full video from extraction through share bundle:

```bash
scripts/run_full_video.sh data/video01.mp4 vima-full \
  "Was there masonry work happening near the wall?" \
  0.1 gemini
```

## API

- `GET /health` — status check
- `POST /analyze/frame` — upload JPG, get CII classification + spatial JSON
- `POST /analyze/timestamp?timestamp=30.0` — analyze from video at timestamp
- `POST /analyze/batch` — batch events
- `GET /demo` — 5 events from masonry footage when the source video is present
- `GET /cii/summary` — wrench-time summary (P/C/NC counts + raffle tickets)
- `GET /cii/frames` — full per-frame classifications
- `GET /spatial/zones` — zone attribution with spatial narrative
- `GET /eval` — cached or live temporal evidence with proof-frame citations
- `POST /temporal/run?n=8` — live temporal reasoning, cooldown protected
- `GET /temporal/frame/{frame_index}` — frame files referenced by `/eval`

## Demo Output Shape

```json
{
  "pnc": "NC",
  "activity": "Masonry work at elevation",
  "spatial_claims": [{"object": "worker", "location": "...", "distance_m": 1.8}],
  "violation_flags": [{"rule": "OSHA 1926.502(b)", "severity": "high", "evidence": "..."}],
  "confidence": 0.82,
  "reasoning": "...",
  "event_id": "NC event candidate 15.0s",
  "timestamp_s": 15.0
}
```
