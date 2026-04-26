# VIMA API Contract

Base URL: `http://localhost:8765`

## Health Check
```
GET /health
→ {"status":"ok","video":"...","video_exists":true}
```

## Analyze Frame (upload)
```
POST /analyze/frame
Content-Type: multipart/form-data
file: <JPEG bytes>
timestamp: float (optional, default 15.0)
event_id: str (optional)
cloud_path: str (optional, path to .ply/.npy)
→ ViolationReport JSON
```

## Analyze Timestamp (from configured video)
```
POST /analyze/timestamp?timestamp=30.0&event_id=NC_030s
→ ViolationReport JSON
```

## Batch
```
POST /analyze/batch
Body: [{"event_id":"NC_015","timestamp_s":15.0}, ...]
→ [ViolationReport, ...]
```

## Demo
```
GET /demo
→ [ViolationReport x5]  (timestamps: 15, 45, 90, 180, 300s)
```

## ViolationReport Schema
```typescript
interface ViolationReport {
  pnc: "P" | "C" | "NC"
  activity: string              // <30 chars
  spatial_claims: {
    object: string              // ontology: worker, scaffold, guardrail...
    location: string            // spatial description
    distance_m: number | null
  }[]
  violation_flags: {
    rule: string                // e.g. "OSHA 1926.502(b)"
    severity: "high" | "medium" | "low"
    evidence: string
  }[]
  confidence: number            // 0-1
  reasoning: string
  event_id: string
  timestamp_s: number
  frame_path: string
  model: string
  cloud_stub: string
  cloud_n_points: number
}
```
