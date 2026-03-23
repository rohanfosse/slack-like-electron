// ─── Webhook de déploiement - appelé par GitHub Actions ──────────────────────
const router = require('express').Router()
const { exec } = require('child_process')
const path    = require('path')

const DEPLOY_SECRET = process.env.DEPLOY_SECRET
const COMPOSE_DIR   = process.env.COMPOSE_DIR ?? path.join(__dirname, '../..')

router.post('/', (req, res) => {
  const secret = req.headers['x-deploy-secret']
  if (!DEPLOY_SECRET || secret !== DEPLOY_SECRET) {
    console.warn('[Deploy] Tentative non autorisée depuis', req.ip)
    return res.status(403).json({ ok: false, error: 'Unauthorized' })
  }

  console.log('[Deploy] Déploiement déclenché par webhook...')
  res.json({ ok: true, message: 'Déploiement en cours...' })

  // Pull la nouvelle image puis recrée les conteneurs en tâche de fond
  exec(
    'docker compose pull && docker compose up -d --force-recreate && docker image prune -f',
    { cwd: COMPOSE_DIR, timeout: 300_000 },
  ).unref()
  console.log('[Deploy] docker compose pull + up planifié...')
})

module.exports = router
