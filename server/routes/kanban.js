/** Routes API Kanban — cartes de suivi par travail/groupe. */
const router  = require('express').Router()
const { z }   = require('zod')
const queries = require('../db/index')
const { validate } = require('../middleware/validate')
const wrap    = require('../utils/wrap')
const { requirePromo, promoFromTravail } = require('../middleware/authorize')

const createCardSchema = z.object({
  title:       z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional().default(''),
})

const updateCardSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  position:    z.number().int().min(0).optional(),
  status:      z.enum(['todo', 'doing', 'blocked', 'done']).optional(),
})

// GET /travaux/:travailId/groups/:groupId
router.get('/travaux/:travailId/groups/:groupId', requirePromo(promoFromTravail), wrap((req) => {
  return queries.getKanbanCards(Number(req.params.travailId), Number(req.params.groupId))
}))

// POST /travaux/:travailId/groups/:groupId
router.post('/travaux/:travailId/groups/:groupId', requirePromo(promoFromTravail), validate(createCardSchema), wrap((req) => {
  return queries.createKanbanCard({
    travailId:   Number(req.params.travailId),
    groupId:     Number(req.params.groupId),
    title:       req.body.title,
    description: req.body.description,
    createdBy:   req.user?.name ?? '',
  })
}))

// PATCH /cards/:id
router.patch('/cards/:id', validate(updateCardSchema), wrap((req) => {
  const { title, description, position, status } = req.body
  if (status !== undefined) {
    return queries.moveKanbanCard(Number(req.params.id), status, position ?? 0)
  }
  return queries.updateKanbanCard(Number(req.params.id), { title, description, position })
}))

// DELETE /cards/:id
router.delete('/cards/:id', wrap((req) => {
  queries.deleteKanbanCard(Number(req.params.id))
  return null
}))

module.exports = router
