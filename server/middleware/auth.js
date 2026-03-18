// ─── Middleware JWT ────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Non authentifié' })
  }
  const token = header.slice(7)
  try {
    const secret = req.app.get('jwtSecret')
    req.user = jwt.verify(token, secret)
    next()
  } catch {
    return res.status(401).json({ ok: false, error: 'Token invalide ou expiré' })
  }
}

module.exports = authMiddleware
