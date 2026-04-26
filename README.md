# VIMA

VIMA is a spatial-intelligence prototype for egocentric construction video.

The current local demo path is a spatial-memory pipeline: raw hardhat footage is
too ambiguous for a vision-language model to answer reliably on its own, so VIMA
first turns frames into auditable memory:

```text
Yolodex/Codex labels
  -> optional Gemini Robotics-ER semantic boxes
  -> merge boxes by class + IoU
  -> SAM-style box-prompt masks
  -> Depth Anything or proxy depth
  -> object-event episodic memory
  -> cited Gemini answer from retrieved evidence
```

The demo question this repo is built around is:

```text
Was there masonry work happening near the wall?
```

## Team

Commit history shows four active project contributors:

| Person | Main lanes in this repo |
| --- | --- |
| Lucas He | Docs, agent context, paper assets, PR/release coordination |
| Stephen Hung | Product flow, frontend polish, proof/eval/demo fixes |
| Philip Chen | Spatial-memory backend, Robotics fusion, dashboard, paper/artifact packaging |
| Joshua Lin | Mobile app, swipe deck, screenshots, brand and app polish |

## For Judges

Live verification:

- Dashboard: https://vimaspatial.tech/demo
- Temporal eval: https://vimaspatial.tech/eval

Check deployed API numbers directly:

```bash
curl -s https://vimaspatial.tech/api/cii/summary | jq
curl -s https://vimaspatial.tech/api/cii/frames | jq 'length'
curl -s https://vimaspatial.tech/api/spatial/zones | jq
```

Expected hosted-demo values: 30 frames, 86.7% wrench time, 0.893 mean
confidence, and 118 temporal episodes in the eval workspace.

## Quickstart

From the repo root, print the complete wrapped spatial-memory pipeline without
writing files:

```bash
python3 backend/vima_cli.py run \
  "Was there masonry work happening near the wall?" \
  --use-robotics \
  --merge-dry-run \
  --dry-run
```

Answer from the bundled episodic-memory artifact:

```bash
python3 backend/vima_cli.py ask \
  "Was there masonry work happening near the wall?"
```

`ask` uses Gemini by default and falls back to the local heuristic answer if a
Gemini key is not available. For live Gemini calls, copy `.env.example` to
`.env` and set either `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

## Hosted API

Run the FastAPI backend locally:

```bash
cd backend
uv run api.py
# -> http://localhost:8765
```

Important deployed endpoints:

- `GET /health` - status check
- `POST /analyze/frame` - upload JPG, get CII classification and spatial JSON
- `POST /analyze/timestamp?timestamp=30.0` - analyze from video at timestamp
- `POST /analyze/batch` - batch events
- `GET /demo` - masonry-footage events when the source video is present
- `GET /cii/summary` - wrench-time summary
- `GET /cii/frames` - per-frame classifications
- `GET /spatial/zones` - zone attribution with spatial narrative
- `GET /eval` - cached or live temporal evidence with proof-frame citations
- `POST /temporal/run?n=8` - live temporal reasoning, cooldown protected
- `GET /temporal/frame/{frame_index}` - frame files referenced by `/eval`

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
HTTP client around the deployed API, not a wrapper around the local SAM/depth
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

- `docs/devpost-submission.mdx`
- `docs/quickstart.mdx`
- `docs/onboarding.mdx`
- `docs/mcp.mdx`
- `docs/cicd.mdx`

CI runs a docs-drift check whenever the public API, CLI, MCP server, or routing
changes. The report-only agent prompt for docs updates lives at
`docs/AGENT_DOCS_AUDIT.md`.

## Important Paths

Most code that matters for the spatial-memory pipeline lives in `backend/`.
Important demo artifacts still live in `demo/`:

- `demo/gemini_robotics_boxes.json`
- `demo/mask_track_memory.json`
- `demo/depth_track_memory.json`
- `demo/episodic_memory.json`
- `demo/memory_answer_gemini.json`

The default hardhat run directory is:

```text
tools/yolodex/runs/vima-hardhat
```

Some checkouts only include derived `demo/` artifacts and dashboard sample
assets, not the full Yolodex run directory. Commands that rebuild masks, depth,
or exports need that run directory to exist.

## Core Commands

Run only Gemini Robotics-ER boxes for one frame:

```bash
python3 backend/vima_cli.py robotics-boxes \
  --image tools/yolodex/runs/vima-hardhat/frames/frame_000001.jpg
