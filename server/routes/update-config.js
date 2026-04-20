// ─── /api/update/config — Configuration des mises a jour (publique) ──────────
// Permet au client Electron de recuperer en amont de l'auto-updater :
//   - disabled    : desactive temporairement les mises a jour (kill switch)
//   - minVersion  : version minimum acceptable (force l'update sinon bloque le login)
//   - channel     : 'stable' | 'beta' (channel par defaut pour allowPrerelease)
//   - message     : message optionnel a afficher a l'utilisateur
//   - checkEveryMinutes : override de l'intervalle de verification
//
// Endpoint public (pas de JWT) car appele avant login, rate-limite par IP via
// le limiter global. La config est stockee dans app_config (cles : update_*).
//
// Admin only : cf. /api/admin/update-config pour la mise a jour.

const router = require('express').Router()
const { getAppConfig } = require('../db/models/admin')
const log = require('../utils/logger')

// Telemetrie d'adoption (anonyme) : recois {version, platform, channel}
// Cree la table au besoin et insere une ligne (anti-flood cote client).
const { getDb } = require('../db/connection')

let _telemetrySchemaReady = false
function ensureTelemetryTable() {
  if (_telemetrySchemaReady) return
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS update_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version    TEXT NOT NULL,
      platform   TEXT NOT NULL,
      channel    TEXT NOT NULL DEFAULT 'stable',
      client_hash TEXT,
      reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_update_telemetry_version ON update_telemetry(version);
    CREATE INDEX IF NOT EXISTS idx_update_telemetry_reported_at ON update_telemetry(reported_at);
  `)
  _telemetrySchemaReady = true
}

try { ensureTelemetryTable() } catch (err) {
  log.warn('update_telemetry_schema_failed', { error: err.message })
}

// ── GET /api/update/config ────────────────────────────────────────────────────
router.get('/config', (_req, res) => {
  try {
    const disabled       = getAppConfig('update_disabled') === '1'
    const minVersion     = getAppConfig('update_min_version') || null
    const channel        = getAppConfig('update_channel') || 'stable'
    const message        = getAppConfig('update_message') || null
    const checkEveryRaw  = getAppConfig('update_check_every_minutes')
    const checkEveryMinutes = checkEveryRaw ? Math.max(15, parseInt(checkEveryRaw, 10) || 240) : 240

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.json({
      ok: true,
      data: { disabled, minVersion, channel, message, checkEveryMinutes },
    })
  } catch (err) {
    log.error('update_config_read_failed', { error: err.message })
    // En cas d'erreur on renvoie la config par defaut pour ne jamais bloquer le client
    res.json({
      ok: true,
      data: { disabled: false, minVersion: null, channel: 'stable', message: null, checkEveryMinutes: 240 },
    })
  }
})

// ── POST /api/update/telemetry ────────────────────────────────────────────────
// Anonyme : on stocke version + platform. Hash client optionnel (anti-doublons).
router.post('/telemetry', (req, res) => {
  try {
    const version    = String(req.body?.version ?? '').substring(0, 32)
    const platform   = String(req.body?.platform ?? 'unknown').substring(0, 32)
    const channel    = String(req.body?.channel ?? 'stable').substring(0, 16)
    const clientHash = req.body?.clientHash ? String(req.body.clientHash).substring(0, 64) : null

    if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
      return res.status(400).json({ ok: false, error: 'version invalide' })
    }

    getDb().prepare(`
      INSERT INTO update_telemetry (version, platform, channel, client_hash)
      VALUES (?, ?, ?, ?)
    `).run(version, platform, channel, clientHash)

    res.json({ ok: true })
  } catch (err) {
    log.warn('update_telemetry_write_failed', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur interne' })
  }
})

module.exports = router
