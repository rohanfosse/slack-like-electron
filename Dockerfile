# ── Image de production — serveur Cursus ─────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache tini python3 make g++

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild better-sqlite3 && \
    npm cache clean --force && \
    apk del python3 make g++

# Copier le serveur et le frontend pré-buildé
COPY server/ ./server/
COPY src/landing/ ./src/landing/
COPY dist-web/ ./dist-web/

RUN mkdir -p /data/db /data/uploads logs

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/db/cesi-classroom.db
ENV UPLOAD_DIR=/data/uploads

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]
