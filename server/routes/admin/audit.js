/**
 * Routes admin — Journal d'audit
 */
const router = require('express').Router()

router.get('/audit', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()
    const { action, actor, from, to, page = 1, limit = 100 } = req.query
    const offset = ((Number(page) || 1) - 1) * (Number(limit) || 100)
    const params = []

    let sql = `SELECT * FROM audit_log WHERE 1=1`
    if (action) { sql += ` AND action = ?`;          params.push(action) }
    if (actor)  { sql += ` AND actor_name LIKE ?`;   params.push(`%${actor}%`) }
    if (from)   { sql += ` AND created_at >= ?`;     params.push(from) }
    if (to)     { sql += ` AND created_at <= ?`;     params.push(to) }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) AS total')
    const total = db.prepare(countSql).get(...params).total

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(Number(limit) || 100, offset)

    const entries = db.prepare(sql).all(...params)
    res.json({ ok: true, data: { entries, total, page: Number(page) || 1, limit: Number(limit) || 100 } })
  } catch (err) {
    // Table n'existe pas encore (avant migration v18) - renvoyer vide
    res.json({ ok: true, data: { entries: [], total: 0, page: 1, limit: 100 } })
  }
})

module.exports = router
