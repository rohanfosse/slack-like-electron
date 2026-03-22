/**
 * Routes admin - Paramètres (mode lecture seule, archivage promos, config app)
 */
const router  = require('express').Router()
const queries = require('../../db/index')

router.get('/config', (req, res) => {
  try {
    const readOnly = queries.getAppConfig('read_only')
    res.json({ ok: true, data: { read_only: readOnly === '1' } })
  } catch {
    res.json({ ok: true, data: { read_only: false } })
  }
})

router.post('/config', (req, res) => {
  try {
    const { key, value } = req.body
    const allowed = ['read_only']
    if (!allowed.includes(key)) return res.status(400).json({ ok: false, error: 'Clé non autorisée.' })
    queries.setAppConfig(key, value)
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/promos/:id/archive', (req, res) => {
  try {
    const { archived } = req.body
    queries.togglePromoArchive(Number(req.params.id), archived)
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
