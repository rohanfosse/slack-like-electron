// ─── Routes ressources ────────────────────────────────────────────────────────
const router  = require('express').Router()
const { z }   = require('zod')
const queries = require('../db/index')
const { validate } = require('../middleware/validate')
const wrap    = require('../utils/wrap')
const { requireTeacher, requirePromo, promoFromTravail } = require('../middleware/authorize')

const addResourceSchema = z.object({
  travail_id:  z.number().int().positive(),
  type:        z.enum(['file', 'link']),
  name:        z.string().min(1).max(255),
  path_or_url: z.string().min(1).max(1000),
  category:    z.string().max(100).optional().default('autre'),
}).passthrough()

router.get('/',      requirePromo(promoFromTravail), wrap((req) => queries.getRessources(Number(req.query.travailId))))
router.post('/',     requireTeacher, validate(addResourceSchema), wrap((req) => queries.addRessource(req.body)))
router.delete('/:id', requireTeacher, wrap((req) => queries.deleteRessource(Number(req.params.id))))

module.exports = router
