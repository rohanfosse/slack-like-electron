// ─── Tests routes ressources — CRUD, promo isolation ─────────────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, db
let teacherToken, studentToken, student2Token

beforeAll(() => {
  setupTestDb()
  db = getTestDb()

  // Seed promo 2 + student 2
  db.exec(`INSERT OR IGNORE INTO promotions (id, name, color) VALUES (2, 'Promo B', '#E74C3C')`)
  db.prepare(
    `INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
     VALUES (2, 2, 'Alice Martin', 'alice@test.fr', 'AM', 'hash', 0)`
  ).run()

  // Seed travaux
  db.prepare(
    `INSERT OR IGNORE INTO travaux (id, promo_id, title, deadline, type) VALUES (1, 1, 'TP1', '2030-01-01', 'livrable')`
  ).run()
  db.prepare(
    `INSERT OR IGNORE INTO travaux (id, promo_id, title, deadline, type) VALUES (2, 2, 'TP2', '2030-01-01', 'livrable')`
  ).run()

  // Seed a resource in promo 1 travail
  db.prepare(
    `INSERT OR IGNORE INTO ressources (id, travail_id, type, name, path_or_url)
     VALUES (1, 1, 'link', 'MDN Guide', 'https://developer.mozilla.org')`
  ).run()

  // Tokens
  teacherToken  = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken  = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  student2Token = jwt.sign({ id: 2, name: 'Alice Martin', type: 'student', promo_id: 2 }, JWT_SECRET)

  // Express app
  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/resources', auth, require('../../../server/routes/resources'))
}, 30_000)

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  GET /api/resources?travailId=
// ═══════════════════════════════════════════
describe('GET /api/resources', () => {
  it('student from promo 1 CAN list resources for promo 1 travail (200)', async () => {
    const res = await request(app)
      .get('/api/resources?travailId=1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('student from promo 2 CANNOT list promo 1 travail resources (403)', async () => {
    const res = await request(app)
      .get('/api/resources?travailId=1')
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN list resources for any travail (200)', async () => {
    const res = await request(app)
      .get('/api/resources?travailId=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  POST /api/resources — create
// ═══════════════════════════════════════════
describe('POST /api/resources', () => {
  it('teacher CAN create a link resource (200)', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        travailId: 1,
        type: 'link',
        name: 'GitHub Repo',
        pathOrUrl: 'https://github.com/example/repo',
        category: 'Github',
      })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('teacher CAN create a file resource (200)', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        travail_id: 2,
        type: 'file',
        name: 'Cours PDF',
        path_or_url: '/uploads/cours.pdf',
      })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student CANNOT create a resource (403)', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ travailId: 1, type: 'link', name: 'Hack', pathOrUrl: 'https://evil.com' })
    expect(res.status).toBe(403)
  })

  it('rejects invalid type', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ travailId: 1, type: 'invalid', name: 'Bad', pathOrUrl: 'http://x' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ travailId: 1, type: 'link', name: '', pathOrUrl: 'http://x' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// ═══════════════════════════════════════════
//  DELETE /api/resources/:id
// ═══════════════════════════════════════════
describe('DELETE /api/resources/:id', () => {
  it('student CANNOT delete a resource (403)', async () => {
    const res = await request(app)
      .delete('/api/resources/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN delete a resource (200)', async () => {
    // Create one to delete
    const created = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ travailId: 1, type: 'link', name: 'To Delete', pathOrUrl: 'https://del.com' })

    // Get the latest resource ID
    const allRes = await request(app)
      .get('/api/resources?travailId=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    const lastDoc = allRes.body.data[allRes.body.data.length - 1]

    const res = await request(app)
      .delete(`/api/resources/${lastDoc.id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
