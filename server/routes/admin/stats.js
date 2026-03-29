/**
 * Routes admin - Statistiques applicatives et heatmap
 */
const router  = require('express').Router()
const queries = require('../../db/index')
const { getDb } = require('../../db/connection')
const { isSystemAdmin } = require('../../permissions')

router.get('/stats', (req, res) => {
  try {
    // Enseignant non-admin : filtrer par ses promos
    let promoIds = null
    if (!isSystemAdmin(req.user?.type)) {
      const teacherId = Math.abs(req.user.id)
      promoIds = getDb()
        .prepare('SELECT promo_id FROM teacher_promos WHERE teacher_id = ?')
        .all(teacherId)
        .map(r => r.promo_id)
    }
    const stats = queries.getAdminStats(promoIds)
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

router.get('/visits', (req, res) => {
  try {
    const data = queries.getVisitStats()
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
