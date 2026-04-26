"""
Precompute depth heatmaps + SAM masks for every masonry frame, save as PNGs.

Why offline: we don't have a GPU on the prod VPS (1 vCPU/2GB RAM) and Vultr's
cloud GPU plans are gated behind a manual support request that won't clear in
time. So we run depth-anything-v2-small + sam-vit-base on this laptop (M-series
MPS) once, ship the results as static assets, and the frontend toggles between
RGB / depth / mask overlays per frame.

Outputs:
    frontend/public/inference/{frame_id}/depth.png    # turbo-colormap heatmap
    frontend/public/inference/{frame_id}/mask.png     # SAM auto-mask overlay
    frontend/public/inference/manifest.json           # {frame_id: {...}}

Run:
    source .venv-inference/bin/activate
    python backend/scripts/precompute_inference.py
"""
import json
import pathlib
import sys
import time
from typing import Any

import numpy as np
import torch
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
FRAMES_DIR = ROOT / "frontend" / "public" / "masonry-frames-raw"
OUT_DIR = ROOT / "frontend" / "public" / "inference"
MANIFEST_IN = FRAMES_DIR / "manifest.json"
MANIFEST_OUT = OUT_DIR / "manifest.json"

# Pick best available device. MPS for Apple Silicon, CUDA if somehow available,
# else CPU (will be slow but works).
if torch.backends.mps.is_available():
    DEVICE = "mps"
elif torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"

print(f"[init] device={DEVICE}")


# ─── Depth-Anything-V2-Small ──────────────────────────────────────────────
# 99M params, ~400MB fp32. The HF pipeline handles preprocessing.
def load_depth_pipe():
    from transformers import pipeline
    print("[depth] loading depth-anything/Depth-Anything-V2-Small-hf")
    t0 = time.time()
    pipe = pipeline(
        task="depth-estimation",
        model="depth-anything/Depth-Anything-V2-Small-hf",
        device=DEVICE,
    )
    print(f"[depth] loaded in {time.time()-t0:.1f}s")
    return pipe


def depth_to_heatmap(depth: np.ndarray) -> Image.Image:
    """Normalize depth map to 0-255 and apply turbo colormap (no matplotlib dep)."""
    d = depth.astype(np.float32)
    d_min, d_max = d.min(), d.max()
    if d_max - d_min < 1e-6:
        d_norm = np.zeros_like(d, dtype=np.uint8)
    else:
        d_norm = ((d - d_min) / (d_max - d_min) * 255).astype(np.uint8)

    # Inline turbo colormap LUT (Google's, 256 entries, public domain).
    # Closer = warmer (red/yellow), farther = cooler (blue/purple).
    turbo = _turbo_lut()
    rgb = turbo[d_norm]  # H,W,3 uint8
    return Image.fromarray(rgb)


def _turbo_lut() -> np.ndarray:
    """256-entry turbo colormap from Google's polynomial approximation."""
    x = np.linspace(0, 1, 256)
    r = np.clip(34.61 + x * (1172.33 - x * (10793.56 - x * (33300.12 - x * (38394.49 - x * 14825.05)))), 0, 255)
    g = np.clip(23.31 + x * (557.33 + x * (1225.33 - x * (3574.96 - x * (1073.77 + x * 707.56)))), 0, 255)
    b = np.clip(27.2 + x * (3211.1 - x * (15327.97 - x * (27814 - x * (22569.18 - x * 6838.66)))), 0, 255)
    lut = np.stack([r, g, b], axis=1).astype(np.uint8)
    return lut


