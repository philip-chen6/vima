# vima-agent

portable cli and agent skill for the hosted vima spatial intelligence api.

```bash
uvx vima-agent@latest doctor
uvx vima-agent@latest analyze --sample masonry-p --json
uvx vima-agent@latest skill install --agent auto
```

the cli is intentionally thin. it talks to `https://vimaspatial.tech/api` by
default and does not import the local backend pipeline, model clients, sam,
depth, colmap, or video tooling.

## commands

```bash
vima doctor
vima analyze ./frame.jpg
vima analyze --sample masonry-p --json
vima compare ./frame.jpg --json
vima cii summary --json
vima cii frames --filter P --json
vima zones --json
vima eval --json
vima skill print --agent codex
vima skill install --agent auto
```

## configuration

```bash
export VIMA_API_URL=https://vimaspatial.tech/api
export VIMA_API_KEY=optional-future-key
```

local backend development can point at the fastapi server directly:

```bash
VIMA_API_URL=http://localhost:8765 vima doctor
```

## exit codes

- `0`: success
- `2`: bad input or usage
- `3`: api unavailable
- `4`: auth/rate-limit style refusal
- `5`: invalid or unexpected api response

