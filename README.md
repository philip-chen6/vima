# VINNA — Ironsite Spatial Safety Intelligence

**HackTech 2026 @ Caltech** | Ironsite Prize ($17,500) + Workshop Paper Track

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
