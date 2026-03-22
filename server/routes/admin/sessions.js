/**
 * Routes admin - Sessions actives (liste, révocation)
 */
const router  = require('express').Router()
const queries = require('../../db/index')

router.get('/sessions', (req, res) => {
  try {
    const data = queries.getActiveSessions()
    res.json({ ok: true, data })
  } catch {
    res.json({ ok: true, data: [] })
  }
})

router.delete('/sessions/:id', (req, res) => {
  try {
    queries.revokeSession(Number(req.params.id))
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/sessions/revoke-user', (req, res) => {
  try {
    const { userId } = req.body
    queries.revokeUserSessions(Number(userId))
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
