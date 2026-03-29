// ─── Tests route engagement — scores d'engagement par promo ──────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, teacherToken, studentToken

beforeAll(() => {
  setupTestDb()

  teacherToken = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/engagement', auth, require('../../../server/routes/engagement'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  GET /api/engagement/:promoId
// ═══════════════════════════════════════════
describe('GET /api/engagement/:promoId', () => {
  it('teacher CAN get engagement scores (200)', async () => {
    const res = await request(app)
      .get('/api/engagement/1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('student CANNOT get engagement scores (403)', async () => {
    const res = await request(app)
      .get('/api/engagement/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('unauthenticated request is rejected (401)', async () => {
    const res = await request(app)
      .get('/api/engagement/1')
    expect(res.status).toBe(401)
  })

  it('returns empty array for promo with no data', async () => {
    const res = await request(app)
      .get('/api/engagement/999')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})
