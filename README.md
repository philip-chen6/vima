# VINNA — Ironsite Spatial Safety Intelligence

**HackTech 2025 @ Caltech** | Ironsite Prize ($17,500) + YC Track

## What

Construction site safety AI that turns Ironsite egocentric bodycam + LiDAR data into:
- **P/C/NC classification** (Productive / Contributory / Non-Contributory) per worker
- **OSHA CFR 29 1926 violation flags** with spatial evidence
- **Solana raffle payout** weighted by wrench-time productivity

## Team

- **Joshua** — CII classifier, backend, architecture
- **Philip** — Solana raffle payout contract
- **Lucas** — remote
- **Stephen** — remote

## Stack

| Layer | Tech |
|-------|------|
| Backend API | FastAPI + uvicorn (port 8765) |
| AI judge | Claude Sonnet via Anthropic SDK |
| Frame extraction | ffmpeg |
| Point cloud | .ply / .npy / .bin stubs (Ironsite format TBD) |
| Payout | Solana / Jupiter |

## Running

```bash
cd backend
uv run api.py
# → http://localhost:8765
```

## API

- `GET /health` — status check
- `POST /analyze/frame` — upload JPG, get OSHA JSON
- `POST /analyze/timestamp?timestamp=30.0` — analyze from video at timestamp
- `POST /analyze/batch` — batch events
- `GET /demo` — 5 events from masonry footage (demo mode)

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
