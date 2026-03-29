// ─── Tests admin users routes — list, search, update, reset, delete ──────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, studentToken, teacherToken, adminToken

beforeAll(() => {
  const db = setupTestDb()

  // Seed teacher_promos for teacher id=1, promo_id=1
  try {
    db.prepare('INSERT OR IGNORE INTO teacher_promos (teacher_id, promo_id) VALUES (1, 1)').run()
  } catch { /* already seeded */ }

  // Add a second student for search/filter tests
  db.prepare(
    `INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
     VALUES (2, 1, 'Marie Curie', 'marie@test.fr', 'MC', 'hash', 0)`
  ).run()

  // Add a pilote (role=pilote, not teacher) for delete tests
  db.prepare(
    `INSERT OR IGNORE INTO teachers (id, name, email, password, must_change_password, role)
     VALUES (2, 'Pilote Test', 'pilote@test.fr', 'hash', 0, 'pilote')`
  ).run()

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
//  GET /api/admin/users — list users
// ═══════════════════════════════════════════
describe('GET /api/admin/users', () => {
  it('student is blocked (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('teacher CANNOT list users (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('admin can list users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('teacher bloque sur search filter (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users?search=Marie')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur promo_id filter (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users?promo_id=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur pagination (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════
//  GET /api/admin/users/:id — user detail
// ═══════════════════════════════════════════
describe('GET /api/admin/users/:id', () => {
  it('student is blocked (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT get student detail (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users/1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur user inexistant (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users/99999')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════
//  PATCH /api/admin/users/:id — update user
// ═══════════════════════════════════════════
describe('PATCH /api/admin/users/:id', () => {
  it('student is blocked (403)', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT update a student name (403)', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Marie Curie-Sklodowska' })
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT update a teacher (403)', async () => {
    const res = await request(app)
      .patch('/api/admin/users/-2')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Pilote Renomme' })
    expect(res.status).toBe(403)
  })

  it('teacher bloque sur update vide (403)', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({})
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════
//  POST /api/admin/users/:id/reset-password
// ═══════════════════════════════════════════
describe('POST /api/admin/users/:id/reset-password', () => {
  it('student is blocked (403)', async () => {
    const res = await request(app)
      .post('/api/admin/users/2/reset-password')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT reset a student password (403)', async () => {
    const res = await request(app)
      .post('/api/admin/users/2/reset-password')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT reset a teacher password (403)', async () => {
    const res = await request(app)
      .post('/api/admin/users/-2/reset-password')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════
//  DELETE /api/admin/users/:id
// ═══════════════════════════════════════════
describe('DELETE /api/admin/users/:id', () => {
  let deletableStudentId

  beforeAll(() => {
    const db = getTestDb()
    const info = db.prepare(
      `INSERT INTO students (promo_id, name, email, avatar_initials, password, must_change_password)
       VALUES (1, 'A Supprimer', 'suppr@test.fr', 'AS', 'hash', 0)`
    ).run()
    deletableStudentId = info.lastInsertRowid
  })

  it('student is blocked (403)', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${deletableStudentId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT delete a student (403)', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${deletableStudentId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT delete a teacher with role=teacher (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/users/-1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CANNOT delete a teacher with role=pilote (403)', async () => {
    const res = await request(app)
      .delete('/api/admin/users/-2')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })
})
