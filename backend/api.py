# uv run api.py
import os, json, pathlib, base64, tempfile, shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from pipeline import run_event, run_batch

app = FastAPI(title="Ironsite Spatial API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

VIDEO_PATH = os.getenv("IRONSITE_VIDEO", str(pathlib.Path.home() / "Downloads/01_production_masonry.mp4"))


@app.get("/health")
def health():
    return {"status": "ok", "video": VIDEO_PATH, "video_exists": pathlib.Path(VIDEO_PATH).exists()}


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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8765, reload=False)
