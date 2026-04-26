# VIMA Architecture

## Data Flow

```
Ironsite LiDAR + Bodycam
        ↓
  event_id + timestamp
        ↓
  ffmpeg frame extract
        ↓
  cloud_loader (ply/npy/bin)
        ↓
  judge.py (Claude Sonnet)
        ↓
  ViolationReport JSON
        ↓
  FastAPI :8765
        ↓
  Frontend (React Bits Pro)     Solana Raffle (Philip)
```

## Key Insight

Ironsite already provides:
- 3D point clouds (color-coded by depth)
- Temporal event segmentation ("NC event candidate 015.0s")
- Egocentric source frames (fisheye bodycam)

We are NOT the sensing layer. We are the **interpretation layer**:
- Given: cloud crop + source frame
- Output: spatial claim + OSHA evidence + P/C/NC label

## CII Classification

Construction Industry Institute definition:
- **P (Productive)**: direct hands-on work visible
- **C (Contributory)**: support work (measuring, staging)
- **NC (Non-Contributory)**: idle, waiting, no work visible

Wrench-time % = 100 × P_frames / total_frames

## Reward System

Worker wrench-time % → raffle tickets → Solana USDC payout

Philip's Solana contract handles the on-chain draw.
Backend API provides the productivity data.

## Models Used

- Judge: Claude Sonnet 4.6 (via Anthropic SDK, ANTHROPIC_API_KEY)
- CII classification: gemini-2.5-flash (via GEMINI_API_KEY)

## Env Vars

```
ANTHROPIC_API_KEY  — for the judge layer
GEMINI_API_KEY     — for CII classification
IRONSITE_VIDEO     — path to demo video (default: ~/Downloads/01_production_masonry.mp4)
JUDGE_MODEL        — model name (default: claude-sonnet-4-6)
```
