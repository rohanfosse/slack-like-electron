/**
 * Hardening tests for /api/live-v2/activities/:id/respond (Spark/Pulse unified).
 * Regression v2.157.5.
 */
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app
let studentToken
let teacherToken
let sessionId
let activityId

beforeAll(() => {
  setupTestDb()
  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  teacherToken = jwt.sign({ id: 1, name: 'Prof Test', type: 'teacher' }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  app.set('io', { to: () => ({ emit: () => {} }) }) // socket stub
  const auth = require('../../../server/middleware/auth')
  app.use('/api/live-v2', auth, require('../../../server/routes/live-unified'))

  const db = getTestDb()
  const resSession = db.prepare(
    "INSERT INTO live_sessions_v2 (teacher_id, promo_id, title, join_code, status) VALUES (1, 1, 'Test', 'ABC123', 'active')"
  ).run()
  sessionId = resSession.lastInsertRowid
  const resActivity = db.prepare(
    "INSERT INTO live_activities_v2 (session_id, category, type, title, options, status) VALUES (?, 'spark', 'qcm', 'Q1', '[\"A\",\"B\"]', 'pending')"
  ).run(sessionId)
  activityId = resActivity.lastInsertRowid
})

afterAll(() => teardownTestDb())

describe('POST /api/live-v2/activities/:id/respond — hardening', () => {
  it('rejects response when activity pending (409)', async () => {
    const res = await request(app)
      .post(`/api/live-v2/activities/${activityId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: 'A' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/n'accepte plus|terminees/)
  })

  it('accepts response when activity live', async () => {
    const db = getTestDb()
    db.prepare("UPDATE live_activities_v2 SET status = 'live', started_at = datetime('now') WHERE id = ?").run(activityId)

    const res = await request(app)
      .post(`/api/live-v2/activities/${activityId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: 'A' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('rejects empty answer (400)', async () => {
    const res = await request(app)
      .post(`/api/live-v2/activities/${activityId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/vide|requis/i)
  })

  it('rejects oversize answer (400)', async () => {
    const res = await request(app)
      .post(`/api/live-v2/activities/${activityId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: 'x'.repeat(2001) })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/trop long/i)
  })

  it('returns 404 on unknown activity id', async () => {
    const res = await request(app)
      .post('/api/live-v2/activities/99999/respond')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: 'A' })
    expect(res.status).toBe(404)
  })

  it('rejects replay mode when session not ended (409)', async () => {
    const db = getTestDb()
    db.prepare("UPDATE live_sessions_v2 SET status = 'active' WHERE id = ?").run(sessionId)

    const res = await request(app)
      .post(`/api/live-v2/activities/${activityId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: 'A', mode: 'replay' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/replay/i)
  })

  it('rejects words array exceeding 50 entries (zod)', async () => {
    const many = new Array(51).fill('mot')
    const res = await request(app)
      .post(`/api/live-v2/activities/${activityId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ words: many })
    expect(res.status).toBe(400)
  })
})
