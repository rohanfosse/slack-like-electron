/**
 * Regression test for cahiers routes — fix "Cannot read properties of undefined (reading 'json')".
 * Cause: wrap() passe uniquement `req`, mais les handlers declares `(req, res)` avaient
 * un `res` undefined → `res.json(...)` crashait.
 */
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app
let teacherToken

beforeAll(() => {
  setupTestDb()
  teacherToken = jwt.sign({ id: 1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/cahiers', auth, require('../../../server/routes/cahiers'))
})

afterAll(() => teardownTestDb())

describe('GET /api/cahiers', () => {
  it('returns cahiers for a promo (200 ok)', async () => {
    const db = getTestDb()
    db.prepare(
      'INSERT INTO cahiers (promo_id, project, title, created_by) VALUES (1, ?, ?, 1)'
    ).run('projet-test', 'Mon cahier')

    const res = await request(app)
      .get('/api/cahiers?promoId=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('returns 400 with clear error when promoId missing (no crash)', async () => {
    const res = await request(app)
      .get('/api/cahiers')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toMatch(/promoId/)
  })
})

describe('GET /api/cahiers/:id', () => {
  it('returns a cahier by id', async () => {
    const db = getTestDb()
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO cahiers (promo_id, project, title, created_by) VALUES (1, ?, ?, 1)'
    ).run('projet-detail', 'Cahier detail')

    const res = await request(app)
      .get(`/api/cahiers/${lastInsertRowid}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.title).toBe('Cahier detail')
    expect(res.body.data.author_name).toBeDefined()
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/cahiers/99999')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })
})

describe('POST /api/cahiers', () => {
  it('creates a cahier', async () => {
    const res = await request(app)
      .post('/api/cahiers')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, project: 'new-project', title: 'Fresh cahier' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.id).toBeDefined()
  })
})
