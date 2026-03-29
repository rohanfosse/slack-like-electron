// ─── Tests admin moderation routes ───────────────────────────────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, studentToken, teacherToken, adminToken

beforeAll(() => {
  const db = setupTestDb()

  try {
    db.prepare('INSERT OR IGNORE INTO teacher_promos (teacher_id, promo_id) VALUES (1, 1)').run()
  } catch { /* already seeded */ }

  // Seed messages for moderation tests
  db.prepare(`INSERT INTO messages (id, channel_id, author_id, author_name, author_type, content)
    VALUES (100, 1, 1, 'Jean Dupont', 'student', 'Message moderateur test')`).run()
  db.prepare(`INSERT INTO messages (id, channel_id, author_id, author_name, author_type, content)
    VALUES (101, 1, 1, 'Jean Dupont', 'student', 'Message a supprimer')`).run()

  // Seed a report
  db.prepare(`INSERT INTO reports (message_id, reporter_id, reporter_name, reporter_type, reason, details)
    VALUES (100, 1, 'Jean Dupont', 'student', 'spam', 'C est du spam')`).run()

  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  teacherToken = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  adminToken   = jwt.sign({ id: -1, name: 'Prof Test', type: 'admin', promo_id: null }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/admin', auth, require('../../../server/routes/admin/index'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  GET /api/admin/messages
// ═══════════════════════════════════════════
describe('GET /api/admin/messages', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('teacher recoit la liste des messages', async () => {
    const res = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toHaveProperty('messages')
    expect(res.body.data).toHaveProperty('page')
    expect(res.body.data).toHaveProperty('limit')
    expect(Array.isArray(res.body.data.messages)).toBe(true)
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1)
  })

  it('filtre par recherche textuelle', async () => {
    const res = await request(app)
      .get('/api/admin/messages?search=moderateur')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.messages[0].content).toMatch(/moderateur/)
  })

  it('filtre par promo_id', async () => {
    const res = await request(app)
      .get('/api/admin/messages?promo_id=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1)
  })

  it('filtre par channel_id', async () => {
    const res = await request(app)
      .get('/api/admin/messages?channel_id=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1)
  })

  it('filtre par auteur', async () => {
    const res = await request(app)
      .get('/api/admin/messages?author=Jean')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1)
  })

  it('pagination fonctionne', async () => {
    const res = await request(app)
      .get('/api/admin/messages?page=1&limit=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBeLessThanOrEqual(1)
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.limit).toBe(1)
  })
})

// ═══════════════════════════════════════════
//  DELETE /api/admin/messages/:id
// ═══════════════════════════════════════════
describe('DELETE /api/admin/messages/:id', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/messages/101')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('retourne 404 pour un message inexistant', async () => {
    const res = await request(app)
      .delete('/api/admin/messages/99999')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })

  it('teacher peut supprimer un message', async () => {
    const res = await request(app)
      .delete('/api/admin/messages/101')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ reason: 'Contenu inapproprie' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify deleted
    const db = getTestDb()
    const msg = db.prepare('SELECT id FROM messages WHERE id = 101').get()
    expect(msg).toBeUndefined()
  })
})

// ═══════════════════════════════════════════
//  GET /api/admin/channels
// ═══════════════════════════════════════════
describe('GET /api/admin/channels', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .get('/api/admin/channels')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher recoit la liste des canaux', async () => {
    const res = await request(app)
      .get('/api/admin/channels')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('name')
      expect(res.body.data[0]).toHaveProperty('promo_name')
      expect(res.body.data[0]).toHaveProperty('message_count')
    }
  })
})

// ═══════════════════════════════════════════
//  GET /api/admin/reports
// ═══════════════════════════════════════════
describe('GET /api/admin/reports', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher recoit la liste des signalements', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toHaveProperty('entries')
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('pendingCount')
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data.pendingCount).toBeGreaterThanOrEqual(1)
  })

  it('filtre par status', async () => {
    const res = await request(app)
      .get('/api/admin/reports?status=pending')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.entries.length).toBeGreaterThanOrEqual(1)
  })

  it('pagination fonctionne', async () => {
    const res = await request(app)
      .get('/api/admin/reports?page=1&limit=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.entries.length).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════
//  POST /api/admin/reports/:id/resolve
// ═══════════════════════════════════════════
describe('POST /api/admin/reports/:id/resolve', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .post('/api/admin/reports/1/resolve')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'reviewed' })
    expect(res.status).toBe(403)
  })

  it('teacher peut resoudre un signalement (reviewed)', async () => {
    // Get the report id first
    const db = getTestDb()
    const report = db.prepare('SELECT id FROM reports WHERE status = \'pending\' LIMIT 1').get()
    expect(report).toBeDefined()

    const res = await request(app)
      .post(`/api/admin/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'reviewed' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify resolved
    const updated = db.prepare('SELECT status, resolved_by FROM reports WHERE id = ?').get(report.id)
    expect(updated.status).toBe('reviewed')
    expect(updated.resolved_by).toBe('Prof Test')
  })

  it('teacher peut rejeter un signalement (dismissed)', async () => {
    // Insert a new pending report
    const db = getTestDb()
    db.prepare(`INSERT INTO reports (message_id, reporter_id, reporter_name, reporter_type, reason)
      VALUES (100, 1, 'Jean Dupont', 'student', 'other')`).run()
    const report = db.prepare('SELECT id FROM reports WHERE status = \'pending\' ORDER BY id DESC LIMIT 1').get()

    const res = await request(app)
      .post(`/api/admin/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'dismissed' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const updated = db.prepare('SELECT status FROM reports WHERE id = ?').get(report.id)
    expect(updated.status).toBe('dismissed')
  })
})
