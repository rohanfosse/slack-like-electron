// ─── Routes projets : CRUD + travaux/documents + assignation TA ──────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')
const { requireTeacher, requirePromo, promoFromParam } = require('../middleware/authorize')

/** Lookup : project id → promo_id */
function promoFromProject(req) {
  const { getDb } = require('../db/connection')
  const projectId = Number(req.params.id)
  if (!projectId) return null
  const p = getDb().prepare('SELECT promo_id FROM projects WHERE id = ?').get(projectId)
  return p?.promo_id ?? null
}

// ── Projets CRUD ──────────────────────────────────────────────────────────────

// GET /ta/my-projects doit etre declare AVANT /:id pour eviter le conflit de route
router.get('/ta/my-projects', requireTeacher, wrap((req) => {
  const teacherId = Math.abs(req.user.id)
  return queries.getTaProjects(teacherId)
}))

router.get('/promo/:promoId', requirePromo(promoFromParam), wrap((req) => queries.getProjectsByPromo(Number(req.params.promoId))))

router.get('/:id', requirePromo(promoFromProject), wrap((req) => queries.getProjectById(Number(req.params.id))))

router.post('/', requireTeacher, wrap((req) => {
  const { promoId, name, description, channelId, deadline } = req.body
  if (!promoId || !name) throw Object.assign(new Error('promoId et name requis'), { statusCode: 400 })
  const createdBy = Math.abs(req.user.id)
  return queries.createProject({ promoId, name, description, channelId, deadline, createdBy })
}))

router.put('/:id', requireTeacher, wrap((req) => {
  const { name, description, deadline } = req.body
  return queries.updateProject(Number(req.params.id), { name, description, deadline })
}))

router.delete('/:id', requireTeacher, wrap((req) => queries.deleteProject(Number(req.params.id))))

// ── Travaux d'un projet ───────────────────────────────────────────────────────

router.get('/:id/travaux', wrap((req) => queries.getProjectTravaux(Number(req.params.id))))

router.post('/:id/travaux/:travailId', requireTeacher, wrap((req) =>
  queries.addTravailToProject(Number(req.params.id), Number(req.params.travailId))
))

router.delete('/:id/travaux/:travailId', requireTeacher, wrap((req) =>
  queries.removeTravailFromProject(Number(req.params.id), Number(req.params.travailId))
))

// ── Documents d'un projet ─────────────────────────────────────────────────────

router.get('/:id/documents', wrap((req) => queries.getProjectDocuments(Number(req.params.id))))

router.post('/:id/documents/:documentId', requireTeacher, wrap((req) =>
  queries.addDocumentToProject(Number(req.params.id), Number(req.params.documentId))
))

// ── Assignation TA ────────────────────────────────────────────────────────────

router.get('/:id/tas', wrap((req) => queries.getProjectTas(Number(req.params.id))))

router.post('/:id/assign-ta', requireTeacher, wrap((req) => {
  const { teacherId } = req.body
  if (!teacherId) throw Object.assign(new Error('teacherId requis'), { statusCode: 400 })
  return queries.assignTaToProject(teacherId, Number(req.params.id))
}))

router.delete('/:id/unassign-ta/:teacherId', requireTeacher, wrap((req) =>
  queries.unassignTaFromProject(Number(req.params.teacherId), Number(req.params.id))
))

module.exports = router
