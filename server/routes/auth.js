// ─── Routes d'authentification (publiques) ────────────────────────────────────
const router  = require('express').Router()
const jwt     = require('jsonwebtoken')
const queries = require('../../src/db/index')
const auth    = require('../middleware/auth')

function wrap(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req)
      res.json({ ok: true, data })
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message })
    }
  }
}

// POST /api/auth/login
router.post('/login', wrap(async (req) => {
  const { email, password } = req.body
  const user = queries.loginWithCredentials(email, password)
  if (!user) throw new Error('Email ou mot de passe incorrect')
  const secret = req.app.get('jwtSecret')
  const token  = jwt.sign(
    { id: user.id, name: user.name, type: user.type, promo_id: user.promo_id },
    secret,
    { expiresIn: '30d' },
  )
  return { ...user, token }
}))

// GET /api/auth/identities  (outil de dev — accès libre)
router.get('/identities', wrap(() => queries.getIdentities()))

// GET /api/auth/student-by-email?email=X
router.get('/student-by-email', wrap((req) => queries.getStudentByEmail(req.query.email)))

// POST /api/auth/register
router.post('/register', wrap((req) => queries.registerStudent(req.body)))

// POST /api/auth/change-password  (requiert JWT)
router.post('/change-password', auth, wrap((req) => {
  const { userId, isTeacher, currentPwd, newPwd } = req.body
  return queries.changePassword(userId, isTeacher, currentPwd, newPwd)
}))

// GET /api/auth/export/:studentId  (requiert JWT)
router.get('/export/:studentId', auth, wrap((req) => {
  return queries.exportStudentData(Number(req.params.studentId))
}))

module.exports = router
