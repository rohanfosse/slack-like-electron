/** Routes API carnet de suivi etudiant. */
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')
const { requireTeacher } = require('../middleware/authorize')

// GET /student/:studentId — notes pour un etudiant
router.get('/student/:studentId', requireTeacher, wrap((req) => {
  const teacherId = req.user?.id
  if (!teacherId) throw new Error('Non authentifie')
  return queries.getNotesByStudent(Number(req.params.studentId), teacherId)
}))

// GET /promo/:promoId — toutes les notes pour une promo
router.get('/promo/:promoId', requireTeacher, wrap((req) => {
  const teacherId = req.user?.id
  if (!teacherId) throw new Error('Non authentifie')
  return queries.getNotesByPromo(Number(req.params.promoId), teacherId)
}))

// GET /promo/:promoId/summary — compteurs par etudiant
router.get('/promo/:promoId/summary', requireTeacher, wrap((req) => {
  const teacherId = req.user?.id
  if (!teacherId) throw new Error('Non authentifie')
  return queries.getNotesCountByStudent(Number(req.params.promoId), teacherId)
}))

// POST / — creer une note
router.post('/', requireTeacher, wrap((req) => {
  const teacherId = req.user?.id
  if (!teacherId) throw new Error('Non authentifie')
  const { studentId, promoId, content, tag, category } = req.body
  if (!studentId || !promoId || !content?.trim()) throw new Error('studentId, promoId et content requis')
  return queries.createNote({ teacherId, studentId, promoId, content: content.trim(), tag, category })
}))

// ── Helper : vérifier que la note appartient au prof courant ─────────────────
function requireNoteOwner(req, res, next) {
  const { getDb } = require('../db/connection')
  const note = getDb().prepare('SELECT teacher_id FROM teacher_notes WHERE id = ?').get(Number(req.params.id))
  if (!note) return res.status(404).json({ ok: false, error: 'Note introuvable.' })
  if (note.teacher_id !== req.user?.id) {
    return res.status(403).json({ ok: false, error: 'Vous ne pouvez modifier que vos propres notes.' })
  }
  next()
}

// PATCH /:id — modifier une note (propriétaire uniquement)
router.patch('/:id', requireTeacher, requireNoteOwner, wrap((req) => {
  const { content, tag, category } = req.body
  if (!content?.trim()) throw new Error('content requis')
  return queries.updateNote(Number(req.params.id), { content: content.trim(), tag, category })
}))

// DELETE /:id — supprimer une note (propriétaire uniquement)
router.delete('/:id', requireTeacher, requireNoteOwner, wrap((req) => {
  queries.deleteNote(Number(req.params.id))
  return null
}))

module.exports = router
