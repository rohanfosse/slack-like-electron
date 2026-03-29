// ─── Tests route teacher-notes — CRUD carnet de suivi ────────────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, teacherToken, teacher2Token, studentToken

beforeAll(() => {
  setupTestDb()

  // Second teacher (id=2) for ownership tests
  const db = require('../helpers/setup').getTestDb()
  db.prepare(
    `INSERT OR REPLACE INTO teachers (id, name, email, password, must_change_password, role)
     VALUES (2, 'Prof Deux', 'prof2@test.fr', 'hash', 0, 'teacher')`
  ).run()

  teacherToken  = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  teacher2Token = jwt.sign({ id: -2, name: 'Prof Deux', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken  = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/teacher-notes', auth, require('../../../server/routes/teacher-notes'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  CRUD — teacher only
// ═══════════════════════════════════════════
describe('Teacher notes CRUD', () => {
  let noteId

  it('student CANNOT create a note (403)', async () => {
    const res = await request(app)
      .post('/api/teacher-notes')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentId: 1, promoId: 1, content: 'Interdit' })
    expect(res.status).toBe(403)
  })

  it('teacher CAN create a note (200)', async () => {
    const res = await request(app)
      .post('/api/teacher-notes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: 1, promoId: 1, content: 'Bonne progression', tag: 'progression' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.content).toBe('Bonne progression')
    expect(res.body.data.tag).toBe('progression')
    noteId = res.body.data.id
  })

  it('teacher CAN update own note', async () => {
    const res = await request(app)
      .patch(`/api/teacher-notes/${noteId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ content: 'Progression mise a jour', tag: 'objectif' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.content).toBe('Progression mise a jour')
    expect(res.body.data.tag).toBe('objectif')
  })

  it('another teacher CANNOT update note they do not own (403)', async () => {
    const res = await request(app)
      .patch(`/api/teacher-notes/${noteId}`)
      .set('Authorization', `Bearer ${teacher2Token}`)
      .send({ content: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('another teacher CANNOT delete note they do not own (403)', async () => {
    const res = await request(app)
      .delete(`/api/teacher-notes/${noteId}`)
      .set('Authorization', `Bearer ${teacher2Token}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN delete own note', async () => {
    const res = await request(app)
      .delete(`/api/teacher-notes/${noteId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  Validation
// ═══════════════════════════════════════════
describe('Teacher notes validation', () => {
  it('rejects note with empty content', async () => {
    const res = await request(app)
      .post('/api/teacher-notes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: 1, promoId: 1, content: '' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects note without studentId', async () => {
    const res = await request(app)
      .post('/api/teacher-notes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, content: 'Missing student' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects note with invalid tag', async () => {
    const res = await request(app)
      .post('/api/teacher-notes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: 1, promoId: 1, content: 'Test', tag: 'invalid_tag' })
    // Zod validation rejects invalid enum values
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// ═══════════════════════════════════════════
//  Read — teacher only, filtered by teacher
// ═══════════════════════════════════════════
describe('Teacher notes read', () => {
  beforeAll(async () => {
    // Create some notes for read tests
    await request(app)
      .post('/api/teacher-notes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: 1, promoId: 1, content: 'Note read test', tag: 'observation' })
  })

  it('teacher CAN get notes by student', async () => {
    const res = await request(app)
      .get('/api/teacher-notes/student/1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('student CANNOT get notes (403)', async () => {
    const res = await request(app)
      .get('/api/teacher-notes/student/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN get notes by promo', async () => {
    const res = await request(app)
      .get('/api/teacher-notes/promo/1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('teacher CAN get notes count summary by promo', async () => {
    const res = await request(app)
      .get('/api/teacher-notes/promo/1/summary')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('another teacher sees only their own notes (isolation)', async () => {
    const res = await request(app)
      .get('/api/teacher-notes/student/1')
      .set('Authorization', `Bearer ${teacher2Token}`)
    expect(res.status).toBe(200)
    // teacher2 has no notes for student 1
    expect(res.body.data).toHaveLength(0)
  })
})
