# VIMA — Ironsite Spatial Safety Intelligence

**HackTech 2026 @ Caltech** | Ironsite Prize ($17,500)

## What

Spatially-anchored worker intelligence and incentive system for egocentric construction video:
- **P/C/NC classification** (Productive / Contributory / Non-Contributory) per worker via CII standard
- **COLMAP camera pose clustering** — zone attribution (Near Equipment / Scaffold / Material Staging)
- **Solana devnet raffle payout** weighted by wrench-time productivity (real SPL transfer, env-gated)

Results on 30 frames of real Ironsite masonry footage: **86.7% productive**, mean confidence 0.939.

## Team

- **Joshua** — CII classifier, backend, COLMAP spatial layer
- **Philip** — Solana raffle, frontend

## Stack

| Layer | Tech |
|-------|------|
| Backend API | FastAPI + uvicorn (port 8765) |
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
uvx vima-agent@latest doctor
uvx vima-agent@latest analyze --sample masonry-p --json
uvx vima-agent@latest skill install --agent auto
```

For local backend development:

```bash
VIMA_API_URL=http://localhost:8765 uvx vima-agent@latest doctor
```

The package source lives in `packages/vima-agent/`. It is intentionally a thin
HTTP client around the deployed API, not a wrapper around the local SAM/depth/
memory pipeline.

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
- `GET /demo` — 5 events from masonry footage (demo mode)
- `GET /cii/summary` — wrench-time summary (P/C/NC counts + raffle tickets)
- `GET /cii/frames` — full per-frame classifications
- `GET /spatial/zones` — zone attribution with spatial narrative

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
