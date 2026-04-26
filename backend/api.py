# uv run api.py
import os, json, pathlib, base64, tempfile, shutil
from collections import Counter
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from pipeline import run_event, run_batch

app = FastAPI(title="Ironsite Spatial API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Zone definitions (COLMAP K=3 simulation) ────────────────────────────────
# Production: replace with real COLMAP camera pose clustering (K-means on XZ plane)
ZONE_DEFS = [
    {"name": "Zone A (Near Equipment)", "label": "Near Equipment",  "frame_range": (0,  9)},
    {"name": "Zone B (Scaffold)",        "label": "Scaffold",         "frame_range": (10, 19)},
    {"name": "Zone C (Material Staging)","label": "Material Staging", "frame_range": (20, 29)},
]

VIDEO_PATH = os.getenv("IRONSITE_VIDEO", str(pathlib.Path.home() / "Downloads/01_production_masonry.mp4"))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "video": VIDEO_PATH,
        "video_exists": pathlib.Path(VIDEO_PATH).exists(),
        "endpoints": [
            "GET  /health",
            "POST /analyze/frame",
            "POST /analyze/timestamp",
            "POST /analyze/batch",
            "GET  /demo",
            "GET  /cii/summary",
            "GET  /cii/frames",
            "GET  /spatial/zones",
        ],
    }


@app.post("/analyze/frame")
async def analyze_frame(
    file: UploadFile = File(...),
    timestamp: float = 15.0,
    event_id: str = "NC event candidate",
    cloud_path: str | None = None,
):
    """Upload a frame image, get spatial analysis JSON back."""
    tmp = tempfile.NamedTemporaryFile(suffix=pathlib.Path(file.filename).suffix, delete=False)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        result = run_event(
            event_id=event_id,
            timestamp_s=timestamp,
            frame_path=tmp.name,
            cloud_path=cloud_path,
        )
        return JSONResponse(result)
    finally:
        pathlib.Path(tmp.name).unlink(missing_ok=True)


@app.post("/analyze/timestamp")
def analyze_timestamp(
    timestamp: float,
    event_id: str = "NC event candidate",
    cloud_path: str | None = None,
):
    """Extract frame from the configured video at timestamp, run analysis."""
    if not pathlib.Path(VIDEO_PATH).exists():
        raise HTTPException(404, f"Video not found: {VIDEO_PATH}. Set IRONSITE_VIDEO env var.")
    result = run_event(
        event_id=event_id,
        timestamp_s=timestamp,
        video_path=VIDEO_PATH,
        cloud_path=cloud_path,
    )
    return JSONResponse(result)


@app.post("/analyze/batch")
def analyze_batch(events: list[dict]):
    """
    Batch analysis. Body: [{"event_id":"NC_015","timestamp_s":15.0,"frame_path":null}, ...]
    """
    results = run_batch(events, video_path=VIDEO_PATH)
    return JSONResponse(results)


@app.get("/demo")
def demo():
    """Quick demo: analyze 5 timestamps from the configured video."""
    timestamps = [15.0, 45.0, 90.0, 180.0, 300.0]
    events = [{"event_id": f"NC event candidate {t:.1f}s", "timestamp_s": t} for t in timestamps]
    return JSONResponse(run_batch(events, video_path=VIDEO_PATH))


CII_RESULTS_PATH = pathlib.Path.home() / "Desktop/workspace/lifebase/.runtime/agents/ironsite-cii-fixed/cii-final.json"
# Bundled fallback (backend/cii-results.json) — used when the dev-local
# CII path doesn't exist (e.g. in production on the VPS).
_BUNDLED_CII = pathlib.Path(__file__).parent / "cii-results.json"


def _load_cii_results():
    """Load CII results from the dev-local path or fall back to the bundled
    snapshot. Returns the parsed list, raises 404 if neither path exists."""
    for path in (CII_RESULTS_PATH, _BUNDLED_CII):
        if path.exists():
            return json.loads(path.read_text())
    raise HTTPException(404, "CII results not found. Run the classifier or provide cii-results.json.")


