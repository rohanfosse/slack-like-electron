// ─── Tests admin sessions routes ─────────────────────────────────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, studentToken, teacherToken, adminToken

beforeAll(() => {
  const db = setupTestDb()

  // Seed active sessions
  db.prepare(`INSERT INTO active_sessions (user_id, user_name, user_type, token_hash, ip, user_agent)
    VALUES (1, 'Jean Dupont', 'student', 'hash1', '127.0.0.1', 'TestAgent/1.0')`).run()
  db.prepare(`INSERT INTO active_sessions (user_id, user_name, user_type, token_hash, ip, user_agent)
    VALUES (1, 'Jean Dupont', 'student', 'hash2', '127.0.0.1', 'TestAgent/2.0')`).run()
  db.prepare(`INSERT INTO active_sessions (user_id, user_name, user_type, token_hash, ip, user_agent)
    VALUES (-1, 'Prof Test', 'teacher', 'hash3', '127.0.0.1', 'TestAgent/3.0')`).run()

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
//  GET /api/admin/sessions (admin only)
// ═══════════════════════════════════════════
describe('GET /api/admin/sessions', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher non-admin bloque (403)', async () => {
    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/administrateur/i)
  })

  it('admin recoit les sessions actives', async () => {
    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(3)

    const session = res.body.data[0]
    expect(session).toHaveProperty('user_id')
    expect(session).toHaveProperty('user_name')
    expect(session).toHaveProperty('user_type')
    expect(session).toHaveProperty('token_hash')
    expect(session).toHaveProperty('ip')
  })
})

// ═══════════════════════════════════════════
//  DELETE /api/admin/sessions/:id (revoke single session)
// ═══════════════════════════════════════════
describe('DELETE /api/admin/sessions/:id', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/sessions/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher non-admin bloque (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/sessions/1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('admin peut revoquer une session', async () => {
    const db = getTestDb()
    const session = db.prepare('SELECT id FROM active_sessions LIMIT 1').get()
    expect(session).toBeDefined()

    const res = await request(app)
      .delete(`/api/admin/sessions/${session.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify deleted
    const check = db.prepare('SELECT id FROM active_sessions WHERE id = ?').get(session.id)
    expect(check).toBeUndefined()
  })
})

// ═══════════════════════════════════════════
//  POST /api/admin/sessions/revoke-user (revoke all sessions for a user)
// ═══════════════════════════════════════════
describe('POST /api/admin/sessions/revoke-user', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .post('/api/admin/sessions/revoke-user')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ userId: 1 })
    expect(res.status).toBe(403)
  })

  it('teacher non-admin bloque (403)', async () => {
    const res = await request(app)
      .post('/api/admin/sessions/revoke-user')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ userId: 1 })
    expect(res.status).toBe(403)
  })

  it('admin peut revoquer toutes les sessions d\'un utilisateur', async () => {
    const db = getTestDb()

    // Ensure user 1 has sessions
    db.prepare(`INSERT OR IGNORE INTO active_sessions (user_id, user_name, user_type, token_hash, ip, user_agent)
      VALUES (1, 'Jean Dupont', 'student', 'hash_revoke_1', '127.0.0.1', 'Test')`).run()
    db.prepare(`INSERT OR IGNORE INTO active_sessions (user_id, user_name, user_type, token_hash, ip, user_agent)
      VALUES (1, 'Jean Dupont', 'student', 'hash_revoke_2', '127.0.0.1', 'Test')`).run()

    const before = db.prepare('SELECT COUNT(*) AS c FROM active_sessions WHERE user_id = 1').get().c
    expect(before).toBeGreaterThanOrEqual(1)

    const res = await request(app)
      .post('/api/admin/sessions/revoke-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: 1 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify all sessions for user 1 are gone
    const after = db.prepare('SELECT COUNT(*) AS c FROM active_sessions WHERE user_id = 1').get().c
    expect(after).toBe(0)
  })
})
