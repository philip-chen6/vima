#!/bin/bash
# manual deploy to the vultr vps
# usage: ./infra/deploy.sh [server-ip]
# defaults to the vima-prod box

set -e

SERVER=${1:-45.76.77.107}

echo "deploying vima to root@$SERVER..."

# sync repo (excluding heavy dirs)
rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude .gstack \
  --exclude '/paper/build' \
  --exclude '/proof' \
  --exclude '/demo' \
  ../ root@$SERVER:/opt/vima/

# build + restart on server
ssh root@$SERVER 'bash -s' << 'EOF'
  set -e
  cd /opt/vima/infra
  if [ ! -f ../.env ]; then
    echo "WARN: /opt/vima/.env missing — backend will fail to call anthropic"
  fi
  docker compose --env-file ../.env build --parallel
  docker compose --env-file ../.env up -d --remove-orphans

  echo "waiting for backend health..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:8765/health > /dev/null 2>&1; then
      echo "backend ok"
      break
    fi
    sleep 2
  done

  docker system prune -af --volumes 2>/dev/null || true
  docker builder prune -af 2>/dev/null || true
EOF

echo "done. http://$SERVER (and https://your-domain once DNS resolves)"
