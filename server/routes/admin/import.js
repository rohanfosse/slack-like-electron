/**
 * Routes admin — Import de données (examens, rappels, seed promos)
 */
const router = require('express').Router()
const fs     = require('fs')
const path   = require('path')

// ── Helpers ─────────────────────────────────────────────────────────────────

function findPromo(db, name) {
  let promo = db.prepare('SELECT id FROM promotions WHERE name = ?').get(name)
  if (promo) return promo.id
  promo = db.prepare('SELECT id FROM promotions WHERE name LIKE ? OR ? LIKE \'%\' || name || \'%\' ORDER BY id LIMIT 1').get(`%${name}%`, name)
  if (promo) return promo.id
  return null
}

function getOrCreatePromo(db, name, color) {
  const existing = findPromo(db, name)
  if (existing) return existing
  const id = db.prepare('INSERT INTO promotions (name, color) VALUES (?, ?)').run(name, color || '#4A90D9').lastInsertRowid
  db.prepare("INSERT INTO channels (promo_id, name, description, type) VALUES (?, 'annonces', 'Informations importantes', 'annonce')").run(id)
  db.prepare("INSERT INTO channels (promo_id, name, description, type) VALUES (?, 'general', 'Canal principal', 'chat')").run(id)
  return id
}

function getOrCreateChannel(db, promoId, project) {
  let ch = db.prepare('SELECT id FROM channels WHERE promo_id = ? AND category = ?').get(promoId, project)
  if (ch) return ch.id
  const chName = project.toLowerCase().replace(/[^a-z0-9àâéèêëïîôùûüç]+/g, '-').replace(/^-|-$/g, '')
  return db.prepare("INSERT INTO channels (promo_id, name, description, type, category) VALUES (?, ?, ?, 'chat', ?)").run(
    promoId, chName, 'Canal ' + project, project
  ).lastInsertRowid
}

// ── Import examens par nom de promo ─────────────────────────────────────────

