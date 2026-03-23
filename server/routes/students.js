// ─── Routes étudiants ────────────────────────────────────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const wrap    = require('../utils/wrap')

router.get('/',                    wrap(() => queries.getAllStudents()))
router.get('/stats',               wrap((req) => queries.getClasseStats(Number(req.query.promoId))))
router.get('/:id/profile',         wrap((req) => queries.getStudentProfile(Number(req.params.id))))
router.get('/:id/assignments',     wrap((req) => queries.getStudentTravaux(Number(req.params.id))))
router.post('/photo',              wrap((req) => queries.updateStudentPhoto(req.body.studentId, req.body.photoData)))
router.post('/bulk-import',        wrap((req) => queries.bulkImportStudents(req.body.promoId, req.body.rows)))

module.exports = router
