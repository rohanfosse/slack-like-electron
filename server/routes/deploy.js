// ─── Webhook de deploiement - appele par GitHub Actions ──────────────────────
// Ecrit un fichier signal dans un volume partage. Un service systemd sur l'hote
// (cursus-deploy-watcher) detecte le fichier et lance le script de redeploy.
const router = require('express').Router()
const fs     = require('fs')
const path   = require('path')
const log    = require('../utils/logger')

const DEPLOY_SECRET = process.env.DEPLOY_SECRET
const SIGNAL_DIR    = '/deploy-signal'
const SIGNAL_FILE   = path.join(SIGNAL_DIR, 'trigger')

router.post('/', (req, res) => {
  const crypto = require('crypto')
  const secret = req.headers['x-deploy-secret'] || ''
  const secretBuf = Buffer.from(secret)
  const expectedBuf = Buffer.from(DEPLOY_SECRET || '')
  if (!DEPLOY_SECRET || !secret ||
      secretBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    log.warn('deploy_unauthorized', { ip: req.ip })
    return res.status(403).json({ ok: false, error: 'Acces non autorise.' })
  }

  try {
    fs.mkdirSync(SIGNAL_DIR, { recursive: true })
    fs.writeFileSync(SIGNAL_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      triggered_by: 'webhook',
    }) + '\n')
    log.info('deploy_signal_written')
    res.json({ ok: true, message: 'Deploiement declenche' })
  } catch (err) {
    log.error('deploy_signal_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Impossible de declencher le deploiement' })
  }
})

module.exports = router
