/**
 * Routes admin - Modération de contenu (messages, canaux, signalements)
 */
const router  = require('express').Router()
const queries = require('../../db/index')

// ── Messages ────────────────────────────────────────────────────────────────

router.get('/messages', (req, res) => {
  try {
    const { search, promo_id, channel_id, author, from, to, page, limit } = req.query
    const data = queries.getAdminMessages({
      search, promo_id: promo_id ? Number(promo_id) : null,
      channel_id: channel_id ? Number(channel_id) : null,
      author, from, to, page: Number(page) || 1, limit: Number(limit) || 50,
    })
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/messages/:id', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()
    const id = Number(req.params.id)
    const msg = db.prepare('SELECT id, content, author_name, channel_id FROM messages WHERE id = ?').get(id)
    if (!msg) return res.status(404).json({ ok: false, error: 'Message introuvable.' })
    db.prepare('DELETE FROM messages WHERE id = ?').run(id)

    // Log audit si la table existe
    try {
      db.prepare(`
        INSERT INTO audit_log (actor_id, actor_name, actor_type, action, target, details, ip)
        VALUES (?, ?, ?, 'message.delete', ?, ?, ?)
      `).run(
        Math.abs(req.user.id), req.user.name, req.user.type,
        `message:${id}`,
        JSON.stringify({ content: msg.content.substring(0, 200), author: msg.author_name, reason: req.body?.reason || '' }),
        req.ip
      )
    } catch {}

    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/channels', (req, res) => {
  try {
    const data = queries.getAdminChannels()
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ── Signalements ────────────────────────────────────────────────────────────

router.get('/reports', (req, res) => {
  try {
    const { status, page, limit } = req.query
    const data = queries.getReports({
      status: status || null, page: Number(page) || 1, limit: Number(limit) || 50,
    })
    data.pendingCount = queries.getPendingReportsCount()
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/reports/:id/resolve', (req, res) => {
  try {
    const { status } = req.body // 'reviewed' or 'dismissed'
    queries.resolveReport(Number(req.params.id), status || 'reviewed', req.user.name)
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
