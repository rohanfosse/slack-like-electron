// ─── Routes groupes ───────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')
const { requireTeacher, requirePromo, promoFromParam } = require('../middleware/authorize')

router.get('/',               requirePromo(promoFromParam), wrap((req) => queries.getGroups(Number(req.query.promoId))))
router.post('/',              requireTeacher, wrap((req) => queries.createGroup(req.body)))
router.delete('/:id',         requireTeacher, wrap((req) => queries.deleteGroup(Number(req.params.id))))
router.get('/:id/members', (req, res, next) => {
  // Étudiants : vérifier que le groupe appartient à leur promo
  if (req.user?.type === 'student') {
    const { getDb } = require('../db/connection')
    const grp = getDb().prepare('SELECT promo_id FROM groups WHERE id = ?').get(Number(req.params.id))
    if (grp && grp.promo_id !== req.user.promo_id) {
      return res.status(403).json({ ok: false, error: 'Accès non autorisé à ce groupe.' })
    }
  }
  next()
}, wrap((req) => queries.getGroupMembers(Number(req.params.id))))
router.post('/:id/members',   requireTeacher, wrap((req) => queries.setGroupMembers(req.body)))

module.exports = router
