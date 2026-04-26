# VIMA Agent Context

## Project

VIMA is a HackTech / Ironsite spatial-intelligence prototype for egocentric
construction video.

Current thesis:

```text
Raw hardhat footage is too ambiguous for a VLM alone.
VIMA turns frames into auditable spatial memory first:
boxes -> masks -> depth -> episodes -> cited VLM answer.
```

Do not rebuild the project from scratch. Extend the current pipeline and keep
docs, CLI defaults, and artifact paths aligned.

## Active Pipeline

```text
Yolodex/Codex labels
  -> optional Gemini Robotics-ER semantic boxes
  -> merge boxes by class + IoU
  -> SAM-style box-prompt masks
  -> Depth Anything or proxy depth
  -> object-event episodic memory
  -> Gemini answer from retrieved evidence
```

Important code lives in `backend/`, not `demo/`.

Important demo outputs still live in `demo/`:

- `demo/gemini_robotics_boxes.json`
- `demo/mask_track_memory.json`
- `demo/depth_track_memory.json`
- `demo/episodic_memory.json`
- `demo/memory_answer_gemini.json`

The CLI default hardhat run directory is:

```text
tools/yolodex/runs/vima-hardhat
```

Some clones only include derived `demo/` artifacts and dashboard sample assets.
If that run directory is missing, `ask` can still use existing memory, but
`memory`, `merge-boxes`, `robotics-boxes`, and `export` need a restored or newly
generated Yolodex run.

## Main Commands

Dry-run the whole wrapped flow:

```bash
python3 backend/vima_cli.py run \
  "Was there masonry work happening near the wall?" \
  --use-robotics \
  --merge-dry-run \
  --dry-run
```

Answer from existing episodic memory:

```bash
python3 backend/vima_cli.py ask \
  "Was there masonry work happening near the wall?"
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

Build memory from an existing labeled run:

```bash
python3 backend/vima_cli.py memory \
  --run-dir tools/yolodex/runs/vima-hardhat \
  --depth-backend auto
```

Run the tiny eval:

```bash
python3 backend/eval_memory.py --limit 5
```

Serve the static dashboard:

```bash
python3 -m http.server 8787 --directory dashboard
```

## What Works

- Gemini REST answer path works when `.env` has `GEMINI_API_KEY` or
  `GOOGLE_API_KEY`.
- `answer_from_memory.py` can fall back to a heuristic answer if Gemini is not
  configured.
- Robotics-ER has returned useful semantic boxes on the sample hardhat frame.
- SAM/depth/episodic-memory scripts compile and have existing artifacts.
- `backend/vima_cli.py` prints a clean end-to-end command sequence.
- The static dashboard can review the bundled sample artifacts without rerunning
  masks or depth.

## Known Issues

- The full `tools/yolodex/runs/vima-hardhat` run directory may be absent in a
  fresh checkout.
- Local Qwen-VL is installed but not practically verified. Hugging Face model
  downloads hung or stalled on this machine. The harness is
  `backend/qwen_frame_qa.py`, but do not depend on it for demo-critical flow.
- Generated JSON artifacts may reference historical timestamps and sample
  labels. Treat them as demo artifacts, not final benchmark results.
- Older FastAPI, CII, raffle, and Solana code remains from a previous direction.
  Do not make it the center of the VIMA demo unless explicitly asked.
- If code moves, update `README.md`, this file, and CLI defaults together.

## Good Agent Lanes

### CLI / Packaging

- Make `backend/vima_cli.py` feel polished.
- Add clear errors when inputs or run directories are missing.
- Keep one README command block that judges can run.
- Do not overwrite label files unless the user explicitly asks.

### Evaluation

- Maintain 5-10 questions in `configs/eval_questions.json`.
- Compare raw Gemini frame answer vs memory-augmented answer.
- Output a tiny table for the mini paper.
- Treat scores as sanity checks, not final benchmark claims.

### Robotics Fusion

- Extend `backend/gemini_robotics_boxes.py` to loop over selected frames.
- Produce a YOLO-only vs YOLO+Robotics-ER comparison JSON.
- Keep merge behavior dry-run by default for demos.
- Do not modify YOLO labels unless explicitly requested.

### Dashboard

- Show frame, boxes, masks/depth preview, retrieved episodes, and final answer.
- Include a chat-style question panel backed by `backend/answer_from_memory.py`
  or the same `answer_query` function.
- Let users ask multiple questions after one completed VIMA run without
  rerunning masks/depth.
- Keep it simple. Do not redesign the whole frontend unless asked.

### Paper / Pitch

- Frame the contribution as specialist perception plus episodic memory, not a
  generic VLM wrapper.
- Emphasize auditable evidence, spatial grounding, and cited answers.
- Be careful with benchmark language; current artifacts are demo evidence.

## Naming

The project is **VIMA**, not VINNA. Do not introduce new VINNA references.

Use lowercase `vima` only when matching visual/brand copy in the frontend.

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
