#!/bin/bash
# ─── Script de deploiement Cursus ──────────────────────────────────────────────
# Appele par le service systemd cursus-deploy-watcher quand le signal est detecte.
# Usage: ./scripts/deploy.sh
set -euo pipefail

APP_DIR="/opt/cursus"
COMPOSE="docker compose"

echo "[Deploy] $(date '+%F %T') - Deploiement en cours..."

cd "$APP_DIR"

# 1. Pull la derniere image depuis GHCR
echo "[Deploy] Pull de l'image..."
$COMPOSE pull

# 2. Redemarrer le conteneur avec la nouvelle image
echo "[Deploy] Redemarrage du conteneur..."
$COMPOSE up -d --force-recreate --remove-orphans

# 3. Nettoyage Docker (images dangling, build cache, conteneurs arretes)
echo "[Deploy] Nettoyage Docker..."
docker image prune -f
docker container prune -f
docker builder prune -f --keep-storage=500MB

# 4. Nettoyage des vieux logs Docker (> 7 jours, > 50 MB)
CONTAINER_ID=$(docker ps -q --filter "name=cursus-server")
if [ -n "$CONTAINER_ID" ]; then
  LOG_FILE=$(docker inspect --format='{{.LogPath}}' "$CONTAINER_ID" 2>/dev/null || true)
  if [ -n "$LOG_FILE" ] && [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$LOG_SIZE" -gt 52428800 ]; then
      echo "[Deploy] Troncature du log Docker ($((LOG_SIZE / 1048576)) MB)..."
      truncate -s 0 "$LOG_FILE"
    fi
  fi
fi

# 5. Nettoyage systeme (apt cache, journald)
sudo apt-get clean 2>/dev/null || true
sudo journalctl --vacuum-time=7d --vacuum-size=50M 2>/dev/null || true

# 6. Health check
echo "[Deploy] Verification sante..."
for i in $(seq 1 12); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || true)
  if [ "$STATUS" = "200" ]; then
    echo "[Deploy] Serveur OK apres $((i * 5))s"
    break
  fi
  sleep 5
done

echo "[Deploy] $(date '+%F %T') - Deploiement termine."
