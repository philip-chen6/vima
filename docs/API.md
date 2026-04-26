# VIMA API Contract

Production base URL: `https://vimaspatial.tech/api`

Local backend base URL: `http://localhost:8765`

## Health Check

```http
GET /health
```

Returns service status, configured source-video path, whether that video exists,
and the public endpoint list.

## Analyze Frame

```http
POST /analyze/frame?prompt=vima&timestamp=15.0&event_id=vima-agent
Content-Type: multipart/form-data
```

Form fields:

- `file`: required image file

Query params:

- `prompt`: `vima` or `baseline`; default `vima`
- `timestamp`: float seconds; default `15.0`
- `event_id`: free-text event label; default `NC event candidate`
- `cloud_path`: optional local/reconstruction artifact path

## Analyze Timestamp

```http
POST /analyze/timestamp?timestamp=30.0&event_id=NC_030s
```

Extracts a frame from the configured source video and runs analysis. Production
does not bundle the full source video, so this endpoint can return video-missing
errors on the hosted VPS.

## Analyze Batch

```http
POST /analyze/batch
Content-Type: application/json
```

Body:

```json
[
  { "event_id": "NC_015", "timestamp_s": 15.0 }
]
```

Accepts up to 32 events. Each event must include numeric `timestamp_s` in the
`0` to `3600` second range.

## Demo

```http
GET /demo
```

Runs five fixed timestamps against the configured source video. On production it
currently returns `503 video_unavailable` because the full source video is not
deployed. Use `/cii/frames`, `/cii/summary`, `/spatial/zones`, or `/eval` for
hosted judge-safe evidence.

## CII Summary

```http
GET /cii/summary
```

Current production headline:

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

## CII Frames

```http
GET /cii/frames
```

Returns an array of cached per-frame rows:

```json
{
  "category": "P",
  "confidence": 0.95,
  "activity": "laying concrete blocks",
  "finish_reason": "STOP",
  "timestamp_s": 0.0,
  "frame": "frame_000.jpg"
}
```

## Spatial Zones

```http
GET /spatial/zones
```

Returns three zone rollups over the 30 hosted masonry frames:

- Zone A: 10 frames, 90.0% wrench time
- Zone B: 10 frames, 100.0% wrench time
- Zone C: 10 frames, 70.0% wrench time

The response also includes `spatial_narrative`, `spatial_efficiency`, and a note
describing the COLMAP/K=3 zone attribution layer.

## Eval

```http
GET /eval
```

Returns temporal claims, refusals, proof-frame URLs, and baseline comparison.
The payload includes `source: "reference"` for bundled fallback results or
`source: "live"` after a successful temporal run.

## Temporal Run

```http
POST /temporal/run?n=8
```

Runs live temporal reasoning for `1` to `12` frames, with a 60 second cooldown.
A successful run persists `temporal-results.json`, so later `/eval` responses
read that live result until it is replaced or removed.

## Temporal Frame

```http
GET /temporal/frame/{frame_index}
```

Serves frame files referenced by `/eval` when the stored frame path is inside an
allowed local artifact root. Prefer following `vima.frame_urls` from `/eval`.

## Analyze Response Shape

```typescript
interface AnalysisResult {
  pnc: "P" | "C" | "NC"
  activity: string
  spatial_claims: {
    object: string
    location: string
    distance_m: number | null
  }[]
  violation_flags?: {
    rule: string
    severity: "high" | "medium" | "low"
    evidence: string
  }[]
  confidence: number
  reasoning: string
  event_id: string
  timestamp_s: number
  model?: string
  prompt?: string
}
```

Error payloads are JSON but not all share the same shape. FastAPI validation
errors use `detail`; service-state errors use fields such as `error`,
`message`, `service_state`, and `retry_after_s`.
