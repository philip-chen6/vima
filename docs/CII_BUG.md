# CII Classifier Bug — Diagnosis

Last updated: 2026-04-25 01:25 PDT

## Symptom
All 30 reclassified frames returned `classification: "?"` (actually NC with confidence 0.2 — the error fallback).

## Root Cause
Gemini API returns JSON split across response chunks. The parser expects full JSON in a single read. Works for first ~5 frames, then starts hitting chunking issues.

### Error chain:
1. v3 log: `ERR: no json in: { "category": "NC", "conf":` — response truncated mid-JSON
2. Parser falls back to `{"classification": "NC", "confidence": 0.2, "activity": "error/unclassified"}`
3. Upstream consumer reads confidence 0.2 as uncertain → outputs "?"

## Models Tried (all Gemini, no Anthropic)
- v3: `gemini-2.5-flash`
- v4: `gemini-3.1-flash-lite-preview`
- final: `gemini-2.5-flash-lite` ← **DOESN'T EXIST** (404 on every call)

## Fix Options

### Option A: `response_mime_type` (recommended)
```python
response = model.generate_content(
    prompt,
    generation_config={"response_mime_type": "application/json"}
)
```
Forces Gemini to return valid JSON in a single response.

### Option B: Accumulate chunks
```python
full_response = ""
for chunk in response:
    full_response += chunk.text
result = json.loads(full_response)
```

### Option C: Switch to Claude Sonnet (backend/judge.py already works)
The backend judge at :8765 uses Claude Sonnet and works fine. Could use it for CII too. Cost is higher but reliability is proven.

## Status
PID 14857 is DEAD. No active CII classifier running.
