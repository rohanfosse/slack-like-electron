// ─── Routes ressources ────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')
const { requireTeacher, requirePromo, promoFromTravail } = require('../middleware/authorize')

router.get('/',      requirePromo(promoFromTravail), wrap((req) => queries.getRessources(Number(req.query.travailId))))
router.post('/',     requireTeacher, wrap((req) => queries.addRessource(req.body)))
router.delete('/:id', requireTeacher, wrap((req) => queries.deleteRessource(Number(req.params.id))))

module.exports = router
