/**
 * Routes admin — Statistiques applicatives et heatmap
 */
const router  = require('express').Router()
const queries = require('../../db/index')

router.get('/stats', (req, res) => {
  try {
    const stats = queries.getAdminStats()
    res.json({ ok: true, data: stats })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/heatmap', (req, res) => {
  try {
    const data = queries.getActivityHeatmap()
    res.json({ ok: true, data })
  } catch {
    res.json({ ok: true, data: [] })
  }
})

module.exports = router
