// ─── Tests route kanban — CRUD cartes, move, isolation promo ─────────────────
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

  // Travail in promo 1 and group in promo 1
  db.prepare(
    `INSERT OR IGNORE INTO travaux (id, promo_id, title, deadline, type) VALUES (1, 1, 'TP1', '2030-01-01', 'livrable')`
  ).run()
  db.prepare(
    `INSERT OR IGNORE INTO groups (id, promo_id, name) VALUES (1, 1, 'Groupe Test')`
  ).run()

  // Travail in promo 2
  db.prepare(
    `INSERT OR IGNORE INTO travaux (id, promo_id, title, deadline, type) VALUES (2, 2, 'TP2', '2030-01-01', 'livrable')`
  ).run()

  teacherToken  = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken  = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  student2Token = jwt.sign({ id: 2, name: 'Alice Martin', type: 'student', promo_id: 2 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/kanban', auth, require('../../../server/routes/kanban'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  CRUD cards
// ═══════════════════════════════════════════
describe('Kanban cards CRUD', () => {
  let cardId

  it('student in same promo CAN create a card (200)', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Tache 1', description: 'Ma description' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.title).toBe('Tache 1')
    expect(res.body.data.status).toBe('todo')
    cardId = res.body.data.id
  })

  it('student in different promo CANNOT create a card (403)', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ title: 'Interdit' })
    expect(res.status).toBe(403)
  })

  it('teacher CAN create a card', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Tache Prof' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('CAN get cards for a travail/group', async () => {
    const res = await request(app)
      .get('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('CAN update a card (PATCH)', async () => {
    const res = await request(app)
      .patch(`/api/kanban/cards/${cardId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Tache 1 Updated', description: 'Nouvelle description' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.title).toBe('Tache 1 Updated')
  })

  it('CAN move a card to a new status', async () => {
    const res = await request(app)
      .patch(`/api/kanban/cards/${cardId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'doing', position: 0 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.status).toBe('doing')
  })

  it('CAN move a card to done', async () => {
    const res = await request(app)
      .patch(`/api/kanban/cards/${cardId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'done' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('done')
  })

  it('CAN delete a card', async () => {
    const res = await request(app)
      .delete(`/api/kanban/cards/${cardId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════
//  Validation
// ═══════════════════════════════════════════
describe('Kanban validation', () => {
  it('rejects card without title', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ description: 'No title' })
    // Zod validation rejects missing required title
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects card with empty title', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: '' })
    // Zod validation rejects empty string (min 1)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects update with invalid status', async () => {
    // Create a card first
    const create = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'For validation' })
    const id = create.body.data.id

    const res = await request(app)
      .patch(`/api/kanban/cards/${id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'invalid_status' })
    // Zod validation rejects invalid enum value
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