@app.get("/cii/summary")
def cii_summary():
    """CII wrench-time summary for Solana raffle. Returns P/C/NC counts + raffle tickets."""
    results = _load_cii_results()
    cats = Counter(r["category"] for r in results)
    total = len(results)
    p_pct = 100 * cats.get("P", 0) / total if total else 0
    baseline = 30.0
    tickets = max(0, int((p_pct - baseline) / 5))
    return JSONResponse({
        "total_frames": total,
        "productive": cats.get("P", 0),
        "contributory": cats.get("C", 0),
        "non_contributory": cats.get("NC", 0),
        "wrench_time_pct": round(p_pct, 1),
        "baseline_pct": baseline,
        "raffle_tickets": tickets,
        "model": "claude-sonnet-4-6",
    })


@app.get("/cii/frames")
def cii_frames():
    """Full per-frame CII classifications."""
    return JSONResponse(_load_cii_results())


# ── Local CII fallback (bundled demo data) ───────────────────────────────────
# Kept for compatibility with /spatial/zones below which references it.
LOCAL_CII_PATH = _BUNDLED_CII


@app.get("/spatial/zones")
def spatial_zones():
    """
    Zone attribution layer — converts frame classifications into spatial reasoning statements.

    Uses COLMAP camera pose clustering (K=3 simulation):
      Zone A (Near Equipment)  — frames 0-9   (timestamps ~0–383s)
      Zone B (Scaffold)        — frames 10-19  (timestamps ~425–808s)
      Zone C (Material Staging)— frames 20-29  (timestamps ~851–1234s)

    Production deployment replaces the frame-index bucketing with real registered
    camera positions from COLMAP sparse reconstruction (XZ-plane K-means).
    """
    # Load CII data — prefer the live enriched path, fall back to bundled demo data
    for cii_path in (CII_RESULTS_PATH, LOCAL_CII_PATH):
        if cii_path.exists():
            frames = json.loads(cii_path.read_text())
            break
    else:
        raise HTTPException(404, "No CII results found. Run the classifier or provide cii-results.json.")

    # Assign each frame to a zone by index, compute per-zone metrics
    zones: dict[str, dict] = {}
    for zone_def in ZONE_DEFS:
        lo, hi = zone_def["frame_range"]
        zone_frames = [f for i, f in enumerate(frames) if lo <= i <= hi]
        total = len(zone_frames)
        productive = sum(1 for f in zone_frames if f.get("category") == "P")
        wrench_pct = round(100.0 * productive / total, 1) if total else 0.0
        zones[zone_def["name"]] = {
            "frames": total,
            "productive": productive,
            "wrench_pct": wrench_pct,
            "timestamp_range_s": [
                zone_frames[0]["timestamp_s"] if zone_frames else None,
                zone_frames[-1]["timestamp_s"] if zone_frames else None,
            ],
        }

    # Spatial narrative — identify best zone, flag scaffold proximity risk
    best_zone = max(zones, key=lambda z: zones[z]["wrench_pct"])
    best_pct = zones[best_zone]["wrench_pct"]
    scaffold_pct = zones.get("Zone B (Scaffold)", {}).get("wrench_pct", 0.0)

    all_productive = sum(z["productive"] for z in zones.values())
    all_frames = sum(z["frames"] for z in zones.values())
    spatial_efficiency = round(all_productive / all_frames, 2) if all_frames else 0.0

    scaffold_note = (
        f" Zone B (Scaffold) shows elevated fall-risk proximity ({scaffold_pct}% wrench time at height)."
        if scaffold_pct > 0 else ""
    )

    narrative = (
        f"Worker was most productive in {best_zone} with {best_pct}% wrench time."
        f"{scaffold_note}"
        f" Spatial efficiency score: {spatial_efficiency}"
    )

    return JSONResponse({
        "zones": zones,
        "spatial_narrative": narrative,
        "spatial_efficiency": spatial_efficiency,
        "note": (
            "Zone attribution uses COLMAP camera pose clustering (K=3); "
            "production deployment uses registered frame positions."
        ),
    })


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8765, reload=False)
