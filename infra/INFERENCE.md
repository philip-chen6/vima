# vima inference architecture

How the spatial AI ships without a runtime GPU.

## TL;DR

| Component                 | Where it runs            | When                     |
| ------------------------- | ------------------------ | ------------------------ |
| Claude Sonnet 4.6 judge   | Anthropic API            | Live, per-frame request  |
| Depth-Anything-V2-Small   | Laptop, Apple Metal MPS  | Offline, once per frame  |
| SAM ViT-Base              | Laptop, Apple Metal MPS  | Offline, once per frame  |
| 3D Gaussian Splat (Brush) | Laptop, Apple Metal WGPU | Offline, once per scene  |
| Frontend (Next.js)        | Vultr VPS (1 vCPU/2GB)   | Live                     |
| FastAPI backend           | Vultr VPS (1 vCPU/2GB)   | Live, calls Anthropic    |

The prod box is CPU-only (Vultr Cloud GPU plans require a manual access
request that won't clear before judging). All ML inference is precomputed
on the laptop and shipped as static assets. The judge calls Anthropic
live and reads the static depth/SAM context as a JSON payload in the
prompt.

## Offline pipeline

```
masonry-source.mp4 (90s, 640×480)
    │
    ├─→ COLMAP sparse  →  /reconstruction/sparse.ply (1770 pts, 19/31 frames)
    │       │
    │       └─→ Brush v0.3.0 (Metal, 30k steps, ~6 min)
    │               └─→ /reconstruction/masonry-splat-30k.ply
    │                   (62,783 SH-3 gaussians, ~15MB)
    │
    └─→ ffmpeg @ 0.5fps  →  /masonry-frames-raw/*.jpg (31 frames)
            │
            ├─→ Depth-Anything-V2-Small (MPS)
            │       ├─→ /inference/{frame_id}/depth.png  (turbo heatmap viz)
            │       └─→ manifest.json depth stats
            │           (raw inverse-depth p10/p50/p90 + quadrant means)
            │
            └─→ SAM ViT-Base, 8×8 prompt grid (MPS)
                    ├─→ /inference/{frame_id}/mask.png   (RGBA overlay)
                    └─→ manifest.json segments
                        (per-mask centroid + area + score + median depth)
```

Driver: `backend/scripts/precompute_inference.py`. Run once after new
frames land:

```bash
source .venv-inference/bin/activate
python backend/scripts/precompute_inference.py
```

Splat training (only when the source video changes):

```bash
# Build COLMAP-format dataset dir
mkdir -p /tmp/masonry-splat/{sparse/0,images}
cp frontend/public/reconstruction/colmap/sparse/*.bin /tmp/masonry-splat/sparse/0/
cp frontend/public/masonry-frames-raw/*.jpg /tmp/masonry-splat/images/

# Train (Brush v0.3.0 prebuilt for aarch64 mac)
brush_app /tmp/masonry-splat \
  --total-steps 30000 \
  --max-resolution 1080 \
  --export-every 10000 \
  --export-path /tmp/masonry-splat/exports \
  --export-name "masonry_{iter}.ply"

cp /tmp/masonry-splat/exports/masonry_30000.ply \
   frontend/public/reconstruction/masonry-splat-30k.ply
```

## Live request path

```
POST /api/analyze/frame
    │
    ▼
backend/judge.py · judge_event()
    │
    ├─→ base64-encode frame
    ├─→ inference_context.build_judge_payload(frame_path)
    │       └─ if frame is in manifest: depth percentiles + top-K segments
    │       └─ else: returns None (geometry-stats-only flow)
    │
    ├─→ Anthropic Messages API (Claude Sonnet 4.6)
    │       system: "You are a construction site safety AI..."
    │       user: [image, geometry_stats JSON, depth+SAM JSON if available]
    │
    └─→ Parse JSON response, attach used_inference_context flag
```

## Why not a GPU on prod

1. Vultr Cloud GPU (vcg-a40, vcg-l40s, vcg-a16 plans) requires a manual
   support ticket: *"Server add failed: Please open a support request for
   access to this product."* Hackathon judging window doesn't allow for
   the multi-hour SLA.
2. Bare metal GPU plans aren't in the open catalog either.
3. The 1 vCPU / 2GB prod box can serve static assets + proxy Anthropic
   indefinitely. Adding torch/transformers + a model would OOM the box
   instantly.

The offline-precompute approach is **better** for a fixed demo set:
* zero runtime ML failures
* deterministic outputs (judges see the same masks every time)
* sub-50ms asset serving from static files
* Anthropic latency dominates the request anyway (~1-2s per judge call)

The only thing we lose is "user uploads a brand new frame and watches
live depth/SAM run." For the hackathon that's not the demo.
