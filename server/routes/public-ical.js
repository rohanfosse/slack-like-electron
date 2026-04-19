/**
 * Route publique d'abonnement iCal : /ical/:token.ics
 *
 * Volontairement montee HORS du prefix /api (pas de middleware JWT) pour
 * que Google Calendar / Outlook / Apple Calendar puissent s'abonner sans
 * authentification. L'autorisation repose sur la connaissance du token
 * opaque publie via Settings > Integrations ; supprimer la ligne
 * `calendar_feed_tokens` rend tous les anciens liens 404 instantanement.
 */
const router  = require('express').Router()
const crypto  = require('crypto')
const log     = require('../utils/logger')
const queries = require('../db/index')
const { generateIcal, collectEvents } = require('../services/ical')

router.get('/:token.ics', (req, res) => {
  try {
    const user = queries.findUserByCalendarFeedToken(req.params.token)
    if (!user) return res.status(404).json({ ok: false, error: 'Token invalide ou revoque' })

    const events = collectEvents(user)
    const ical = generateIcal(events, `Cursus - ${user.name || 'Calendrier'}`)

    // ETag base sur le hash du corps : Google/Outlook polleent toutes les
    // 15 min et renvoient If-None-Match → on repond 304 sans body quand le
    // calendrier n'a pas bouge (economise ~95% de la bande passante).
    const etag = `"${crypto.createHash('sha1').update(ical).digest('base64')}"`
    res.set('Content-Type', 'text/calendar; charset=utf-8')
    res.set('Cache-Control', 'private, max-age=900')
    res.set('ETag', etag)

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }
    res.send(ical)
  } catch (err) {
    log.error('public_ical_error', { error: err.message })
    res.status(500).json({ ok: false, error: 'Erreur generation calendrier' })
  }
})

module.exports = router
