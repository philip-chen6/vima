# VIMA Agent Context

## Project

VIMA is a HackTech / Ironsite spatial-intelligence prototype for egocentric
construction video.

The current thesis:

```text
Raw hardhat footage is too ambiguous for a VLM alone.
VIMA turns frames into auditable spatial memory first:
boxes -> masks -> depth -> episodes -> cited VLM answer.
```

Do not rebuild from scratch. Extend the current pipeline.

## Current Pipeline

```text
Yolodex/Codex labels
  -> optional Gemini Robotics-ER semantic boxes
  -> merge boxes by class + IoU
  -> SAM box-prompt masks
  -> Depth Anything / proxy depth
  -> object-event episodic memory
  -> Gemini answer from retrieved evidence
```

Important code lives in `backend/`, not `demo/`.

Important outputs still live in `demo/`:

- `demo/gemini_robotics_boxes.json`
- `demo/mask_track_memory.json`
- `demo/depth_track_memory.json`
- `demo/episodic_memory.json`
- `demo/memory_answer_gemini.json`

The active hardhat run directory is:

```text
tools/yolodex/runs/vima-hardhat
```

## Main Commands

Dry-run the whole wrapped flow:

```bash
python3 backend/vima_cli.py run \
  "Was there masonry work happening near the wall?" \
  --use-robotics \
  --merge-dry-run \
  --dry-run
```

Run only Gemini Robotics-ER boxes:

```bash
python3 backend/vima_cli.py robotics-boxes \
  --image tools/yolodex/runs/vima-hardhat/frames/frame_000001.jpg
```

Dry-run merge of Robotics-ER boxes into YOLO labels:

```bash
python3 backend/vima_cli.py merge-boxes --merge-dry-run
```

Answer from existing episodic memory:

```bash
python3 backend/vima_cli.py ask \
  "Was there masonry work happening near the wall?"
```

## What Works

- Gemini REST answer path works with `.env` API key.
- Robotics-ER returns useful semantic boxes on the sample hardhat frame.
- SAM/depth/episodic-memory scripts compile and have existing artifacts.
- The CLI wrapper prints a clean end-to-end command sequence.

## Known Issues

- Local Qwen-VL is installed but not practically verified. Hugging Face model
  downloads hung / stalled on this machine. The harness is
  `backend/qwen_frame_qa.py`, but do not depend on it for demo-critical flow.
- Generated JSON artifacts still reference historical timestamps and sample
  labels. Treat them as demo artifacts, not final benchmark results.
- If code moves, update docs and CLI paths together.

## Good Parallel Agent Lanes

1. **CLI / packaging agent**
   - Make `backend/vima_cli.py` feel polished.
   - Add better errors when inputs are missing.
   - Add one `README` command block that judges can run.

2. **Evaluation agent**
   - Build 5-10 question eval from `demo/episodic_memory.json`.
   - Compare raw Gemini frame answer vs memory-augmented answer.
   - Output a tiny table for the mini paper.

3. **Robotics fusion agent**
   - Extend `backend/gemini_robotics_boxes.py` to loop over selected frames.
   - Produce a YOLO-only vs YOLO+Robotics-ER comparison JSON.
   - Do not overwrite label files unless explicitly requested.

4. **Dashboard agent**
   - Show frame, boxes, masks/depth preview, retrieved episodes, final answer.
   - Include a chat-style question panel backed by `backend/answer_from_memory.py`
     or the same `answer_query` function. The user should be able to ask
     multiple questions after one completed VIMA run without rerunning masks/depth.
   - Keep it simple. Do not redesign the whole frontend unless asked.

5. **Paper / pitch agent**
   - Frame the contribution as specialist perception plus episodic memory,
     not a generic VLM wrapper.
   - Emphasize auditable evidence and spatial grounding.

## Naming

The project is now **VIMA**, not VINNA. Do not introduce new VINNA references.

## Commit Style

Commit frequently with short lowercase imperative messages, for example:

```text
add vima cli
fix robotics merge
document eval flow
```

## Team

VIMA is built by Philip Chen, Joshua Lin, Stephen Hung, and Lucas He for the
Hacktech 2026 Spatial Intelligence Track.