def run_depth(pipe: Any, img_path: pathlib.Path, out_path: pathlib.Path) -> tuple[dict, np.ndarray]:
    img = Image.open(img_path).convert("RGB")
    result = pipe(img)
    # `predicted_depth` is a torch tensor in arbitrary relative units (depth-anything-v2
    # outputs inverse depth → larger = closer). `depth` (PIL) is the normalized 8-bit
    # visualization. We want both: PNG for the UI, raw scalar stats for the judge.
    raw = result.get("predicted_depth")
    if raw is not None:
        # Tensor → numpy float32 in original relative units.
        raw_np = raw.squeeze().cpu().numpy().astype(np.float32)
    else:
        raw_np = np.array(result["depth"], dtype=np.float32)

    depth_vis = np.array(result["depth"])  # 0-255 uint8 for the heatmap
    heatmap = depth_to_heatmap(depth_vis)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    heatmap.save(out_path, optimize=True)

    # Raw depth percentiles + region stats — what the spatial judge actually
    # needs to reason about distances. Quadrant means surface "things are
    # closer in the bottom-right" type spatial structure for prompts.
    h, w = raw_np.shape
    qh, qw = h // 2, w // 2
    quadrants = {
        "tl": float(raw_np[:qh, :qw].mean()),
        "tr": float(raw_np[:qh, qw:].mean()),
        "bl": float(raw_np[qh:, :qw].mean()),
        "br": float(raw_np[qh:, qw:].mean()),
    }
    stats = {
        "depth_min_raw": float(raw_np.min()),
        "depth_max_raw": float(raw_np.max()),
        "depth_mean_raw": float(raw_np.mean()),
        "depth_p10": float(np.percentile(raw_np, 10)),
        "depth_p50": float(np.percentile(raw_np, 50)),
        "depth_p90": float(np.percentile(raw_np, 90)),
        "depth_quadrants": quadrants,
        "shape": list(raw_np.shape),
        # Vis-only legacy fields kept for the old manifest consumers.
        "depth_min": float(depth_vis.min()),
        "depth_max": float(depth_vis.max()),
        "depth_mean": float(depth_vis.mean()),
    }
    return stats, raw_np


# ─── SAM (Segment Anything) ───────────────────────────────────────────────
# We use SAM via auto-mask generation — produces N segments per image, no
# prompts. That's what we want for "show all the things in this frame".
def load_sam():
    from transformers import SamModel, SamProcessor
    print("[sam] loading facebook/sam-vit-base")
    t0 = time.time()
    model = SamModel.from_pretrained("facebook/sam-vit-base").to(DEVICE)
    model.eval()
    processor = SamProcessor.from_pretrained("facebook/sam-vit-base")
    print(f"[sam] loaded in {time.time()-t0:.1f}s")
    return model, processor


def run_sam_grid(
    model: Any,
    processor: Any,
    img_path: pathlib.Path,
    out_path: pathlib.Path,
    grid: int = 8,
    depth_raw: np.ndarray | None = None,
) -> dict:
    """Run SAM on a grid of point prompts, merge masks, save overlay PNG.

    HuggingFace's SAM doesn't ship the auto-mask-generator from the original
    repo, so we approximate: drop a grid of points across the image, run SAM
    once with all points as prompts, take the highest-scoring mask per point,
    union them with random colors.
    """
    img = Image.open(img_path).convert("RGB")
    W, H = img.size

    # Build grid of input points: shape [1, num_points, 1, 2]  (batch, points, prompts_per_point, xy)
    xs = np.linspace(W * 0.1, W * 0.9, grid)
    ys = np.linspace(H * 0.1, H * 0.9, grid)
    points = []
    for y in ys:
        for x in xs:
            points.append([[float(x), float(y)]])
    input_points = [points]  # [batch=1, num_points, 1, 2]

    # Keep size tensors on CPU — MPS doesn't support float64 and post-processing
    # needs the original int64 sizes for upsampling. Move only the float inputs
    # to the device.
    raw = processor(img, input_points=input_points, return_tensors="pt")
    original_sizes = raw["original_sizes"]  # stays cpu
    reshaped_input_sizes = raw["reshaped_input_sizes"]  # stays cpu
    model_inputs = {
        k: v.to(DEVICE) if torch.is_tensor(v) and v.dtype in (torch.float32, torch.float16) else v
        for k, v in raw.items()
    }
    # input_points/labels are float; pixel_values is float; rest are int sizes.
    if "pixel_values" in raw:
        model_inputs["pixel_values"] = raw["pixel_values"].to(DEVICE, dtype=torch.float32)
    if "input_points" in raw:
        model_inputs["input_points"] = raw["input_points"].to(DEVICE, dtype=torch.float32)

    with torch.no_grad():
        outputs = model(**model_inputs, multimask_output=False)

    masks = processor.image_processor.post_process_masks(
        outputs.pred_masks.cpu(),
        original_sizes,
        reshaped_input_sizes,
    )[0]  # [num_points, 1, H, W] bool
    scores = outputs.iou_scores.cpu().numpy()[0, :, 0]  # [num_points]

    # Build overlay: start from RGBA, paint each mask with a deterministic
    # color seeded by its index. ALSO record per-mask geometry stats so the
    # spatial judge can read structured "object at (x,y) covering N% of frame".
    overlay = np.zeros((H, W, 4), dtype=np.uint8)
    rng = np.random.default_rng(42)
    segments = []
    for i, m in enumerate(masks):
        if scores[i] < 0.6:
            continue
        m_np = m[0].numpy().astype(bool)
        area = int(m_np.sum())
        if area < 200:
            continue
        # Centroid + bbox in image coords.
        ys, xs = np.where(m_np)
        cx = float(xs.mean())
        cy = float(ys.mean())
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())

        color = rng.integers(60, 230, size=3)
        unpainted = overlay[..., 3] == 0
        paint = m_np & unpainted
        overlay[paint, 0] = color[0]
        overlay[paint, 1] = color[1]
        overlay[paint, 2] = color[2]
        overlay[paint, 3] = 128

        seg = {
            "id": len(segments),
            "score": float(scores[i]),
            "area_px": area,
            "area_frac": round(area / float(H * W), 4),
            "centroid_px": [round(cx, 1), round(cy, 1)],
            "centroid_norm": [round(cx / W, 3), round(cy / H, 3)],
            "bbox_px": [x0, y0, x1, y1],
        }
        # If depth was passed in, report median depth under this mask. The
        # judge can then say "object 3 is at relative depth 0.42 (closer)
        # while object 7 is at 0.81 (farther)".
        if depth_raw is not None:
            # Resize mask to depth resolution if they differ.
            dh, dw = depth_raw.shape
            if (dh, dw) != (H, W):
                # cheap nearest-neighbor downsample
                ys_d = (ys.astype(np.float32) * dh / H).astype(np.int32).clip(0, dh - 1)
                xs_d = (xs.astype(np.float32) * dw / W).astype(np.int32).clip(0, dw - 1)
                vals = depth_raw[ys_d, xs_d]
            else:
                vals = depth_raw[ys, xs]
            seg["depth_median_raw"] = float(np.median(vals))
            seg["depth_p10_raw"] = float(np.percentile(vals, 10))
            seg["depth_p90_raw"] = float(np.percentile(vals, 90))
        segments.append(seg)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(overlay, "RGBA").save(out_path, optimize=True)
    return {
        "n_masks": len(segments),
        "grid": grid,
        "shape": [H, W],
        "segments": segments,
    }


