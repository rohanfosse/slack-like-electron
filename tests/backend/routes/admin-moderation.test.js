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

  it('teacher bloque (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur filtre recherche (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages?search=moderateur')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur filtre promo_id (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages?promo_id=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur filtre channel_id (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages?channel_id=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur filtre auteur (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages?author=Jean')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur pagination (403)', async () => {
    const res = await request(app)
      .get('/api/admin/messages?page=1&limit=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
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

  it('teacher bloque sur message inexistant (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/messages/99999')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT supprimer un message (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/messages/101')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ reason: 'Contenu inapproprie' })
    expect(res.status).toBe(403)
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

  it('teacher bloque sur canaux (403)', async () => {
    const res = await request(app)
      .get('/api/admin/channels')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
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

  it('teacher bloque sur signalements (403)', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur filtre status (403)', async () => {
    const res = await request(app)
      .get('/api/admin/reports?status=pending')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur pagination signalements (403)', async () => {
    const res = await request(app)
      .get('/api/admin/reports?page=1&limit=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
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

  it('teacher CANNOT resoudre un signalement (403)', async () => {
    const res = await request(app)
      .post('/api/admin/reports/1/resolve')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'reviewed' })
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT rejeter un signalement (403)', async () => {
    const res = await request(app)
      .post('/api/admin/reports/1/resolve')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'dismissed' })
    expect(res.status).toBe(403)
  })
})
