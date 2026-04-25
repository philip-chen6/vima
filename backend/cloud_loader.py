"""
Stub cloud_crop loader — slots for .ply, .npy/.npz, .bin.
Contract: load_cloud(path) -> dict with keys: points (Nx3), colors (Nx3 optional), metadata.
Wire a real loader once Joshua/Lucas confirms the drive format.
"""
import numpy as np
import pathlib
from dataclasses import dataclass


@dataclass
class CloudCrop:
    points: np.ndarray   # (N, 3) XYZ
    colors: np.ndarray | None  # (N, 3) RGB 0-255 or None
    n_points: int
    bbox_min: np.ndarray  # (3,)
    bbox_max: np.ndarray  # (3,)
    source_path: str

    def geometry_stats(self) -> dict:
        """Compact stats for the judge prompt — no raw point arrays."""
        return {
            "n_points": self.n_points,
            "bbox_m": {
                "x": [round(float(self.bbox_min[0]), 2), round(float(self.bbox_max[0]), 2)],
                "y": [round(float(self.bbox_min[1]), 2), round(float(self.bbox_max[1]), 2)],
                "z": [round(float(self.bbox_min[2]), 2), round(float(self.bbox_max[2]), 2)],
            },
            "centroid_m": [round(float(v), 2) for v in self.points.mean(axis=0)],
            "height_range_m": round(float(self.bbox_max[2] - self.bbox_min[2]), 2),
            "footprint_m2": round(
                float((self.bbox_max[0] - self.bbox_min[0]) * (self.bbox_max[1] - self.bbox_min[1])), 2
            ),
        }


def _stub_cloud() -> CloudCrop:
    """Synthetic 3D point cloud for testing — 200 points in a 4x4x3m volume."""
    rng = np.random.default_rng(42)
    pts = rng.uniform([0, 0, 0], [4, 4, 3], size=(200, 3))
    colors = rng.integers(80, 200, size=(200, 3), dtype=np.uint8)
    return CloudCrop(
        points=pts,
        colors=colors,
        n_points=len(pts),
        bbox_min=pts.min(axis=0),
        bbox_max=pts.max(axis=0),
        source_path="<stub>",
    )


def load_ply(path: str) -> CloudCrop:
    try:
        import open3d as o3d  # type: ignore
        pcd = o3d.io.read_point_cloud(path)
        pts = np.asarray(pcd.points)
        colors = (np.asarray(pcd.colors) * 255).astype(np.uint8) if pcd.has_colors() else None
        return CloudCrop(pts, colors, len(pts), pts.min(0), pts.max(0), path)
    except ImportError:
        raise RuntimeError("open3d not installed — run: uv pip install open3d")


def load_npy(path: str) -> CloudCrop:
    data = np.load(path)
    # Expect (N, 3) XYZ or (N, 6) XYZRGB
    pts = data[:, :3]
    colors = (data[:, 3:6] * 255).astype(np.uint8) if data.shape[1] >= 6 else None
    return CloudCrop(pts, colors, len(pts), pts.min(0), pts.max(0), path)


def load_bin(path: str) -> CloudCrop:
    """KITTI-style binary float32 (x,y,z,intensity) — 4 floats per point."""
    data = np.fromfile(path, dtype=np.float32).reshape(-1, 4)
    pts = data[:, :3]
    return CloudCrop(pts, None, len(pts), pts.min(0), pts.max(0), path)


def load_cloud(path: str | None) -> CloudCrop:
    """Route to the right loader by extension. None → synthetic stub."""
    if path is None:
        return _stub_cloud()
    p = pathlib.Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Cloud path not found: {path}")
    ext = p.suffix.lower()
    if ext == ".ply":
        return load_ply(path)
    if ext in (".npy", ".npz"):
        return load_npy(path)
    if ext == ".bin":
        return load_bin(path)
    raise ValueError(f"Unknown point cloud format: {ext} — add a loader in cloud_loader.py")
