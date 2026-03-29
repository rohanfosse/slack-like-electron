// ─── Tests route groupes — CRUD, membres, isolation promo ────────────────────
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

  teacherToken  = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken  = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  student2Token = jwt.sign({ id: 2, name: 'Alice Martin', type: 'student', promo_id: 2 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/groups', auth, require('../../../server/routes/groups'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  CRUD — teacher only for write ops
// ═══════════════════════════════════════════
describe('Groups CRUD', () => {
  let groupId

  it('teacher CAN create a group (200)', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, name: 'Groupe Alpha' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    groupId = Number(res.body.data.lastInsertRowid)
    expect(groupId).toBeGreaterThan(0)
  })

  it('student CANNOT create a group (403)', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ promoId: 1, name: 'Interdit' })
    expect(res.status).toBe(403)
  })

  it('teacher CAN list groups for a promo', async () => {
    const res = await request(app)
      .get('/api/groups?promoId=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Groupe Alpha' })])
    )
  })

  it('student in same promo CAN list groups', async () => {
    const res = await request(app)
      .get('/api/groups?promoId=1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student in different promo CANNOT list groups (403)', async () => {
    const res = await request(app)
      .get('/api/groups?promoId=1')
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN delete a group', async () => {
    // Create a throwaway group
    const create = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, name: 'To Delete' })
    const deleteId = Number(create.body.data.lastInsertRowid)

    const res = await request(app)
      .delete(`/api/groups/${deleteId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student CANNOT delete a group (403)', async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════
//  Members
// ═══════════════════════════════════════════
describe('Group members', () => {
  let groupId

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, name: 'Groupe Membres' })
    groupId = Number(res.body.data.lastInsertRowid)
  })

  it('teacher CAN set group members', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ groupId, studentIds: [1] })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student CANNOT set group members (403)', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ groupId, studentIds: [1] })
    expect(res.status).toBe(403)
  })

  it('student in same promo CAN list group members', async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 1, name: 'Jean Dupont' })])
    )
  })

  it('student in different promo CANNOT list group members (403)', async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })
})
