/**
 * Route admin - Lecture config (accessible aux pilotes, pas seulement admin)
 * Separe de settings.js car GET /config doit etre accessible aux teachers
 * pour afficher le bandeau mode lecture seule.
 */
const queries = require('../../db/index')

function settingsRead(req, res) {
  try {
    const readOnly = queries.getAppConfig('read_only')
    res.json({ ok: true, data: { read_only: readOnly === '1' } })
  } catch {
    res.json({ ok: true, data: { read_only: false } })
  }
}

module.exports = settingsRead
