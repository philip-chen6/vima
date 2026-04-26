#!/usr/bin/env bash
set -euo pipefail

VIDEO_PATH="${1:?usage: scripts/run_full_video.sh VIDEO_PATH [PROJECT] [QUERY] [FPS] [LABEL_MODE]}"
PROJECT="${2:-vima-full}"
QUERY="${3:-Was there masonry work happening near the wall?}"
FPS="${4:-0.1}"
LABEL_MODE="${5:-gemini}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
YOLODEX_DIR="${ROOT}/tools/yolodex"
RUN_DIR="${YOLODEX_DIR}/runs/${PROJECT}"
SHARE_NAME="${PROJECT}_share"

if [[ "$VIDEO_PATH" != http://* && "$VIDEO_PATH" != https://* ]]; then
  VIDEO_PATH="$(cd "$ROOT" && python3 -c 'import pathlib, sys; print(pathlib.Path(sys.argv[1]).expanduser().resolve())' "$VIDEO_PATH")"
fi

cd "$ROOT"

python3 - <<PY
import json
from pathlib import Path

config_path = Path("tools/yolodex/config.json")
config = json.loads(config_path.read_text(encoding="utf-8"))
config["project"] = "${PROJECT}"
config["video_url"] = "${VIDEO_PATH}"
config["fps"] = float("${FPS}")
config["label_mode"] = "${LABEL_MODE}"
config_path.write_text(json.dumps(config, indent=2) + "\\n", encoding="utf-8")
print(f"[vima] configured {config_path} for project={config['project']} fps={config['fps']} label_mode={config['label_mode']}")
PY

cd "$YOLODEX_DIR"
uv sync
uv run .agents/skills/collect/scripts/run.py

case "$LABEL_MODE" in
  gemini)
    uv run .agents/skills/label/scripts/label_gemini.py
    ;;
  gpt)
    uv run .agents/skills/label/scripts/run.py
    ;;
  codex)
    bash .agents/skills/label/scripts/dispatch.sh "${NUM_AGENTS:-4}"
    ;;
  *)
    echo "unsupported LABEL_MODE=${LABEL_MODE}; use gemini, gpt, or codex" >&2
    exit 1
    ;;
esac

uv run .agents/skills/eval/scripts/preview_labels.py \
  "runs/${PROJECT}/frames" \
  --classes "runs/${PROJECT}/classes.txt" \
  --out-dir "runs/${PROJECT}/frames/preview" \
  --limit 0 \
  --video-out "runs/${PROJECT}/frames/preview/preview.mp4"

cd "$ROOT"
python3 backend/vima_cli.py run "$QUERY" \
  --run-dir "tools/yolodex/runs/${PROJECT}" \
  --fps "$FPS" \
  --depth-backend auto \
  --provider gemini

python3 backend/vima_cli.py export \
  --run-dir "tools/yolodex/runs/${PROJECT}" \
  --name "$SHARE_NAME" \
  --query "$QUERY" \
  --limit 12

echo
echo "[vima] done"
echo "[vima] run dir: ${RUN_DIR}"
echo "[vima] share bundle: ${ROOT}/artifacts/${SHARE_NAME}.zip"
