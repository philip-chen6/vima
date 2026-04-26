# vima

use this skill when a user asks an agent to inspect, classify, verify, qa, or
reason about construction-site frames with vima spatial intelligence.

vima is an evidence-first spatial api. do not invent construction claims from
vibes. call the cli, read the returned json, and cite frame ids, timestamps,
verdicts, confidence, and refusal/error states directly.

## commands

run a health check first when the environment is new:

```bash
vima doctor --json
```

analyze a local frame:

```bash
vima analyze ./frame.jpg --json
```

analyze a bundled public sample:

```bash
vima analyze --sample masonry-p --json
```

compare vima scaffolded output against the baseline prompt:

```bash
vima compare ./frame.jpg --json
```

inspect cached demo evidence:

```bash
vima cii summary --json
vima cii frames --json
vima zones --json
vima eval --json
```

## interpretation rules

- `P` means productive, `C` means contributory, and `NC` means non-contributory
  or not confidently productive.
- treat `confidence` as model confidence, not truth.
- if the api returns `service_state`, `error`, or a refusal claim, report that
  state plainly.
- never upgrade an ambiguous or refused claim into a confident claim.
- cite the concrete returned evidence: timestamps, frame ids, activity text,
  spatial claims, zones, and verdict colors/categories.
- if the cli fails, run `vima doctor --json` and report the failing endpoint.

## configuration

the cli uses `https://vimaspatial.tech/api` by default.

```bash
export VIMA_API_URL=https://vimaspatial.tech/api
export VIMA_API_KEY=optional-future-key
```
