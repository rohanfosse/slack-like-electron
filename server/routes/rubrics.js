// ─── Routes rubriques ────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../../src/db/index')

function wrap(fn) {
  return (req, res) => {
    try { res.json({ ok: true, data: fn(req) }) }
    catch (err) { res.status(400).json({ ok: false, error: err.message }) }
  }
}

router.get('/scores/:depotId', wrap((req) => queries.getDepotScores(Number(req.params.depotId))))
router.post('/scores',         wrap((req) => queries.setDepotScores(req.body)))
router.get('/:travailId',      wrap((req) => queries.getRubric(Number(req.params.travailId))))
router.post('/',               wrap((req) => queries.upsertRubric(req.body)))
router.delete('/:travailId',   wrap((req) => queries.deleteRubric(Number(req.params.travailId))))

module.exports = router