router.post('/import-examens', (req, res) => {
  try {
    const { promoName, promoTag } = req.body
    if (!promoName || !promoTag) return res.status(400).json({ ok: false, error: 'promoName et promoTag requis.' })

    const dataPath = path.join(__dirname, '../..', 'data', 'examens-data.json')
    if (!fs.existsSync(dataPath)) return res.status(404).json({ ok: false, error: 'examens-data.json introuvable.' })

    const { getDb } = require('../../db/connection')
    const db = getDb()
    const promoId = getOrCreatePromo(db, promoName)

    const examens = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const filtered = examens.filter(e => e.promoTag === promoTag)
    if (!filtered.length) return res.json({ ok: true, data: { imported: 0, message: 'Aucun examen pour ' + promoTag } })

    let imported = 0
    const insert = db.prepare(`
      INSERT INTO travaux (promo_id, channel_id, title, description, type, category, deadline, start_date, published, requires_submission, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL)
    `)

    for (const e of filtered) {
      const channelId = getOrCreateChannel(db, promoId, e.project)
      const deadline = e.date ? e.date + 'T' + (e.hDebut ? e.hDebut.replace('h', ':') : '23:59') + ':00' : null
      if (!deadline) continue
      const existing = db.prepare('SELECT id FROM travaux WHERE channel_id = ? AND title = ? AND deadline LIKE ?').get(channelId, e.title, e.date + '%')
      if (existing) continue
      insert.run(promoId, channelId, e.title, e.description, e.type, e.project, deadline, null)
      imported++
    }

    res.json({ ok: true, data: { imported, total: filtered.length, promoId, message: `${imported} examens importés dans "${promoName}".` } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ── Seed complet : promos + canaux + examens + rappels ──────────────────────

router.post('/seed-promos', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()
    const results = []

    const PROMOS = [
      { name: 'CPI A2 Informatique', tag: 'CPIA2', color: '#4A90D9', blocs: [
        'Systèmes embarqués', 'Conception et programmation objet', 'Réseaux et Système', 'Développement web'
      ]},
      { name: 'FISA Informatique A4', tag: 'FISA4', color: '#7B5EA7', blocs: [
        'Big data', 'IoT', 'Intelligence Artificielle', 'Développement web avancé', 'Anglais'
      ]},
    ]

    for (const p of PROMOS) {
      const existingId = findPromo(db, p.name)
      const promoId = existingId || getOrCreatePromo(db, p.name, p.color)
      results.push(existingId
        ? `Promo "${p.name}" trouvée → ID ${promoId} (existante)`
        : `Promo "${p.name}" créée → ID ${promoId}`)

      for (const bloc of p.blocs) {
        getOrCreateChannel(db, promoId, bloc)
      }
      results.push(`  ${p.blocs.length} canaux de projet créés`)

      const examPath = path.join(__dirname, '../..', 'data', 'examens-data.json')
      if (fs.existsSync(examPath)) {
        const examens = JSON.parse(fs.readFileSync(examPath, 'utf8'))
        const filtered = examens.filter(e => e.promoTag === p.tag)
        let exImported = 0
        const insert = db.prepare(`
          INSERT INTO travaux (channel_id, title, description, type, category, deadline, start_date, published, requires_submission, room)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, NULL)
        `)
        for (const e of filtered) {
          const channelId = getOrCreateChannel(db, promoId, e.project)
          const deadline = e.date ? e.date + 'T' + (e.hDebut ? e.hDebut.replace('h', ':') : '23:59') + ':00' : null
          if (!deadline) continue
          const existing = db.prepare('SELECT id FROM travaux WHERE channel_id = ? AND title = ? AND deadline LIKE ?').get(channelId, e.title, e.date + '%')
          if (existing) continue
          insert.run(promoId, channelId, e.title, e.description, e.type, e.project, deadline, null)
          exImported++
        }
        results.push(`  ${exImported} examens importés`)
      }
    }

    // Import rappels
    const rappelsPath = path.join(__dirname, '../..', 'data', 'rappels-data.json')
    if (fs.existsSync(rappelsPath)) {
      const rappels = JSON.parse(fs.readFileSync(rappelsPath, 'utf8'))
      db.prepare('DELETE FROM teacher_reminders').run()
      const insertR = db.prepare('INSERT INTO teacher_reminders (promo_tag, date, title, description, bloc) VALUES (?, ?, ?, ?, ?)')
      for (const r of rappels) insertR.run(r.promoTag, r.date, r.title, r.description, r.bloc)
      results.push(`${rappels.length} rappels prof importés`)
    }

    const allPromos = db.prepare('SELECT id, name FROM promotions').all()
    res.json({ ok: true, data: { steps: results, promos: allPromos } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ── Promos list ─────────────────────────────────────────────────────────────

router.get('/promos-list', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const promos = getDb().prepare('SELECT id, name, color FROM promotions ORDER BY name').all()
    res.json({ ok: true, data: promos })
  } catch { res.json({ ok: true, data: [] }) }
})

// ── Rappels prof ────────────────────────────────────────────────────────────

router.post('/import-rappels', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../..', 'data', 'rappels-data.json')
    if (!fs.existsSync(dataPath)) return res.status(404).json({ ok: false, error: 'rappels-data.json introuvable.' })

    const rappels = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const { getDb } = require('../../db/connection')
    const db = getDb()

    let imported = 0
    const insert = db.prepare('INSERT INTO teacher_reminders (promo_tag, date, title, description, bloc) VALUES (?, ?, ?, ?, ?)')

    db.prepare('DELETE FROM teacher_reminders').run()

    for (const r of rappels) {
      insert.run(r.promoTag, r.date, r.title, r.description, r.bloc)
      imported++
    }

    res.json({ ok: true, data: { imported, message: `${imported} rappels importés.` } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/rappels', (req, res) => {
  try {
    const { getDb } = require('../../db/connection')
    const db = getDb()
    const rappels = db.prepare('SELECT * FROM teacher_reminders ORDER BY date ASC').all()
    res.json({ ok: true, data: rappels })
  } catch (err) {
    res.json({ ok: true, data: [] })
  }
})

router.post('/rappels/:id/done', (req, res) => {
  try {
    const { done } = req.body
    const { getDb } = require('../../db/connection')
    getDb().prepare('UPDATE teacher_reminders SET done = ? WHERE id = ?').run(done ? 1 : 0, Number(req.params.id))
    res.json({ ok: true, data: null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
