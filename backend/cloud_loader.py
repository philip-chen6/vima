"""
Cloud loader — canonical format is .ply (binary little endian, x/y/z + r/g/b
per vertex). One global cloud per project, NOT per-event-timestamp; confirmed
by Josh's reconstruction agent 2026-04-26.

When `path is None` we fall back to the canonical masonry sparse map at
frontend/public/reconstruction/sparse.ply (1770 vertices, COLMAP sparse).
The synthetic random-point stub is kept only as a last-resort emergency
fallback when the canonical map is also missing — it should never run in
prod, and we tag the result so the judge / UI can see it.

Contract: load_cloud(path) -> CloudCrop. .geometry_stats() yields a compact
JSON-friendly dict for the judge prompt.
"""
import numpy as np
import pathlib
from dataclasses import dataclass

# Canonical sparse map shipped with the repo. Resolved relative to the
# backend directory so it works regardless of CWD.
_REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CANONICAL_SPARSE_PLY = _REPO_ROOT / "frontend" / "public" / "reconstruction" / "sparse.ply"


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
    """Pure-numpy PLY reader: handles ASCII and binary little-endian PLYs
    with float32 x/y/z + uint8 r/g/b vertex properties (COLMAP's sparse.ply
    + Brush's gaussian PLY both fit this with the right header parse).

    We avoid open3d because its 200MB+ install kills the 2GB prod VPS. For
    the formats we actually use, header parse + np.fromfile is enough.
    """
    p = pathlib.Path(path)
    with p.open("rb") as f:
        # Header is ASCII regardless of payload format.
        header_bytes = bytearray()
        while True:
            line = f.readline()
            if not line:
                raise ValueError(f"Truncated PLY: {path}")
            header_bytes.extend(line)
            if line.strip() == b"end_header":
                break
        header = header_bytes.decode("ascii", errors="replace").splitlines()

        is_binary_le = any("format binary_little_endian" in l for l in header)
        is_ascii = any("format ascii" in l for l in header)
        n_vertex = 0
        properties: list[tuple[str, str]] = []  # (dtype-code, name)
        in_vertex = False
        for l in header:
            l = l.strip()
            if l.startswith("element vertex"):
                n_vertex = int(l.split()[-1])
                in_vertex = True
            elif l.startswith("element"):
                in_vertex = False
            elif in_vertex and l.startswith("property"):
                parts = l.split()
                # property <type> <name>  (we don't handle list-properties here)
                if parts[1] == "list":
                    continue
                properties.append((parts[1], parts[2]))

        if n_vertex == 0:
            return CloudCrop(np.zeros((0, 3)), None, 0, np.zeros(3), np.zeros(3), path)

        # Map PLY type names to numpy dtypes.
        ply_to_np = {
            "float": "<f4", "float32": "<f4",
            "double": "<f8", "float64": "<f8",
            "uchar": "u1", "uint8": "u1", "char": "i1", "int8": "i1",
            "ushort": "<u2", "uint16": "<u2", "short": "<i2", "int16": "<i2",
            "uint": "<u4", "uint32": "<u4", "int": "<i4", "int32": "<i4",
        }
        if is_binary_le:
            dtype = np.dtype([(name, ply_to_np[t]) for t, name in properties])
            data = np.fromfile(f, dtype=dtype, count=n_vertex)
        elif is_ascii:
            # Slow path for ASCII. Read remaining as text.
            text = f.read().decode("ascii", errors="replace")
            rows = [l.split() for l in text.splitlines() if l.strip()]
            dtype = np.dtype([(name, ply_to_np[t]) for t, name in properties])
            data = np.empty(n_vertex, dtype=dtype)
            for i, row in enumerate(rows[:n_vertex]):
                for j, (t, name) in enumerate(properties):
                    data[name][i] = float(row[j]) if "f" in ply_to_np[t] else int(row[j])
        else:
            raise ValueError(f"Unsupported PLY format in {path}: only binary_little_endian + ascii")

    # Pull XYZ.
    if not all(k in data.dtype.names for k in ("x", "y", "z")):
        raise ValueError(f"PLY {path} missing x/y/z properties — got {data.dtype.names}")
    pts = np.column_stack([data["x"], data["y"], data["z"]]).astype(np.float64)

    # Colors are optional. COLMAP uses red/green/blue uint8.
    colors = None
    if all(k in data.dtype.names for k in ("red", "green", "blue")):
        colors = np.column_stack([data["red"], data["green"], data["blue"]]).astype(np.uint8)
    elif all(k in data.dtype.names for k in ("r", "g", "b")):
        colors = np.column_stack([data["r"], data["g"], data["b"]]).astype(np.uint8)

    return CloudCrop(
        points=pts,
        colors=colors,
        n_points=len(pts),
        bbox_min=pts.min(axis=0),
        bbox_max=pts.max(axis=0),
        source_path=path,
    )


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
    """Route to the right loader by extension.

    Resolution order when `path is None`:
      1. The canonical masonry sparse map (frontend/public/reconstruction/sparse.ply).
         This is the global cloud Josh's reconstruction agent confirmed is the
         single source of truth — one cloud, not per-event-timestamp.
      2. The synthetic stub (random points). Emergency fallback only — should
         never run in prod. Tag `source_path="<stub>"` so callers / the judge /
         the UI can flag it.
    """
    if path is None:
        if CANONICAL_SPARSE_PLY.exists():
            return load_ply(str(CANONICAL_SPARSE_PLY))
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
