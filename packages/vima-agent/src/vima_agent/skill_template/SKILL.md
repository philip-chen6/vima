# vima

use this skill when a user asks an agent to inspect, classify, verify, qa, or
reason about construction-site frames with vima spatial intelligence.

vima is an evidence-first spatial api. do not invent construction claims from
vibes. call the cli, read the returned json, and cite frame ids, timestamps,
verdicts, confidence, and refusal/error states directly.

## hard rules

these are not suggestions. break one, the agent has failed.

1. **never call a frame "productive" unless the api returned `pnc: "P"`**.
   "the worker looks busy" is not a verdict. only `pnc` is. same for `C`
   and `NC`.
2. **never paraphrase `activity` as the verdict**. `activity: "laying mortar"`
   does not imply `pnc: "P"` — read both fields.
3. **never invent `spatial_claims` or `distance_m`**. if the field is `null`
   or absent, report it as unknown. do not estimate from the image.
4. **never retry a failed inference automatically**. the api is not
   idempotent for `/analyze/frame` (each call hits Anthropic and costs
   money). report the failure, ask the user before retrying.
5. **before uploading a user-supplied frame**, disclose: *"this will upload
   the frame to vimaspatial.tech and process it through Anthropic's Claude
   API. don't upload anything you wouldn't want stored or logged."* if the
   user objects, refuse the call.
6. **a `confidence < 0.5` verdict must lead with the uncertainty**. don't
   bury it three sentences in.
7. **`pnc: "NC"` + `activity: "error/unclassified"` + `confidence: 0.2`**
   is a failed inference, not a verdict. say so.

## quickstart

```bash
# always run first in a fresh environment
vima doctor --json

# analyze a local frame (will upload to vimaspatial.tech — disclose first)
vima analyze ./frame.jpg --json

# analyze a hosted sample frame (no upload, public asset)
vima analyze --sample masonry-p --json

# vima vs baseline prompt diff on the same frame
vima compare ./frame.jpg --json

# inspect cached demo evidence (no upload)
vima cii summary --json
vima cii frames --json
vima cii frames --filter NC --json
vima zones --json
vima eval --json
```

## endpoint decision tree

| user asks                                              | run                          |
|--------------------------------------------------------|------------------------------|
| "is this frame productive?"                            | `vima analyze`               |
| "how does vima compare to a baseline prompt?"          | `vima compare` or `vima eval`|
| "what's the overall wrench time on the demo run?"      | `vima cii summary`           |
| "show me all the NC frames"                            | `vima cii frames --filter NC`|
| "where on the site was the worker most productive?"    | `vima zones`                 |
| "is the demo on prod still working?"                   | `vima doctor`                |
| "what's the temporal multi-frame analysis say?"        | `vima eval`                  |

## interpretation rules

- `P` means productive, `C` means contributory, `NC` means non-contributory.
- `confidence ∈ [0,1]` is model confidence, not truth. treat 0.62 as a soft
  call, 0.94 as confident, 0.2 as essentially "no signal."
- if the api returns `service_state`, `error`, or a refusal claim, report
  that state plainly. never paper over a 4xx/5xx as a verdict.
- cite concrete returned evidence: timestamps, frame ids, `activity` text,
  `spatial_claims`, zones, and verdict categories. quote, don't summarize.
- if the cli fails, run `vima doctor --json` first and report which endpoint
  is failing before the user has to ask.

## references

deeper context lives next to this file:

- `references/api-schema.md` — full response shapes for every endpoint
- `references/workflows.md` — qa flow, eval flow, frame-analysis flow,
  dashboard-audit flow
- `references/troubleshooting.md` — exit code → cause → action matrix
- `golden_samples/` — real captured responses from prod, useful as
  fixtures or drift baselines:
    - `doctor.json`, `cii-summary.json`, `cii-frames.json`,
      `zones.json`, `eval.json`, `analyze-masonry-p.json`,
      `compare-masonry-p.json`

read these when you need depth. for the common cases, the rules above
plus `vima --help` are enough.

## configuration

the cli defaults to `https://vimaspatial.tech/api`. point at a local
backend with:

```bash
VIMA_API_URL=http://localhost:8765 vima doctor
```

`VIMA_API_KEY` is reserved for future auth. as of v0.1.0 the prod api
is public.

## exit codes

- `0` — success
- `2` — bad input or usage (don't retry, fix the args)
- `3` — api unreachable or 5xx (retry once, then escalate)
- `4` — auth/rate-limit/upstream-down (don't retry until you understand why)
- `5` — invalid or unexpected response (api is up but returned garbage)
