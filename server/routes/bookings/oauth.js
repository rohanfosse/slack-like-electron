/**
 * Routes Microsoft OAuth (Azure AD) pour le booking.
 * start/callback/status/disconnect.
 * state CSRF stocke en DB (voir v71 schema).
 */
const router  = require('express').Router()
const crypto  = require('crypto')
const queries = require('../../db/index')
const wrap    = require('../../utils/wrap')
const log     = require('../../utils/logger')
const { requireRole } = require('../../middleware/authorize')
const graph   = require('../../services/microsoftGraph')
const { encrypt } = require('../../utils/crypto')
const { SERVER_URL } = require('./_shared')

function generateOAuthState(teacherId) {
  const nonce = crypto.randomBytes(32).toString('base64url')
  queries.pruneExpiredOAuthStates()
  queries.saveOAuthState(nonce, teacherId)
  return nonce
}

function validateOAuthState(nonce) {
  if (!nonce) return null
  return queries.consumeOAuthState(nonce)
}

router.get('/oauth/start', requireRole('teacher'), async (req, res) => {
  if (!graph.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'Azure AD non configure. Contactez l\'administrateur.' })
  }
  const state = generateOAuthState(req.user.id)
  const url = await graph.getAuthUrl(state)
  if (!url) return res.status(500).json({ ok: false, error: 'Impossible de generer l\'URL OAuth' })
  res.json({ ok: true, data: { url } })
})

router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    if (!code) throw new Error('Code manquant')
    const teacherId = validateOAuthState(String(state || ''))
    if (!teacherId) throw new Error('State OAuth invalide ou expire')
    const result = await graph.acquireTokenByCode(String(code))
    queries.saveMicrosoftToken(teacherId, {
      accessTokenEnc: encrypt(result.accessToken),
      refreshTokenEnc: encrypt(JSON.stringify(result.account || {})),
      expiresAt: result.expiresOn?.toISOString() || new Date(Date.now() + 3600000).toISOString(),
    })
    res.redirect(`${SERVER_URL}/#/settings?oauth=success`)
  } catch (err) {
    log.warn('Booking OAuth callback error', { error: err.message })
    res.redirect(`${SERVER_URL}/#/settings?oauth=error`)
  }
})

router.get('/oauth/status', requireRole('teacher'), wrap((req) => {
  const token = queries.getMicrosoftToken(req.user.id)
  return { connected: !!token, expiresAt: token?.expires_at ?? null }
}))

router.delete('/oauth/disconnect', requireRole('teacher'), wrap((req) => {
  queries.deleteMicrosoftToken(req.user.id)
  return null
}))

module.exports = router
