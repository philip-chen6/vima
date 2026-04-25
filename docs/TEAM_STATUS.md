# VINNA — Team Status
_Last updated: 2026-04-25 ~05:50 PDT | Deadline: 9am PDT Apr 26 (~27h)_

## Critical Path
- [x] Backend API (port 8765) — LIVE
- [x] CII classifier — Claude Sonnet 4.6, **86.7% wrench time**, 86.7% acc, mean P-conf 0.939
- [x] Research paper — R13 FINAL, `paper/spatial_main.pdf` (717KB, architecture fig included)
- [x] Frontend — SHIPPED (commit 209de28, React Bits Pro rebuild, 9 sections)
- [x] Solana raffle contract — env-gated, real SPL transfer when SOLANA_PAYER_KEYPAIR set
- [x] COLMAP spatial layer — zone attribution + /spatial/zones live
- [x] Demo artifacts — A/B eval + event memory + spatial failure analysis (31b3a75)
- [x] Devpost draft — DEVPOST_v2.md (spatial intelligence frame, +32.0% lead)
- [ ] **HUMAN BLOCKER: Demo video** — 60s screencast (Joshua records)
- [ ] **HUMAN BLOCKER: Philip SPL env vars** — SOLANA_PAYER_KEYPAIR + SOLANA_RECIPIENT_ADDRESS
- [ ] **HUMAN BLOCKER: DevPost submission** — upload + submit at devpost.com (Joshua)

## What's Working Right Now

### Backend API `:8765`
- GET `/health` — server + video status
- POST `/analyze/frame` — upload frame image → OSHA JSON
- POST `/analyze/timestamp` — timestamp → extract frame → OSHA JSON  
- POST `/analyze/batch` — multiple events
- GET `/demo` — 5-timestamp demo run

### CII Classification (latest run)
```
Model: gemini-2.5-flash-lite
Frames: 30 sampled from 21:16 masonry video
P (Productive): 26 frames = 86.7%   [benchmark: 30-40%]
C (Contributory): 0 frames = 0.0%
NC (Non-Contributory): 4 frames = 13.3%
Wrench Time: 86.7%
```
NOTE: 86.7% > benchmark because masonry video is dense active work (intentionally selected by Ironsite). Real-world sites typically show 30-40%.

### OSHA Violations Detected (from 5-event demo)
Real OSHA CFR 29 Part 1926 violations flagged at 0.73–0.82 confidence:
- 15s: missing guardrails (§1926.502b), no PFAS (§1926.502d), exposed rebar (§1926.701b)
- 45s: unguarded elevated edge, no PFAS — HIGH severity
- 90s: scaffold open edge, decking gaps (§1926.451)
- 180s: silica/cement inhalation, no respirator (§1926.1153) + fall hazard
- 300s: elevated scaffold, missing guardrails, cluttered platform

## Team Assignments

| Person | Piece | Status |
|--------|-------|--------|
| Joshua | Backend, CII pipeline, architecture | ✅ Done |
| Philip Chen | Solana raffle contract (wrench-time% → tickets → USDC) | 🔄 In progress |
| Lucas He | Remote | TBD |
| Stephen | Remote | TBD |
| Codex | React frontend (React Bits Pro) | 🔄 Building |

## API Contract (for frontend + Solana)

POST `/analyze/timestamp?timestamp=90.0&event_id=NC_015`
```json
{
  "event_id": "NC event candidate",
  "timestamp_s": 90.0,
  "pnc": "NC",
  "pnc_confidence": 0.74,
  "activity": "scaffold with open edge",
  "violation_flags": [
    {"code": "1926.451", "severity": "high", "description": "open scaffold edge"}
  ],
  "spatial_claims": [
    {"claim": "scaffold platform 3m height with missing guardrail left side"}
  ],
  "reasoning": "Scaffold edge exposed, no guardrail visible..."
}
```

## Solana Integration Spec (for Philip)

CII P% → wrench time → raffle tickets:
- Every 5% above 30% baseline → 1 raffle ticket
- Example: 86.7% wrench → (86.7-30)/5 = ~11 tickets
- Backend: GET `/cii/summary` → `{"wrench_time": 86.7, "tickets": 11}`
- Raffle: tickets → on-chain USDC payout via Solana program

## Key Files

```
backend/api.py          FastAPI server (:8765)
backend/judge.py        Claude Sonnet 4.6 OSHA judge
backend/pipeline.py     frame extraction → judge → JSON
backend/cloud_loader.py point cloud loader (stubs)
paper/main.pdf          compiled research paper
paper/main.tex          LaTeX source
paper/osha_rewards.json 30 OSHA rules as reward functions
docs/AGENT_CONTEXT.md   full agent findings dump
```

## Env Vars

```bash
ANTHROPIC_API_KEY=<key>
GEMINI_API_KEY=<key>
IRONSITE_VIDEO=~/Downloads/01_production_masonry.mp4
JUDGE_MODEL=claude-sonnet-4-6   # default
```

## Ironsite Drive (point cloud data)
https://drive.google.com/drive/folders/1aKV8Ovw1d3CiPMjv6YaJMyAO1g4x-UAO
- Contact: Daniele More (Ironsite CSO)
- Format: likely .ply/.npy/.bin (cloud_loader.py ready for these)
