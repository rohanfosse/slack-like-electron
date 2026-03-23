// ─── Webhook de deploiement - appele par GitHub Actions ──────────────────────
// Ecrit un fichier signal dans un volume partage. Un service systemd sur l'hote
// (cursus-deploy-watcher) detecte le fichier et lance le script de redeploy.
const router = require('express').Router()
const fs     = require('fs')
const path   = require('path')

const DEPLOY_SECRET = process.env.DEPLOY_SECRET
const SIGNAL_DIR    = '/deploy-signal'
const SIGNAL_FILE   = path.join(SIGNAL_DIR, 'trigger')

router.post('/', (req, res) => {
  const secret = req.headers['x-deploy-secret']
  if (!DEPLOY_SECRET || secret !== DEPLOY_SECRET) {
    console.warn('[Deploy] Tentative non autorisee depuis', req.ip)
    return res.status(403).json({ ok: false, error: 'Unauthorized' })
  }

  try {
    fs.mkdirSync(SIGNAL_DIR, { recursive: true })
    fs.writeFileSync(SIGNAL_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      triggered_by: 'webhook',
    }) + '\n')
    console.log('[Deploy] Signal ecrit, en attente du watcher hote...')
    res.json({ ok: true, message: 'Deploiement declenche' })
  } catch (err) {
    console.error('[Deploy] Erreur ecriture signal:', err.message)
    res.status(500).json({ ok: false, error: 'Impossible de declencher le deploiement' })
  }
})

module.exports = router
