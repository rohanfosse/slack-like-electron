/**
 * Routes admin — Sécurité (tentatives de connexion, brute force)
 */
const router = require('express').Router()

router.get('/security', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()

    const recentLogins = db.prepare(`
      SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT 50
    `).all()

    const failedByEmail = db.prepare(`
      SELECT email, COUNT(*) AS fail_count
      FROM login_attempts
      WHERE success = 0 AND created_at >= datetime('now', '-1 day')
      GROUP BY email ORDER BY fail_count DESC LIMIT 20
    `).all()

    res.json({ ok: true, data: { recentLogins, failedByEmail } })
  } catch {
    // Table n'existe pas encore - renvoyer vide
    res.json({ ok: true, data: { recentLogins: [], failedByEmail: [] } })
  }
})

module.exports = router
