# vima mcp

hosted model context protocol server for the vima spatial api.

## run locally

```bash
cd packages/vima-mcp
python3 -m pip install -e .
VIMA_API_URL=https://vimaspatial.tech/api vima-mcp
```

the streamable http endpoint is served at:

```text
http://localhost:8766/mcp
```

## tools

- `vima_doctor` checks `/health`, `/cii/summary`, and `/spatial/zones`
- `vima_analyze_frame` analyzes a sample, image url, or base64 image
- `vima_compare_frame` compares vima prompting against the baseline prompt
- `vima_cii_summary` returns wrench-time summary stats
- `vima_cii_frames` returns frame-level cii rows, optionally filtered by `P`, `C`, or `NC`
- `vima_spatial_zones` returns zone-level spatial productivity
- `vima_eval` returns cached temporal eval claims and baseline comparison
