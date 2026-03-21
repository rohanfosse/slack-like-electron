/**
 * Routes admin — Annonces planifiées (CRUD)
 */
const router  = require('express').Router()
const queries = require('../../db/index')

router.get('/scheduled', (req, res) => {
  try {
    const data = queries.getScheduledMessages()
    res.json({ ok: true, data })
  } catch {
    res.json({ ok: true, data: [] })
  }
})

router.post('/scheduled', (req, res) => {
  try {
    const { channelId, content, sendAt } = req.body
    if (!channelId || !content || !sendAt) {
      return res.status(400).json({ ok: false, error: 'channelId, content et sendAt requis.' })
    }
    queries.createScheduledMessage({
      channelId: Number(channelId),
      authorName: req.user.name,
      authorType: req.user.type,
      content,
      sendAt,
    })
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.delete('/scheduled/:id', (req, res) => {
  try {
    queries.deleteScheduledMessage(Number(req.params.id))
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
