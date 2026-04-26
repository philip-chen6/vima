# vima agent workflows

Concrete recipes for the four most common ways an agent uses vima.

## 1. QA flow — verify a frame's verdict matches reality

Use when a user shows you a frame and asks "is this productive?" or "did
the system get this right?"

```bash
# Step 1: confirm the api is alive
vima doctor --json

# Step 2: get the verdict from the judge
vima analyze ./suspect-frame.jpg --json
```

Now read the response with these rules:

1. `pnc` is the verdict. Quote it directly: "vima classified this as P
   (productive) with confidence 0.94".
2. `activity` is a short label. Cite it but don't paraphrase it as the
   verdict — `activity: "laying mortar"` does not mean P automatically.
3. `spatial_claims` are the model's grounding. If the user disputes the
   verdict, walk through the claims one by one — "the model saw a
   scaffold at 1.5m and a guardrail absent at the top edge."
4. If `confidence < 0.5`, lead with that uncertainty. Don't bury it.
5. If `pnc == "NC"` and `activity == "error/unclassified"` and
   `confidence == 0.2`, the inference failed. Tell the user, don't
   pretend it's a verdict.

## 2. Eval flow — compare vima vs baseline on the demo set

Use when a user asks "how much better is vima than just-throw-the-frame-
at-claude?"

```bash
vima eval --json
```

Read the response shape:

- `baseline.per_frame_claims` — what a one-frame-at-a-time prompt
  produced. The hallmark of failure is claims that try to describe
  *change* without access to a prior frame ("appears to be ongoing
  work", "previous frame not available").
- `vima.claims` — multi-frame state-change claims with `evidence`
  pointing to specific frame pairs.

Cite specific frame indices and quote claims. Do not summarize as
"vima is better" without numbers — report `baseline.elapsed_s` vs
`vima.elapsed_s` and contrast at least two specific claims.

## 3. Frame analysis flow — analyzing user-uploaded imagery

```bash
vima analyze ./user-frame.jpg --json
# or
vima analyze https://example.com/frame.jpg --json
```

⚠️ **PRIVACY NOTE — REQUIRED DISCLOSURE:**

When the user passes a local file, the CLI uploads its bytes to
`https://vimaspatial.tech/api/analyze/frame`. Before calling the CLI on
a user-supplied frame, tell the user:

> "This will upload the frame to vimaspatial.tech for analysis. The
> file is processed by Anthropic's Claude API on the backend. Don't
> upload anything you wouldn't want stored or logged."

If the user objects, refuse the call. Don't try to work around it.

## 4. Dashboard audit flow — sanity-check the live demo

Use when the user asks "is the demo on prod still working?" or before
linking someone to vimaspatial.tech.

```bash
vima doctor --json
vima cii summary --json
vima zones --json
```

Compare against the golden samples in `golden_samples/`. Flag deltas:

- `total_frames` should be 30 — anything else means a partial run shipped
- `wrench_time_pct` should be ~86.7 — large drift means the eval cache
  was clobbered
- `model` should be `claude-sonnet-4-6` — different model = different
  numbers, don't compare across runs
- `spatial_efficiency` should be ~0.87 — drift > 0.1 is suspicious

Don't auto-fix anything. Report what's drifted and let the user decide.

## comparing prompts (ablation use case)

```bash
vima compare ./frame.jpg --json
```

Returns `{ image, vima, baseline }`. Useful for "did the spatial-grounding
context actually help?" — compare `vima.spatial_claims` (often grounded
in real distances) against `baseline.spatial_claims` (often vague). The
top-level `image.filename` lets you cite which frame you ablated.
