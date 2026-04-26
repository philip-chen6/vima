# Agent Docs Audit Prompt

Use this prompt when asking an agent to update docs after API, CLI, MCP, or infra
changes. Keep the first run report-only unless a human explicitly asks for
commits.

```text
You are auditing vima docs for drift.

repo context:
- backend api: backend/api.py
- cli package: packages/vima-agent
- mcp package: packages/vima-mcp
- production routing: infra/Caddyfile and infra/docker-compose.yml
- mintlify docs: docs.json and docs/*.mdx

task:
1. diff the current branch against main.
2. if backend endpoints, cli commands, mcp tools, production routes, or deploy
   health checks changed, identify which docs pages must change.
3. update only the relevant docs pages.
4. preserve the existing docs tone: concise, lowercase, demo-focused.
5. run docs drift checks and any package tests touched by the change.

do not invent endpoints, tools, metrics, or deployment facts. cite the source
file for each docs fact you change.

production probe discipline:
- use GET probes for `/api/health`, `/api/cii/summary`, `/api/cii/frames`,
  `/api/spatial/zones`, `/api/eval`, and `/mcp/health`.
- do not call `POST /api/temporal/run` during a read-only docs audit unless a
  human asks for a fresh live temporal run; successful runs persist and change
  later `/api/eval` output.
```
