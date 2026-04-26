# vima-agent

portable cli and agent skill for the hosted vima spatial intelligence api.

until the package is published to pypi, run it from the repository subdirectory:

```bash
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima doctor
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima analyze --sample masonry-p --json
uvx --from "git+https://github.com/philip-chen6/vima.git#subdirectory=packages/vima-agent" vima skill install --agent auto
```

for a local checkout, install editable:

```bash
cd packages/vima-agent
python3 -m pip install -e .
vima doctor
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

`skill install --agent auto` writes into detected local agent skill roots. if no
known root exists, use `vima skill print --agent codex` and paste the markdown
into the target agent's skill system.

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
