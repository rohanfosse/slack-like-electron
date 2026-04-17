// ─── Routes cahiers (notebooks collaboratifs) ───────────────────────────────
const router  = require('express').Router()
const { z }   = require('zod')
const queries = require('../db/index')
const { validate } = require('../middleware/validate')
const wrap    = require('../utils/wrap')
const { requireRole } = require('../middleware/authorize')

const createSchema = z.object({
  promoId:   z.number().int().positive(),
  project:   z.string().nullable().optional(),
  title:     z.string().min(1).max(200).optional(),
  groupId:   z.number().int().positive().nullable().optional(),
})

const renameSchema = z.object({
  title: z.string().min(1).max(200),
})

// wrap(fn) appelle fn(req) et fait res.json({ ok, data }) automatiquement.
// Pour un 4xx, throw une Error avec .statusCode (voir wrap.js resolveStatus).
function clientError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

// GET /api/cahiers?promoId=X&project=Y
router.get('/', wrap((req) => {
  const promoId = Number(req.query.promoId)
  if (!promoId) throw clientError('promoId requis')
  const project = req.query.project || null
  return queries.getCahiers(promoId, project)
}))

// GET /api/cahiers/:id
router.get('/:id', wrap((req) => {
  const cahier = queries.getCahierById(Number(req.params.id))
  if (!cahier) throw clientError('Cahier introuvable', 404)
  return cahier
}))

// GET /api/cahiers/:id/state — Yjs document state (binary base64)
router.get('/:id/state', wrap((req) => {
  const state = queries.getCahierYjsState(Number(req.params.id))
  if (!state) return null
  return Buffer.from(state).toString('base64')
}))

// POST /api/cahiers — create
router.post('/', requireRole('teacher', 'student'), validate(createSchema), wrap((req) => {
  const { promoId, project, title, groupId } = req.body
  return queries.createCahier({
    promoId,
    project,
    title: title || 'Sans titre',
    createdBy: req.user.id,
    groupId,
  })
}))

// PATCH /api/cahiers/:id — rename
router.patch('/:id', requireRole('teacher', 'student'), validate(renameSchema), wrap((req) => {
  queries.renameCahier(Number(req.params.id), req.body.title)
  return { id: Number(req.params.id), title: req.body.title }
}))

// DELETE /api/cahiers/:id
router.delete('/:id', requireRole('teacher'), wrap((req) => {
  queries.deleteCahier(Number(req.params.id))
  return { id: Number(req.params.id) }
}))

// PATCH /api/cahiers/:id/state — save Yjs state (base64)
const stateSchema = z.object({ state: z.string() })
router.patch('/:id/state', validate(stateSchema), wrap((req) => {
  const state = Buffer.from(req.body.state, 'base64')
  queries.saveCahierYjsState(Number(req.params.id), state)
  return { id: Number(req.params.id) }
}))

module.exports = router
