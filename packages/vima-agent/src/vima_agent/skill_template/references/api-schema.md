# vima api response schemas

Real response shapes from `https://vimaspatial.tech/api`. Captured golden
samples sit alongside this file in `golden_samples/`.

## `GET /health`

```json
{ "status": "ok" }
```

Always returns 200 when the FastAPI process is up. Use as a liveness probe.

## `GET /cii/summary`

Cached aggregate over the masonry demo run.

```json
{
  "total_frames": 30,
  "productive": 26,
  "contributory": 0,
  "non_contributory": 4,
  "wrench_time_pct": 86.7,
  "baseline_pct": 30.0,
  "raffle_tickets": 11,
  "model": "claude-sonnet-4-6"
}
```

- `wrench_time_pct = productive / total_frames * 100`
- `raffle_tickets` is the SPL payout count above the 30% baseline floor
- `model` is the judge model id, not a prompt name

## `GET /cii/frames`

Per-frame CII rows. Array, not object. Each row:

```json
{
  "frame": "frame_017.jpg",
  "timestamp_s": 723.0,
  "category": "P",
  "activity": "laying mortar bed",
  "confidence": 0.94,
  "finish_reason": "STOP"
}
```

- `category ∈ {"P", "C", "NC"}` — productive, contributory, non-contributory
- `confidence ∈ [0, 1]`
- `finish_reason` reflects upstream model stop reason; "STOP" is normal
- Frames where the judge errored have `category: "NC"`, `activity:
  "error/unclassified"`, `confidence: 0.2` — treat as failed inferences,
  not real NC verdicts

## `GET /spatial/zones`

Zone-level rollup using COLMAP camera-pose clustering (K=3).

```json
{
  "zones": {
    "Zone A (Near Equipment)": {
      "frames": 10, "productive": 9, "wrench_pct": 90.0,
      "timestamp_range_s": [0.0, 382.8]
    }
  },
  "spatial_narrative": "Worker was most productive in Zone B...",
  "spatial_efficiency": 0.87,
  "note": "Zone attribution uses COLMAP camera pose clustering (K=3)..."
}
```

`spatial_efficiency ∈ [0, 1]`. Higher is better.

## `GET /eval`

Multi-frame temporal eval — the actual A/B between vima's multi-frame
prompt and the single-frame baseline. Has rich nested structure:

```
{
  "_note": "...",
  "baseline": {
    "method": "single_frame_baseline",
    "n_frames_examined": 8,
    "elapsed_s": 18.2,
    "per_frame_claims": [{ "frame": 0, "claim": "..." }, ...]
  },
  "vima": {
    "method": "vima-temporal-v1",
    "n_frames_examined": 8,
    "elapsed_s": ...,
    "claims": [{ "type": "...", "evidence": [...] }, ...]
  }
}
```

The whole point of this endpoint is to expose the difference. Cite both
when comparing. See `golden_samples/eval.json` for the full shape.

## `POST /analyze/frame`

Live judge call. Multipart form with a `file` field containing the JPG.
Query params:

- `prompt`: `"vima"` (default) or `"baseline"`
- `timestamp`: float seconds
- `event_id`: free-text label

Response:

```json
{
  "pnc": "C",
  "activity": "elevated masonry site survey",
  "confidence": 0.62,
  "episode": "scaffold_zone_visible",
  "spatial_claims": [
    {
      "object": "scaffold",
      "location": "foreground left, yellow metal frame",
      "distance_m": 1.5
    }
  ],
  "reasoning": "Source frame shows...",
  "model": "claude-sonnet-4-6",
  "prompt": "vima-v1",
  "frame_path": "/tmp/...",
  "event_id": "vima-agent upload",
  "timestamp_s": 15.0,
  "in_safe_envelope": null,
  "surface": "unknown"
}
```

- `pnc` is the canonical verdict — use it, NOT `activity`, to decide
  productive/contributory/non-contributory
- `distance_m` may be `null` if the judge couldn't estimate
- `in_safe_envelope` and `surface` are reserved for future enrichment;
  don't reason about `null` values

## errors

All endpoints return JSON errors in this shape on failure:

```json
{ "detail": "human readable message" }
```

The CLI maps HTTP status to exit code:

| status | meaning             | exit |
|--------|---------------------|------|
| 401/403 | auth refused       | 4    |
| 429     | rate limited       | 4    |
| 503     | upstream model down | 4    |
| 500     | server error       | 3    |
| network | unreachable         | 3    |
| 200 + non-json | bad response | 5    |