# ─── Driver ───────────────────────────────────────────────────────────────
def main():
    if not MANIFEST_IN.exists():
        print(f"[fatal] missing {MANIFEST_IN}", file=sys.stderr)
        sys.exit(1)

    frames_meta = json.loads(MANIFEST_IN.read_text())
    print(f"[init] {len(frames_meta)} frames to process")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    depth_pipe = load_depth_pipe()
    sam_model, sam_processor = load_sam()

    out_manifest = []
    for i, meta in enumerate(frames_meta):
        fname = meta["filename"]
        frame_id = pathlib.Path(fname).stem  # frame_0000_00000000
        img_path = FRAMES_DIR / fname
        if not img_path.exists():
            print(f"[skip] {fname} not found")
            continue

        out_subdir = OUT_DIR / frame_id
        depth_out = out_subdir / "depth.png"
        mask_out = out_subdir / "mask.png"

        t0 = time.time()
        depth_meta, depth_raw = run_depth(depth_pipe, img_path, depth_out)
        t_depth = time.time() - t0

        t0 = time.time()
        sam_meta = run_sam_grid(
            sam_model, sam_processor, img_path, mask_out, depth_raw=depth_raw
        )
        t_sam = time.time() - t0

        out_manifest.append({
            "frame_id": frame_id,
            "filename": fname,
            "frame_idx": meta["frame_idx"],
            "timestamp_s": meta["timestamp_s"],
            "depth": {
                "url": f"/inference/{frame_id}/depth.png",
                **depth_meta,
            },
            "mask": {
                "url": f"/inference/{frame_id}/mask.png",
                **sam_meta,
            },
        })
        print(f"[{i+1:>2}/{len(frames_meta)}] {frame_id}  depth={t_depth:.1f}s sam={t_sam:.1f}s  masks={sam_meta['n_masks']}")

    MANIFEST_OUT.write_text(json.dumps(out_manifest, indent=2))
    print(f"[done] manifest → {MANIFEST_OUT}")


if __name__ == "__main__":
    main()
