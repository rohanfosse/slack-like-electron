// ─── Tests routes /api/bookmarks ────────────────────────────────────────────
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars!!'
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app
let studentToken, otherStudentToken, teacherToken
let msgPromo1, msgPromo2, dmMsg

beforeAll(() => {
  setupTestDb()
  const db = getTestDb()

  // Promo 2 + canal promo 2 + etudiant promo 2
  db.exec(`INSERT OR IGNORE INTO promotions (id, name, color) VALUES (2, 'Promo B', '#E74C3C')`)
  db.exec(`INSERT OR IGNORE INTO channels (id, promo_id, name, type) VALUES (10, 2, 'promo2-general', 'chat')`)
  db.prepare(
    `INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
     VALUES (2, 2, 'Alice Martin', 'alice@test.fr', 'AM', 'hash', 0)`
  ).run()

  // Messages : un dans promo 1 (accessible a student1), un dans promo 2 (pas accessible),
  // un DM entre student1 et prof
  db.prepare(
    `INSERT INTO messages (id, channel_id, author_id, author_name, author_type, content)
     VALUES (100, 1, 1, 'Jean Dupont', 'student', 'Message promo 1')`
  ).run()
  msgPromo1 = 100

  db.prepare(
    `INSERT INTO messages (id, channel_id, author_id, author_name, author_type, content)
     VALUES (200, 10, 2, 'Alice Martin', 'student', 'Message promo 2')`
  ).run()
  msgPromo2 = 200

  db.prepare(
    `INSERT INTO messages (id, dm_student_id, author_id, author_name, author_type, content)
     VALUES (300, 1, -1, 'Prof Test', 'teacher', 'DM prof a student1')`
  ).run()
  dmMsg = 300

  studentToken      = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  otherStudentToken = jwt.sign({ id: 2, name: 'Alice Martin', type: 'student', promo_id: 2 }, JWT_SECRET)
  teacherToken      = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/bookmarks', auth, require('../../../server/routes/bookmarks'))
})

afterAll(() => teardownTestDb())

describe('POST /api/bookmarks', () => {
  test('un etudiant peut bookmarker un message de sa promo', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: msgPromo1, note: 'important' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.messageId).toBe(msgPromo1)
    expect(res.body.data.note).toBe('important')
  })

  test('un etudiant ne peut PAS bookmarker un message d une autre promo', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: msgPromo2 })
    expect(res.status).toBe(403)
  })

  test('un teacher peut bookmarker n importe quel message', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ messageId: msgPromo2 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('un etudiant peut bookmarker son DM', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: dmMsg })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('double bookmark idempotent (update note uniquement)', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: msgPromo1, note: 'updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.note).toBe('updated')
  })

  test('rejette un message inexistant', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: 999999 })
    expect(res.status).toBe(404)
  })

  test('rejette messageId manquant', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('GET /api/bookmarks', () => {
  test('liste les bookmarks de l utilisateur avec le contenu hydrate', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    const ids = res.body.data.map(b => b.id)
    expect(ids).toContain(msgPromo1)
    expect(ids).toContain(dmMsg)
    // Chaque entree contient author_name + channel/DM context
    const entry = res.body.data.find(b => b.id === msgPromo1)
    expect(entry.author_name).toBe('Jean Dupont')
    expect(entry.channel_name).toBe('general')
  })

  test('isolation : un etudiant ne voit pas les bookmarks d un autre', async () => {
    // Le teacher avait bookmarke msgPromo2, mais student2 ne l'a pas
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${otherStudentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(0)
  })
})

describe('GET /api/bookmarks/ids', () => {
  test('retourne le Set d IDs + count', async () => {
    const res = await request(app)
      .get('/api/bookmarks/ids')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBeGreaterThanOrEqual(2)
    expect(res.body.data.ids).toEqual(expect.arrayContaining([msgPromo1, dmMsg]))
  })
})

describe('DELETE /api/bookmarks/:messageId', () => {
  test('supprime un bookmark', async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${msgPromo1}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.removed).toBe(1)
  })

  test('supprimer un bookmark inexistant est idempotent', async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${msgPromo1}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.removed).toBe(0)
  })

  test('isolation : on ne peut pas supprimer le bookmark d un autre user', async () => {
    // Le teacher avait bookmarke msgPromo2 ; student2 tente de supprimer
    const res = await request(app)
      .delete(`/api/bookmarks/${msgPromo2}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.removed).toBe(0) // rien a supprimer cote student2
    // Le bookmark du teacher existe toujours
    const teacherList = await request(app)
      .get('/api/bookmarks/ids')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(teacherList.body.data.ids).toContain(msgPromo2)
  })
})

describe('POST /api/bookmarks/import', () => {
  test('import en masse (migration localStorage)', async () => {
    // Student1 importe msgPromo1 + DM (apres avoir supprime msgPromo1 au test precedent)
    const res = await request(app)
      .post('/api/bookmarks/import')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageIds: [msgPromo1, dmMsg, 999999] })
    expect(res.status).toBe(200)
    // msgPromo1 inserted (supprime avant), dmMsg deja present donc ignore, 999999 inexistant
    expect(res.body.data.inserted).toBeGreaterThanOrEqual(1)
  })

  test('rejette un tableau trop grand', async () => {
    const big = Array.from({ length: 501 }, (_, i) => i + 1)
    const res = await request(app)
      .post('/api/bookmarks/import')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageIds: big })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('suppression de message cascade', () => {
  test('un bookmark sur un message soft-delete n apparait plus dans la liste', () => {
    const db = getTestDb()
    // soft-delete le DM
    db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE id = ?`).run(dmMsg)

    return request(app)
      .get('/api/bookmarks/ids')
      .set('Authorization', `Bearer ${studentToken}`)
      .then(res => {
        expect(res.status).toBe(200)
        expect(res.body.data.ids).not.toContain(dmMsg)
      })
  })
})
