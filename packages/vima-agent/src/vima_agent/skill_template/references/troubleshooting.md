# vima agent troubleshooting

| symptom | exit code | likely cause | what to do |
|---|---|---|---|
| `error: vima api 401 at ...` | 4 | auth required for an endpoint | check `VIMA_API_KEY` env var. as of v0.1.0 the prod api is public — 401 means an upstream config changed. report to the user, don't retry. |
| `error: vima api 403 at ...` | 4 | forbidden | same as 401 — upstream change. don't retry. |
| `error: vima api 429 at ...` | 4 | rate limited | back off. wait 60s before retrying. don't loop. |
| `error: vima api 503 at ...` | 4 | upstream model (Anthropic) is down | wait + retry once. if still 503, tell the user the judge is degraded. |
| `error: vima api 500 at ...` | 3 | backend bug (FastAPI exception) | the `detail` field in the response usually points at the cause. report verbatim, don't paraphrase. |
| `error: could not reach vima api at ...: ...` | 3 | network / DNS / vps down | check `vima doctor` against `--api-url http://localhost:8765` if running locally. |
| `error: timed out calling vima api at ...` | 3 | network slow OR Claude judge slow | first call to `/analyze/frame` can take 8–15s. raise `--timeout-s 30` and retry. |
| `error: vima api returned non-json from ...` | 5 | response was HTML (often a Caddy/Cloudflare error page) | the api is up but a proxy is intercepting. report the url and the first 200 chars of `detail`. |
| `error: image not found: ...` | 2 | local path doesn't exist | bad input. ask the user for a real path. don't guess. |
| `error: provide an image path/url or --sample` | 2 | no image given to analyze/compare | bad invocation. point at the help: `vima analyze --help`. |

## verdict drift

If `cii summary` returns numbers wildly different from
`golden_samples/cii-summary.json`:

- the demo eval was rerun with different prompts or frames
- the model id changed (check the `model` field)
- OR the `cii-results.json` cache was cleared and is being regenerated

**Don't** treat new numbers as authoritative until you confirm the run
that produced them. Ask the user "did you rerun the eval recently?" before
quoting current numbers.

## skill install failures

```
$ vima skill install --agent claude
{ "installed": [], "agent": "claude", "hint": "no new skill installed; ..." }
```

Means `~/.claude/skills/vima/` already exists. If you really want to
overwrite, pass `--force`. Otherwise use `vima skill print --agent claude`
and paste manually — it's safer.

## what vima will NOT do

These are by design, not bugs:

- It will not analyze video files. Frames only. Extract with `ffmpeg`
  first.
- It will not return per-pixel masks or depth maps. The hosted endpoints
  give CII verdicts + spatial claims; mask/depth assets are static under
  `/inference/` on the website, not the API.
- It will not accept frames > a few MB without the upload silently
  truncating. Resize first if your JPG is huge.
- It will not retry failed inferences. Each `analyze` call is independent.
