// ─── Routes ressources ────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')

router.get('/',      wrap((req) => queries.getRessources(Number(req.query.travailId))))
router.post('/',     wrap((req) => queries.addRessource(req.body)))
router.delete('/:id',wrap((req) => queries.deleteRessource(Number(req.params.id))))

module.exports = router
