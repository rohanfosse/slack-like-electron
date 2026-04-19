// ─── Routes calendrier (iCal feed + sync Outlook) ───────────────────────────
const router  = require('express').Router()
const queries = require('../db/index')
const log     = require('../utils/logger')
const graph   = require('../services/microsoftGraph')
const { getValidMsToken } = require('../utils/msToken')
const { requireRole }     = require('../middleware/authorize')
const { generateIcal, collectEvents } = require('../services/ical')

function resolvePublicOrigin(req) {
  const configured = process.env.PUBLIC_ORIGIN || process.env.CORS_ORIGIN
  if (configured && configured !== '*') return configured.replace(/\/$/, '')
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
  const host  = req.get('x-forwarded-host') || req.get('host')
  return `${proto}://${host}`
}

function buildFeedUrl(req, token) {
  return `${resolvePublicOrigin(req)}/ical/${token}.ics`
}

// ── Feed iCal (souscription Outlook / Google Calendar) ───────────────────────
router.get('/feed.ics', (req, res) => {
  try {
    const events = collectEvents(req.user)
    const ical = generateIcal(events, `Cursus - ${req.user.name || 'Calendrier'}`)
    res.set('Content-Type', 'text/calendar; charset=utf-8')
    res.send(ical)
  } catch (err) {
    log.error('calendar_feed_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur generation calendrier' })
  }
})

// ── Export ponctuel .ics (download) ──────────────────────────────────────────
router.get('/export.ics', (req, res) => {
  try {
    const events = collectEvents(req.user)
    const ical = generateIcal(events, 'Cursus - Calendrier')
    res.set('Content-Type', 'text/calendar; charset=utf-8')
    res.set('Content-Disposition', 'attachment; filename="cursus-calendrier.ics"')
    res.send(ical)
  } catch (err) {
    log.error('calendar_export_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur export calendrier' })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// Feed tokens (abonnement iCal public sans JWT)
// ══════════════════════════════════════════════════════════════════════════

/** GET /feed-token — renvoie le token actif + l'URL publique, ou null */
router.get('/feed-token', (req, res) => {
  try {
    const row = queries.getCalendarFeedToken(req.user.type, req.user.id)
    if (!row) return res.json({ ok: true, data: { token: null, url: null } })
    res.json({ ok: true, data: { token: row.token, url: buildFeedUrl(req, row.token), createdAt: row.created_at } })
  } catch (err) {
    log.error('calendar_feed_token_get_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur lecture token' })
  }
})

/** POST /feed-token — cree ou rote le token (invalide l'ancien immediatement) */
router.post('/feed-token', (req, res) => {
  try {
    const row = queries.rotateCalendarFeedToken(req.user.type, req.user.id)
    res.json({ ok: true, data: { token: row.token, url: buildFeedUrl(req, row.token), createdAt: row.created_at } })
  } catch (err) {
    log.error('calendar_feed_token_rotate_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur generation token' })
  }
})

/** DELETE /feed-token — revoque l'abonnement */
router.delete('/feed-token', (req, res) => {
  try {
    queries.deleteCalendarFeedToken(req.user.type, req.user.id)
    res.json({ ok: true, data: { revoked: true } })
  } catch (err) {
    log.error('calendar_feed_token_delete_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur revocation' })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// Outlook live sync (teachers only)
// ══════════════════════════════════════════════════════════════════════════

/** GET /outlook/events?from=ISO&to=ISO — fetch teacher's Outlook events */
router.get('/outlook/events', requireRole('teacher'), async (req, res) => {
  try {
    const from = req.query.from
    const to   = req.query.to
    if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
      return res.status(400).json({ ok: false, error: 'from/to ISO requis' })
    }

    const token = await getValidMsToken(req.user.id)
    if (!token) return res.json({ ok: true, data: { events: [], connected: false } })

    const events = await graph.getCalendarEvents(token, from, to)
    res.json({ ok: true, data: { events, connected: true } })
  } catch (err) {
    log.warn('outlook_events_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur chargement Outlook' })
  }
})

/** POST /outlook/events — create an event in teacher's Outlook calendar */
router.post('/outlook/events', requireRole('teacher'), async (req, res) => {
  try {
    const { subject, startDateTime, endDateTime, body, attendees, createTeams } = req.body || {}
    if (!subject || !startDateTime || !endDateTime) {
      return res.status(400).json({ ok: false, error: 'subject/startDateTime/endDateTime requis' })
    }
    if (typeof subject !== 'string' || subject.length > 500) {
      return res.status(400).json({ ok: false, error: 'subject invalide (max 500 caracteres)' })
    }
    const startMs = Date.parse(startDateTime)
    const endMs   = Date.parse(endDateTime)
    if (isNaN(startMs) || isNaN(endMs)) {
      return res.status(400).json({ ok: false, error: 'Dates invalides (ISO 8601 attendu)' })
    }
    if (endMs <= startMs) {
      return res.status(400).json({ ok: false, error: 'endDateTime doit etre strictement apres startDateTime' })
    }
    if (attendees && !Array.isArray(attendees)) {
      return res.status(400).json({ ok: false, error: 'attendees doit etre un tableau' })
    }

    const token = await getValidMsToken(req.user.id)
    if (!token) return res.status(503).json({ ok: false, error: 'Microsoft non connecte' })

    const result = await graph.createEventWithTeams(token, {
      subject, startDateTime, endDateTime,
      body: body || '',
      attendees: attendees || [],
    })
    // If caller doesn't want Teams, still Graph creates one — we just return what we got
    res.json({ ok: true, data: { ...result, createTeams: !!createTeams } })
  } catch (err) {
    log.warn('outlook_create_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur creation Outlook' })
  }
})

/** DELETE /outlook/events/:id — delete an event from teacher's Outlook calendar */
router.delete('/outlook/events/:id', requireRole('teacher'), async (req, res) => {
  try {
    const token = await getValidMsToken(req.user.id)
    if (!token) return res.status(503).json({ ok: false, error: 'Microsoft non connecte' })
    await graph.deleteEvent(token, req.params.id)
    res.json({ ok: true, data: null })
  } catch (err) {
    log.warn('outlook_delete_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur suppression Outlook' })
  }
})

module.exports = router
