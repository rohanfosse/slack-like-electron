/**
 * Routes admin — Feedback utilisateurs (CRUD, stats)
 */
const router  = require('express').Router()
const queries = require('../../db/index')

// Soumettre un feedback (accessible à tous les utilisateurs connectés)
router.post('/feedback', (req, res) => {
  try {
    const { type, title, description } = req.body
    if (!title?.trim()) return res.status(400).json({ ok: false, error: 'Le titre est requis.' })
    if (!['bug', 'improvement', 'question'].includes(type)) return res.status(400).json({ ok: false, error: 'Type invalide.' })
    const id = queries.createFeedback({
      userId: Math.abs(req.user.id),
      userName: req.user.name,
      userType: req.user.type,
      type, title: title.trim(), description: (description || '').trim(),
    })
    res.json({ ok: true, data: { id } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Lister les feedbacks (admin)
router.get('/feedback', (req, res) => {
  try {
    const { status, type, limit, offset } = req.query
    const data = queries.getFeedbackList({
      status: status || null,
      type: type || null,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    })
    const stats = queries.getFeedbackStats()
    res.json({ ok: true, data: { ...data, stats } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Mes feedbacks (utilisateur connecté)
router.get('/feedback/mine', (req, res) => {
  try {
    const data = queries.getUserFeedback(Math.abs(req.user.id))
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Stats feedback
router.get('/feedback/stats', (req, res) => {
  try {
    const data = queries.getFeedbackStats()
    res.json({ ok: true, data })
  } catch (err) {
    res.json({ ok: true, data: { open: 0, in_progress: 0, resolved: 0, total: 0 } })
  }
})

// Mettre à jour le statut d'un feedback (admin)
router.post('/feedback/:id/status', (req, res) => {
  try {
    const { status, adminReply } = req.body
    if (!['open', 'in_progress', 'resolved', 'wontfix'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Statut invalide.' })
    }
    queries.updateFeedbackStatus(Number(req.params.id), status, adminReply)
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
