// ─── Routes groupes ───────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')

router.get('/',               wrap((req) => queries.getGroups(Number(req.query.promoId))))
router.post('/',              wrap((req) => queries.createGroup(req.body)))
router.delete('/:id',         wrap((req) => queries.deleteGroup(Number(req.params.id))))
router.get('/:id/members',    wrap((req) => queries.getGroupMembers(Number(req.params.id))))
router.post('/:id/members',   wrap((req) => queries.setGroupMembers(req.body)))

module.exports = router
