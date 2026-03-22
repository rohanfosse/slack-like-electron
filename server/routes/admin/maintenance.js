/**
 * Routes admin - Maintenance (nettoyage, backups, purge, seed reset, infos DB)
 */
const router  = require('express').Router()
const queries = require('../../db/index')
const fs      = require('fs')
const path    = require('path')

const ROOT = path.join(__dirname, '../../..')

router.post('/reset-seed', (req, res) => {
  try {
    queries.resetAndSeed()
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/backup', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()
    const backupDir = path.join(ROOT, 'backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`)
    db.backup(backupPath)

    const size = fs.statSync(backupPath).size
    res.json({ ok: true, data: { filename: path.basename(backupPath), size } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/backups', (req, res) => {
  try {
    const backupDir = path.join(ROOT, 'backups')
    if (!fs.existsSync(backupDir)) return res.json({ ok: true, data: [] })

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f))
        return { filename: f, size: stat.size, created: stat.mtime.toISOString() }
      })
      .sort((a, b) => b.created.localeCompare(a.created))

    res.json({ ok: true, data: files })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/backups/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename) // sanitize
    const filePath = path.join(ROOT, 'backups', filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'Fichier introuvable.' })
    fs.unlinkSync(filePath)
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/db-info', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name
    `).all()

    const info = tables.map(t => {
      const count = db.prepare(`SELECT COUNT(*) AS count FROM "${t.name}"`).get().count
      return { name: t.name, rowCount: count }
    })

    res.json({ ok: true, data: info })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/cleanup-logs', (req, res) => {
  try {
    const logsDir = path.join(ROOT, 'logs')
    if (!fs.existsSync(logsDir)) return res.json({ ok: true, data: { deleted: 0 } })

    let deleted = 0
    fs.readdirSync(logsDir).forEach(f => {
      const fp = path.join(logsDir, f)
      try { fs.unlinkSync(fp); deleted++ } catch {}
    })

    res.json({ ok: true, data: { deleted } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/purge', (req, res) => {
  try {
    const { auditDays, loginDays, sessionDays } = req.body
    const data = queries.purgeOldData({
      auditDays: Number(auditDays) || 90,
      loginDays: Number(loginDays) || 30,
      sessionDays: Number(sessionDays) || 30,
    })
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
