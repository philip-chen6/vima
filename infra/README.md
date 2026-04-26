# vima infra

production deployment lives on a vultr VPS, fronted by caddy (auto-TLS), running next.js + fastapi via docker compose.

## the box

- **provider**: vultr
- **plan**: vhf-1c-2gb (1 vCPU high-frequency, 2 GB RAM, 64 GB SSD)
- **region**: lax
- **os**: ubuntu 24.04 LTS
- **public IP**: `45.76.77.107`
- **instance ID**: `3b10e830-f275-445c-91f9-74c6af6a9bf6`
- **firewall group**: `1cf3879c-45bf-404f-b78e-e7593388c4c0` (allows 22/80/443)
- **ssh**: `ssh root@45.76.77.107` (uses `~/.ssh/id_ed25519`)

## services

| service  | image                      | port (internal) | role                        |
|----------|----------------------------|-----------------|-----------------------------|
| caddy    | `caddy:2-alpine`           | 80, 443         | TLS + reverse proxy         |
| frontend | next.js + bun              | 3000            | landing + dashboard SSR     |
| backend  | fastapi + uvicorn          | 8765            | CII judge, spatial endpoints |
| mcp      | fastmcp + stdlib urllib    | 8766            | remote agent tool endpoint  |

caddy routes `/api/*` → `backend:8765` (strips `/api`), `/mcp*` → `mcp:8766`, everything else → `frontend:3000`.

## first-time setup on a fresh box

```bash
ssh root@45.76.77.107
mkdir -p /opt/vima
git clone https://github.com/philip-chen6/vinna.git /opt/vima
cd /opt/vima

# create .env from example, fill in ANTHROPIC_API_KEY + VIMA_DOMAIN
cp .env.example .env
nano .env

cd infra
docker compose --env-file ../.env build --parallel
docker compose --env-file ../.env up -d
```

## deploys

**automatic** (preferred): push to `main` → `.github/workflows/deploy.yml` SSHes in and rebuilds.

required github secrets:
- `DEPLOY_HOST` = `45.76.77.107`
- `DEPLOY_SSH_KEY` = contents of a private key whose public side is in `~/.ssh/authorized_keys` on the box

**manual**:
```bash
./infra/deploy.sh         # uses default IP
./infra/deploy.sh 1.2.3.4 # override
```

## domain + TLS

1. register a `.tech` domain (e.g. `vima.tech`)
2. add an `A` record: `vima.tech` → `45.76.77.107` (and `www.vima.tech` if you want)
3. set `VIMA_DOMAIN=vima.tech` in `/opt/vima/.env` on the box
4. `docker compose --env-file ../.env up -d caddy` to reload — caddy pulls a letsencrypt cert automatically once DNS resolves

before DNS propagates, the bare-IP fallback `:80` block in `Caddyfile` keeps the site reachable at `http://45.76.77.107`.

## ops cheatsheet

```bash
# tail logs
ssh root@45.76.77.107 'cd /opt/vima/infra && docker compose logs -f --tail=100'

# tail one service
ssh root@45.76.77.107 'cd /opt/vima/infra && docker compose logs -f backend'

# check mcp endpoint
curl -sf https://vimaspatial.tech/mcp
curl -sf https://vimaspatial.tech/mcp/health

# restart everything
ssh root@45.76.77.107 'cd /opt/vima/infra && docker compose --env-file ../.env up -d --force-recreate'

# disk check (vps fills up fast w/ docker layers)
ssh root@45.76.77.107 'df -h / && docker system df'

# nuke unused docker stuff
ssh root@45.76.77.107 'docker system prune -af --volumes'
```

## why these choices

- **caddy over nginx** — auto-TLS, simpler config, one less moving piece for the hackathon
- **bun over node** — faster install/build, matches the dev environment
- **single-box compose** — vima isn't web-scale; one box is simpler than k8s/swarm and cheaper than managed
- **vhf plan** — better single-thread cpu than vc2; next.js SSR likes that
- **no gpu** — backend calls anthropic API, no local inference. add a separate gpu worker only if live COLMAP/inference becomes needed
- **mcp as a thin wrapper** — the hosted mcp server only forwards to the existing api, so the 2 GB box does not run torch, transformers, or reconstruction code
