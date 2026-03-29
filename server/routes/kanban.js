/** Routes API Kanban — cartes de suivi par travail/groupe. */
const router  = require('express').Router()
const { z }   = require('zod')
const queries = require('../db/index')
const { validate } = require('../middleware/validate')
const wrap    = require('../utils/wrap')
const { requirePromo, promoFromTravail } = require('../middleware/authorize')

/** Lookup : kanban card id → promo_id (via travail) */
function promoFromCard(req) {
  const { getDb } = require('../db/connection')
  const cardId = Number(req.params.id)
  if (!cardId) return null
  const card = getDb().prepare('SELECT k.travail_id FROM kanban_cards k WHERE k.id = ?').get(cardId)
  if (!card) return null
  const t = getDb().prepare('SELECT promo_id FROM travaux WHERE id = ?').get(card.travail_id)
  return t?.promo_id ?? null
}

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
router.patch('/cards/:id', requirePromo(promoFromCard), validate(updateCardSchema), wrap((req) => {
  const { title, description, position, status } = req.body
  if (status !== undefined) {
    return queries.moveKanbanCard(Number(req.params.id), status, position ?? 0)
  }
  return queries.updateKanbanCard(Number(req.params.id), { title, description, position })
}))

// DELETE /cards/:id
router.delete('/cards/:id', requirePromo(promoFromCard), wrap((req) => {
  queries.deleteKanbanCard(Number(req.params.id))
  return null
}))

module.exports = router
