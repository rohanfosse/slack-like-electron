#!/bin/bash
# ── Script de déploiement Cursus sur VPS Hostinger ──────────────────────────
# Usage : curl -sSL <url-du-script> | bash
# Ou     : chmod +x setup-vps.sh && ./setup-vps.sh
set -euo pipefail

DOMAIN="cursus.school"
APP_DIR="/opt/cursus"
REPO="https://github.com/rohanfosse/slack-like-electron.git"

echo "══════════════════════════════════════════════════════"
echo "  Déploiement de Cursus sur ${DOMAIN}"
echo "══════════════════════════════════════════════════════"

# ── 1. Mise à jour système ──────────────────────────────────────────────────
echo "[1/7] Mise à jour du système..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Installation des dépendances ────────────────────────────────────────
echo "[2/7] Installation de Docker, Nginx, Certbot, Git..."
apt-get install -y -qq \
  ca-certificates curl gnupg lsb-release \
  nginx certbot python3-certbot-nginx git ufw

# Docker (si pas déjà installé)
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

# Docker Compose plugin
if ! docker compose version &> /dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi

# ── 3. Firewall ────────────────────────────────────────────────────────────
echo "[3/7] Configuration du firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 4. Cloner le projet ───────────────────────────────────────────────────
echo "[4/7] Clonage du projet..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Configuration .env ─────────────────────────────────────────────────
echo "[5/7] Configuration de l'environnement..."
if [ ! -f .env ]; then
  cp deploy/.env.production .env
  # Générer un JWT_SECRET aléatoire
  JWT=$(openssl rand -base64 48)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
  echo "  → .env créé avec un JWT_SECRET généré automatiquement"
  echo "  → Vérifie le fichier .env si besoin : nano ${APP_DIR}/.env"
else
  echo "  → .env existe déjà, pas de modification"
fi

# ── 6. Nginx + SSL ────────────────────────────────────────────────────────
echo "[6/7] Configuration Nginx + SSL Let's Encrypt..."

# Copier la config nginx (sans SSL d'abord pour obtenir le certificat)
cat > /etc/nginx/sites-available/cursus <<'NGINX'
server {
    listen 80;
    server_name cursus.school www.cursus.school;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    client_max_body_size 50M;
}
NGINX

mkdir -p /var/www/certbot
ln -sf /etc/nginx/sites-available/cursus /etc/nginx/sites-enabled/cursus
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Obtenir le certificat SSL
echo "  → Obtention du certificat SSL..."
echo "  → IMPORTANT : le domaine ${DOMAIN} doit pointer vers cette IP avant cette étape !"
read -p "  → Le DNS est configuré ? (o/n) " dns_ok
if [ "$dns_ok" = "o" ] || [ "$dns_ok" = "O" ]; then
  certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
  echo "  → SSL activé !"
else
  echo "  → SSL ignoré. Lance plus tard : certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

# ── 7. Build et lancement Docker ──────────────────────────────────────────
echo "[7/7] Build et lancement de Cursus..."
cd "$APP_DIR"

# Charger les variables d'env pour le build
export $(grep -v '^#' .env | xargs)

docker compose build --build-arg VITE_SERVER_URL=https://${DOMAIN}
docker compose up -d

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Cursus déployé avec succès !"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  URL : https://${DOMAIN}"
echo "  Logs : docker compose -f ${APP_DIR}/docker-compose.yml logs -f"
echo "  Statut : docker compose -f ${APP_DIR}/docker-compose.yml ps"
echo ""
echo "  Commandes utiles :"
echo "    Redémarrer : cd ${APP_DIR} && docker compose restart"
echo "    Mettre à jour : cd ${APP_DIR} && git pull && docker compose up -d --build"
echo "    Voir les logs : cd ${APP_DIR} && docker compose logs -f"
echo ""
