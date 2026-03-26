// ─── Routes étudiants ────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')
const { requireTeacher } = require('../middleware/authorize')

// Liste étudiants : profs voient tout, étudiants uniquement leur promo
router.get('/', wrap((req) => {
  if (req.user?.type === 'student') return queries.getStudentsByPromo(req.user.promo_id)
  return queries.getAllStudents()
}))
router.get('/stats',               requireTeacher, wrap((req) => queries.getClasseStats(Number(req.query.promoId))))
// Profil : un étudiant ne peut voir que les profils de sa promo
router.get('/:id/profile', (req, res, next) => {
  if (req.user?.type === 'student') {
    const { getDb } = require('../db/connection')
    const target = getDb().prepare('SELECT promo_id FROM students WHERE id = ?').get(Number(req.params.id))
    if (target && target.promo_id !== req.user.promo_id) {
      return res.status(403).json({ ok: false, error: 'Accès non autorisé à ce profil.' })
    }
  }
  next()
}, wrap((req) => queries.getStudentProfile(Number(req.params.id))))
// Devoirs d'un étudiant : seul l'étudiant lui-même ou un prof
router.get('/:id/assignments', (req, res, next) => {
  if (req.user?.type === 'student' && req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ ok: false, error: 'Vous ne pouvez consulter que vos propres devoirs.' })
  }
  next()
}, wrap((req) => queries.getStudentTravaux(Number(req.params.id))))
router.post('/photo', (req, res, next) => {
  if (req.user?.type === 'student' && req.user.id !== req.body.studentId) {
    return res.status(403).json({ ok: false, error: 'Vous ne pouvez modifier que votre propre photo.' })
  }
  next()
}, wrap((req) => queries.updateStudentPhoto(req.body.studentId, req.body.photoData)))
router.post('/bulk-import',        requireTeacher, wrap((req) => queries.bulkImportStudents(req.body.promoId, req.body.rows)))

module.exports = router
