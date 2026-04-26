#!/usr/bin/env python3
"""dense_cloud_gen.py — DepthAnythingV2 + COLMAP poses → dense.ply for VIMA viewer

Usage:
    uv run tools/dense_cloud_gen.py --colmap-dir data/colmap --out output/dense.ply
"""
import struct, sys, os, argparse
import numpy as np
from pathlib import Path

# camera intrinsics (override for your sensor)
FX = FY = 378.35
CX, CY = 320.0, 240.0
W, H = 640, 480

COLMAP_DIR: Path = Path("data/colmap")
IMAGES_DIR: Path = COLMAP_DIR / "images"
SPARSE_DIR: Path = COLMAP_DIR / "best_model"
OUT_PLY: Path = Path("output/dense.ply")


def quat_to_rot(qw, qx, qy, qz):
    return np.array([
        [1-2*(qy**2+qz**2), 2*(qx*qy-qz*qw), 2*(qx*qz+qy*qw)],
        [2*(qx*qy+qz*qw), 1-2*(qx**2+qz**2), 2*(qy*qz-qx*qw)],
        [2*(qx*qz-qy*qw), 2*(qy*qz+qx*qw), 1-2*(qx**2+qy**2)]
    ])


def read_images_bin():
    images = {}
    with open(SPARSE_DIR / "images.bin", "rb") as f:
        n = struct.unpack('<Q', f.read(8))[0]
        print(f"Reading {n} images...", flush=True)
        for _ in range(n):
            image_id = struct.unpack('<I', f.read(4))[0]
            qw, qx, qy, qz = struct.unpack('<4d', f.read(32))
            tx, ty, tz = struct.unpack('<3d', f.read(24))
            camera_id = struct.unpack('<I', f.read(4))[0]
            name = b""
            while True:
                c = f.read(1)
                if c == b'\x00':
                    break
                name += c
            name = name.decode()
            n_pts = struct.unpack('<Q', f.read(8))[0]
            f.read(n_pts * 24)  # skip 2D points
            R = quat_to_rot(qw, qx, qy, qz)
            t = np.array([tx, ty, tz])
            images[image_id] = (name, R, t)
    return images


def run_depth(img_path):
    try:
        from transformers import pipeline as hf_pipeline
        from PIL import Image
        if not hasattr(run_depth, '_pipe'):
            print("  Loading DepthAnythingV2-Small...", flush=True)
            run_depth._pipe = hf_pipeline(
                "depth-estimation",
                model="depth-anything/Depth-Anything-V2-Small-hf",
                device="cpu"
            )
        img = Image.open(img_path).convert("RGB")
        result = run_depth._pipe(img)
        depth = np.array(result['depth']).astype(np.float32)
        if depth.max() > 0:
            depth = depth / depth.max()
        return depth
    except Exception as e:
        print(f"  depth failed: {e}", flush=True)
        return None


def depth_to_pointcloud(depth, R, t, img_arr, step=6):
    h, w = depth.shape
    u_arr = np.arange(0, w, step)
    v_arr = np.arange(0, h, step)
    uu, vv = np.meshgrid(u_arr, v_arr)
    d = depth[vv, uu]
    mask = d > 0.05
    z = d[mask] * 5.0 + 0.5
    x = (uu[mask] - CX) * z / FX
    y = (vv[mask] - CY) * z / FY
    pts_cam = np.stack([x, y, z], axis=1)
    pts_world = (R.T @ (pts_cam - t).T).T
    rgb = img_arr[vv[mask], uu[mask]]
    return pts_world, rgb


def write_ply(points, colors, output_path):
    n = len(points)
    with open(output_path, 'w') as f:
        f.write(f"ply\nformat ascii 1.0\nelement vertex {n}\n")
        f.write("property float x\nproperty float y\nproperty float z\n")
        f.write("property uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n")
        for pt, col in zip(points, colors):
            f.write(f"{pt[0]:.4f} {pt[1]:.4f} {pt[2]:.4f} {int(col[0])} {int(col[1])} {int(col[2])}\n")
    print(f"Wrote {n} points to {output_path}", flush=True)


def main():
    global COLMAP_DIR, IMAGES_DIR, SPARSE_DIR, OUT_PLY

    parser = argparse.ArgumentParser(description="Dense point cloud from COLMAP + DepthAnythingV2")
    parser.add_argument("--colmap-dir", default="data/colmap",
                        help="COLMAP output dir containing images/ and best_model/ subdirs")
    parser.add_argument("--out", default="output/dense.ply", help="output PLY path")
    args = parser.parse_args()

    COLMAP_DIR = Path(args.colmap_dir)
    IMAGES_DIR = COLMAP_DIR / "images"
    SPARSE_DIR = COLMAP_DIR / "best_model"
    OUT_PLY = Path(args.out)
    OUT_PLY.parent.mkdir(parents=True, exist_ok=True)

    from PIL import Image
    images = read_images_bin()
    all_pts, all_cols = [], []
    for img_id, (name, R, t) in images.items():
        img_path = IMAGES_DIR / name
        if not img_path.exists():
            continue
        print(f"Processing {name}...", flush=True)
        img = Image.open(img_path).convert("RGB")
        depth = run_depth(img_path)
        if depth is None:
            continue
        if depth.shape != (H, W):
            from PIL import Image as PILImage
            d_pil = PILImage.fromarray((depth * 255).astype(np.uint8)).resize((W, H))
            depth = np.array(d_pil) / 255.0
        pts, cols = depth_to_pointcloud(depth, R, t, np.array(img))
        all_pts.append(pts)
        all_cols.append(cols)
        print(f"  -> {len(pts)} pts", flush=True)
    if not all_pts:
        print("No points generated!")
        return 1
    pts_all = np.vstack(all_pts)
    col_all = np.vstack(all_cols)
    centroid = np.median(pts_all, axis=0)
    dists = np.linalg.norm(pts_all - centroid, axis=1)
    mask = dists < np.percentile(dists, 95)
    pts_all, col_all = pts_all[mask], col_all[mask]
    print(f"Total: {len(pts_all)} points", flush=True)
    write_ply(pts_all, col_all, OUT_PLY)
    return 0


if __name__ == "__main__":
    sys.exit(main())
