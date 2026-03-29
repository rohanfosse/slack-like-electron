// ─── Tests admin audit routes ────────────────────────────────────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, studentToken, teacherToken, adminToken

beforeAll(() => {
  const db = setupTestDb()

  // Seed audit log entries
  db.prepare(`INSERT INTO audit_log (actor_id, actor_name, actor_type, action, target, details, ip)
    VALUES (1, 'Prof Test', 'admin', 'user.create', 'student:5', '{"name":"Alice"}', '127.0.0.1')`).run()
  db.prepare(`INSERT INTO audit_log (actor_id, actor_name, actor_type, action, target, details, ip)
    VALUES (1, 'Prof Test', 'admin', 'message.delete', 'message:42', '{"reason":"spam"}', '192.168.1.1')`).run()
  db.prepare(`INSERT INTO audit_log (actor_id, actor_name, actor_type, action, target, details, ip)
    VALUES (2, 'Autre Prof', 'teacher', 'config.update', 'config:read_only', '{}', '10.0.0.1')`).run()

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
//  GET /api/admin/audit (admin only)
// ═══════════════════════════════════════════
describe('GET /api/admin/audit', () => {
  it('refuse les etudiants (403)', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher non-admin bloque (403)', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/administrateur/i)
  })

  it('admin recoit le journal d\'audit', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toHaveProperty('entries')
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('page')
    expect(res.body.data).toHaveProperty('limit')
    expect(Array.isArray(res.body.data.entries)).toBe(true)
    expect(res.body.data.total).toBeGreaterThanOrEqual(3)
  })

  it('les entrees contiennent les champs attendus', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    const entry = res.body.data.entries[0]
    expect(entry).toHaveProperty('actor_id')
    expect(entry).toHaveProperty('actor_name')
    expect(entry).toHaveProperty('actor_type')
    expect(entry).toHaveProperty('action')
    expect(entry).toHaveProperty('target')
    expect(entry).toHaveProperty('created_at')
  })

  it('filtre par action', async () => {
    const res = await request(app)
      .get('/api/admin/audit?action=user.create')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.entries.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.entries.every(e => e.action === 'user.create')).toBe(true)
  })

  it('filtre par acteur', async () => {
    const res = await request(app)
      .get('/api/admin/audit?actor=Autre')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.entries.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.entries.every(e => e.actor_name.includes('Autre'))).toBe(true)
  })

  it('pagination fonctionne', async () => {
    const res = await request(app)
      .get('/api/admin/audit?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.entries.length).toBe(1)
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.limit).toBe(1)
    expect(res.body.data.total).toBeGreaterThanOrEqual(3)
  })

  it('page 2 retourne d\'autres resultats', async () => {
    const page1 = await request(app)
      .get('/api/admin/audit?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
    const page2 = await request(app)
      .get('/api/admin/audit?page=2&limit=1')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(page1.body.data.entries[0].id).not.toBe(page2.body.data.entries[0].id)
  })
})
