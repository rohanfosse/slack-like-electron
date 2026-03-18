// ─── Webhook de déploiement — appelé par GitHub Actions ──────────────────────
const router = require('express').Router()
const { exec } = require('child_process')
const path    = require('path')

const DEPLOY_SECRET = process.env.DEPLOY_SECRET
const ROOT_DIR      = path.join(__dirname, '../..')

router.post('/', (req, res) => {
  const secret = req.headers['x-deploy-secret']
  if (!DEPLOY_SECRET || secret !== DEPLOY_SECRET) {
    console.warn('[Deploy] Tentative non autorisée depuis', req.ip)
    return res.status(403).json({ ok: false, error: 'Unauthorized' })
  }

  console.log('[Deploy] Déploiement déclenché par webhook...')
  res.json({ ok: true, message: 'Déploiement en cours...' })

  // Exécuté en arrière-plan après la réponse
  const cmd = [
    `cd ${ROOT_DIR}`,
    'git fetch origin main',
    'git reset --hard origin/main',
    'npm install --omit=dev --ignore-scripts 2>&1 | tail -3',
    'pm2 restart ceslack-server',
  ].join(' && ')

  exec(cmd, { timeout: 120_000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Deploy] Erreur :', err.message)
      console.error('[Deploy] Stderr :', stderr?.slice(0, 500))
    } else {
      console.log('[Deploy] Succès :', stdout?.slice(-300) || 'OK')
    }
  })
})

module.exports = router
