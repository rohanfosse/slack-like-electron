// ─── Routes administration ────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../../src/db/index')

// POST /api/admin/reset-seed
router.post('/reset-seed', (req, res) => {
  try {
    queries.resetAndSeed()
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
