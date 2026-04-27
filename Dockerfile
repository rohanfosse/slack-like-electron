# ── Stage 1 : Build du frontend web ──────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts evite la compilation des modules natifs (Electron, better-sqlite3)
# qui ne sont pas necessaires pour le build Vite
RUN npm ci --ignore-scripts

COPY src/ ./src/
COPY vite.web.config.ts tsconfig.json tsconfig.node.json ./

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

# Cloudflare Turnstile (anti-spam booking public). Optionnel : si vide, le
# captcha n'est pas affiche cote front (et le backend n'impose pas la
# verification non plus, cf. server/.env.example).
ARG VITE_TURNSTILE_SITE_KEY=""
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}

RUN npx vite build --config vite.web.config.ts --mode production

# ── Stage 2 : Compilation des modules natifs ─────────────────────────────────
FROM node:22-alpine AS native

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild better-sqlite3 && \
    npm cache clean --force

# ── Stage 3 : Image de production (serveur uniquement) ──────────────────────
FROM node:22-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copier node_modules pre-compiles (sans les outils de build)
COPY --from=native /app/node_modules ./node_modules
COPY --from=native /app/package.json ./

# Copier le serveur + le frontend builde depuis le stage 1
COPY server/ ./server/
COPY src/landing/ ./src/landing/
COPY --from=build /app/dist-web/ ./dist-web/

RUN mkdir -p /data/db /data/uploads logs

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/db/cursus.db
ENV UPLOAD_DIR=/data/uploads

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]
