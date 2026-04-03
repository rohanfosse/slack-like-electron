# Deploiement Cursus

> Guide de deploiement pour le pilote CESI (septembre 2026).

## Prerequis

- Docker + Docker Compose
- Nom de domaine + certificat TLS (Let's Encrypt via reverse proxy)
- 1 vCPU, 1 Go RAM, 10 Go disque minimum

## Variables d'environnement

Creer un fichier `.env` a la racine :

```env
JWT_SECRET=<chaine aleatoire 32+ caracteres>
VITE_SERVER_URL=https://app.cursus.school
CORS_ORIGIN=https://app.cursus.school
DEPLOY_SECRET=<secret pour le webhook CI/CD>
BACKUP_DIR=/data/backups
```

> Ne jamais committer `.env`. Generer le JWT_SECRET avec `openssl rand -base64 48`.

## Deploiement initial

```bash
# Cloner le repo
git clone https://github.com/rohanfosse/cursus.git
cd cursus

# Copier et configurer .env
cp .env.example .env
nano .env

# Lancer
docker compose up -d

# Verifier
curl http://localhost:3001/health
```

Le premier demarrage :
- Cree la base SQLite dans `/data/db/cursus.db`
- Applique toutes les migrations automatiquement (`initSchema()`)
- Cree le compte admin par defaut (rfosse@cesi.fr)
- Demarre le scheduler (messages programmes + publication devoirs)
- Demarre le backup quotidien (premiere sauvegarde apres 5min)

## Architecture Docker

```
┌─────────────────────────────────────────┐
│ cursus-server (Node.js 22 Alpine)       │
│                                         │
│  Express (port 3001)                    │
│  ├── API REST /api/*                    │
│  ├── Socket.io (WebSocket)              │
│  ├── Frontend Vue 3 (dist-web/)         │
│  └── Landing page (src/landing/)        │
│                                         │
│  SQLite (WAL mode, busy_timeout=5s)     │
│  Scheduler (30s tick)                   │
│  Backup quotidien (VACUUM INTO)         │
│                                         │
│  Volumes :                              │
│   /data/db/       → cursus-db           │
│   /data/uploads/  → cursus-uploads      │
│   /deploy-signal/ → deploy-signal       │
└─────────────────────────────────────────┘
```

## Mise a jour (zero-downtime)

Le pipeline CI/CD (`.github/workflows/test.yml`) :
1. Tests unitaires (2564 tests)
2. E2E Playwright (19 tests)
3. Build Docker + push vers GHCR
4. Webhook `/webhook/deploy` declenche le redeploy

Sur le serveur, le watcher systemd :
```bash
# /etc/systemd/system/cursus-deploy-watcher.service
# Detecte /deploy-signal/trigger et lance le script
docker compose pull && docker compose up -d
```

Le serveur notifie les clients via `server:maintenance` avant l'arret (drain 10s).

## Backup et restauration

### Backup automatique
- Toutes les 24h via `VACUUM INTO` (copie propre de la DB)
- 7 dernieres sauvegardes conservees dans `BACKUP_DIR`
- Premier backup 5min apres le demarrage

### Restauration manuelle
```bash
# Arreter le serveur
docker compose stop

# Lister les backups
ls /data/backups/

# Restaurer
cp /data/backups/cursus-2026-09-15T08-00-00.db /data/db/cursus.db

# Redemarrer
docker compose up -d
```

### Restauration automatique
Si la DB est corrompue au demarrage (`PRAGMA integrity_check` echoue) :
- Le serveur tente de restaurer automatiquement depuis le dernier backup
- Le fichier corrompu est deplace en `.corrupted`
- Si aucun backup disponible, le serveur demarre en mode degrade

## Monitoring

### Health check
```bash
curl http://localhost:3001/health
```
Retourne : version, uptime, connexions, memoire, disque.

### Logs
```bash
# Logs du conteneur
docker compose logs -f --tail 100

# Logs structures (JSON)
cat logs/cursus.log | jq .
```

### Alertes recommandees
- Health check HTTP 503 → alerte immediate
- Memoire > 250 Mo → warning (limit PM2 = 300 Mo)
- Disk > 80% → warning

## Securite

| Mesure | Status |
|--------|--------|
| JWT 7j + refresh proactif 6h | Active |
| Rate limit global 300 req/min/IP | Active |
| Rate limit auth 20 req/min/IP | Active |
| Rate limit mutations 60/min/user | Active |
| CORS strict (origin unique) | Active |
| CSP + HSTS + X-Frame-Options | Active |
| Upload : 50 Mo max, extensions bloquees | Active |
| DOMPurify sur tous les messages | Active |
| Ownership checks sur toutes les mutations | Active |

## Checklist pre-pilote

- [ ] `.env` configure avec JWT_SECRET fort
- [ ] Reverse proxy HTTPS (nginx/Caddy) devant le port 3001
- [ ] DNS A record pointe vers le serveur
- [ ] Backup dir monte et accessible
- [ ] Health check accessible depuis le monitoring
- [ ] Compte admin mot de passe change (defaut = `admin`)
- [ ] Premier etudiant inscrit, teste le login
- [ ] Test envoi message + depot fichier
- [ ] Verifier les logs : `docker compose logs --tail 50`
