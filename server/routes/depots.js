// ─── Routes dépôts ────────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../../src/db/index')

function wrap(fn) {
  return (req, res) => {
    try { res.json({ ok: true, data: fn(req) }) }
    catch (err) { res.status(400).json({ ok: false, error: err.message }) }
  }
}

router.get('/',         wrap((req) => queries.getDepots(Number(req.query.travailId))))
router.post('/',        wrap((req) => queries.addDepot(req.body)))
router.post('/note',    wrap((req) => queries.setNote(req.body)))
router.post('/feedback',wrap((req) => queries.setFeedback(req.body)))

module.exports = router