```

Dry-run a Robotics-ER merge into YOLO labels:

```bash
python3 backend/vima_cli.py merge-boxes --merge-dry-run
```

Build mask tracks, depth memory, and episodic memory from an existing labeled
Yolodex run:

```bash
python3 backend/vima_cli.py memory \
  --run-dir tools/yolodex/runs/vima-hardhat \
  --depth-backend auto \
  --query "worker laying blocks near wall"
```

Use the deterministic proxy-depth backend when model weights are unavailable:

```bash
python3 backend/vima_cli.py memory \
  --run-dir tools/yolodex/runs/vima-hardhat \
  --depth-backend proxy
```

Package a shareable artifact bundle:

```bash
python3 backend/vima_cli.py export --name vima_share --limit 12
```

Run a full video through Yolodex collection, labeling, memory, answer, and
export:

```bash
scripts/run_full_video.sh data/video01.mp4 vima-full \
  "Was there masonry work happening near the wall?" \
  0.1 gemini
```

## Dashboard

The standalone dashboard is the quickest way to inspect the current sample run:

```bash
python3 -m http.server 8787 --directory dashboard
```

Open `http://localhost:8787`. It shows the sample frame, mask/depth previews,
retrieved episodes, and answer artifact without touching the Next.js frontend.

## Evaluation

The tiny eval compares raw Gemini frame answers against memory-augmented answers
for the questions in `configs/eval_questions.json`:

```bash
python3 backend/eval_memory.py --limit 5
```

Outputs:

- `demo/eval_results.json`
- `docs/eval_results.md`

This is a lightweight sanity check for demo and paper examples, not a benchmark.

## Repo Map

| Path | Purpose |
| --- | --- |
| `backend/vima_cli.py` | Main wrapper for the VIMA memory pipeline |
| `backend/gemini_robotics_boxes.py` | Gemini Robotics-ER semantic boxes |
| `backend/merge_robotics_boxes.py` | Class + IoU merge into YOLO labels |
| `backend/mask_track_memory.py` | Box-prompt masks and persistent tracks |
| `backend/depth_memory.py` | Depth Anything or proxy depth over tracks |
| `backend/episodic_memory.py` | Object-event episodes for retrieval |
| `backend/answer_from_memory.py` | Cited answer from retrieved episodes |
| `backend/eval_memory.py` | Tiny raw-frame vs memory eval |
| `dashboard/` | Static sample dashboard |
| `frontend/` | Next.js product/marketing frontend |
| `packages/vima-agent/` | Hosted API CLI package |
| `packages/vima-mcp/` | Hosted API MCP server |
| `paper/` | Mini-paper source and figures |
| `tools/yolodex/` | Vendored frame collection and labeling tools |

## Python Setup

The scripts are plain Python entry points. A fresh machine should have Python
3.11+ and the lightweight image/data dependencies available:

```bash
python3 -m pip install pillow numpy
```

Optional model-backed stages need additional packages and downloaded weights:

- SAM mask backend: `torch`, `transformers`, `facebook/sam-vit-base`
- Depth Anything backend: `torch`, `transformers`,
  `depth-anything/Depth-Anything-V2-Small-hf`
- Gemini legacy SDK path: `google-generativeai`

The REST Gemini path only needs an API key.

## Current Caveats

- The local Qwen-VL harness is in `backend/qwen_frame_qa.py`, but model
  downloads stalled on this machine. Do not depend on Qwen for demo-critical
  flow.
- Generated JSON artifacts may reference historical timestamps and sample
  labels. Treat them as demo artifacts, not final benchmark results.
- Older FastAPI, CII, raffle, and Solana files still exist in the repo from a
  previous product direction. The active local demo path is the spatial-memory
  pipeline above.
- The project name is VIMA. Do not add new VINNA references.

## Credits

VIMA is a Hacktech 2026 Spatial Intelligence Track submission by Lucas He,
Stephen Hung, Philip Chen, and Joshua Lin.
