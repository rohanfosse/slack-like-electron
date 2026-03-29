// ─── Tests route students — list, profile, assignments, photo, export ────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, teacherToken, studentToken, student2Token

beforeAll(() => {
  setupTestDb()
  const db = getTestDb()

  // Promo 2 + student in promo 2
  db.exec(`INSERT OR IGNORE INTO promotions (id, name, color) VALUES (2, 'Promo B', '#E74C3C')`)
  db.prepare(
    `INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
     VALUES (2, 2, 'Alice Martin', 'alice@test.fr', 'AM', 'hash', 0)`
  ).run()

  // Travail for assignments test
  db.prepare(
    `INSERT OR IGNORE INTO travaux (id, promo_id, title, deadline, type) VALUES (1, 1, 'TP1', '2030-01-01', 'livrable')`
  ).run()

  teacherToken  = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken  = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  student2Token = jwt.sign({ id: 2, name: 'Alice Martin', type: 'student', promo_id: 2 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/students', auth, require('../../../server/routes/students'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  GET /api/students — list
// ═══════════════════════════════════════════
describe('GET /api/students', () => {
  it('teacher sees all students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // Should contain students from both promos
    const names = res.body.data.map(s => s.name)
    expect(names).toContain('Jean Dupont')
    expect(names).toContain('Alice Martin')
  })

  it('student sees only their promo', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // Should only see promo 1
    for (const s of res.body.data) {
      expect(s.promo_id).toBe(1)
    }
  })
})

// ═══════════════════════════════════════════
//  GET /api/students/stats — teacher only
// ═══════════════════════════════════════════
describe('GET /api/students/stats', () => {
  it('teacher CAN get stats (200)', async () => {
    const res = await request(app)
      .get('/api/students/stats?promoId=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student CANNOT get stats (403)', async () => {
    const res = await request(app)
      .get('/api/students/stats?promoId=1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════
//  GET /api/students/:id/profile — promo isolation
// ═══════════════════════════════════════════
describe('GET /api/students/:id/profile', () => {
  it('student CAN see profile of same promo', async () => {
    const res = await request(app)
      .get('/api/students/1/profile')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student CANNOT see profile of different promo (403)', async () => {
    const res = await request(app)
      .get('/api/students/2/profile')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN see any profile', async () => {
    const res = await request(app)
      .get('/api/students/2/profile')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  GET /api/students/:id/assignments — own only
// ═══════════════════════════════════════════
describe('GET /api/students/:id/assignments', () => {
  it('student CAN see own assignments', async () => {
    const res = await request(app)
      .get('/api/students/1/assignments')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student CANNOT see another student assignments (403)', async () => {
    const res = await request(app)
      .get('/api/students/2/assignments')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN see any student assignments', async () => {
    const res = await request(app)
      .get('/api/students/1/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  POST /api/students/photo — own only
// ═══════════════════════════════════════════
describe('POST /api/students/photo', () => {
  it('student CANNOT change another student photo (403)', async () => {
    const res = await request(app)
      .post('/api/students/photo')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentId: 2, photoData: 'data:image/png;base64,abc' })
    expect(res.status).toBe(403)
  })

  it('teacher CAN change any student photo', async () => {
    const res = await request(app)
      .post('/api/students/photo')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: 1, photoData: 'data:image/png;base64,abc' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  POST /api/students/bulk-import — teacher only
// ═══════════════════════════════════════════
describe('POST /api/students/bulk-import', () => {
  it('student CANNOT bulk import (403)', async () => {
    const res = await request(app)
      .post('/api/students/bulk-import')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ promoId: 1, rows: [] })
    expect(res.status).toBe(403)
  })

  it('teacher CAN bulk import', async () => {
    const res = await request(app)
      .post('/api/students/bulk-import')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, rows: [{ name: 'Nouveau Eleve', email: 'nouveau@test.fr' }] })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  GET /api/students/:id/export — RGPD
// ═══════════════════════════════════════════
describe('GET /api/students/:id/export', () => {
  it('student CAN export own data', async () => {
    const res = await request(app)
      .get('/api/students/1/export')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toHaveProperty('student')
    expect(res.body.data).toHaveProperty('exported_at')
  })

  it('student CANNOT export another student data (403)', async () => {
    const res = await request(app)
      .get('/api/students/2/export')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN export any student data', async () => {
    const res = await request(app)
      .get('/api/students/1/export')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.student.name).toBe('Jean Dupont')
  })

  it('returns 404 for non-existent student', async () => {
    const res = await request(app)
      .get('/api/students/999/export')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(404)
  })
})
