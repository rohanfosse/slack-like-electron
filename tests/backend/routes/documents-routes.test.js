/**
 * Tests for documents routes — CRUD, search, project documents.
 */
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app
let teacherToken, studentToken

beforeAll(() => {
  setupTestDb()
  const db = getTestDb()

  // Seed channel with category (project-linked)
  db.exec(`
    INSERT OR IGNORE INTO channels (id, promo_id, name, type, category)
    VALUES (20, 1, 'Canal Web Dev', 'chat', 'Web Dev')
  `)

  // Seed a travail for linking
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published)
    VALUES (50, 1, 1, 'Travail Link', '2099-12-31T23:59:00Z', 'livrable', 1)
  `)

  // Seed documents
  db.exec(`
    INSERT OR IGNORE INTO channel_documents (id, channel_id, promo_id, project, type, name, path_or_url, category)
    VALUES (10, 1, 1, NULL, 'link', 'Doc Channel 1', 'https://example.com/doc1', 'Cours')
  `)
  db.exec(`
    INSERT OR IGNORE INTO channel_documents (id, channel_id, promo_id, project, type, name, path_or_url, category)
    VALUES (11, 20, 1, 'Web Dev', 'link', 'Doc Project WD', 'https://example.com/wd', 'TP')
  `)

  // Tokens
  teacherToken = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)

  // Express app
  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/documents', auth, require('../../../server/routes/documents'))
})

afterAll(() => teardownTestDb())

// ═════════════════════════════════════════════
//  GET /api/documents/channel/:channelId/categories
// ═════════════════════════════════════════════
describe('GET /api/documents/channel/:channelId/categories', () => {
  it('returns categories for a channel', async () => {
    const res = await request(app)
      .get('/api/documents/channel/1/categories')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ═════════════════════════════════════════════
//  GET /api/documents/search
// ═════════════════════════════════════════════
describe('GET /api/documents/search', () => {
  it('searches documents by name', async () => {
    const res = await request(app)
      .get('/api/documents/search?promoId=1&q=Doc')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('returns empty for no match', async () => {
    const res = await request(app)
      .get('/api/documents/search?promoId=1&q=zzz_nonexistent_zzz')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})

// ═════════════════════════════════════════════
//  PATCH /api/documents/link/:id
// ═════════════════════════════════════════════
describe('PATCH /api/documents/link/:id', () => {
  it('links a document to a travail', async () => {
    const res = await request(app)
      .patch('/api/documents/link/10')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ travailId: 50 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('unlinks a document (null travailId)', async () => {
    const res = await request(app)
      .patch('/api/documents/link/10')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ travailId: null })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('rejects student linking a document (403)', async () => {
    const res = await request(app)
      .patch('/api/documents/link/10')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ travailId: 50 })
    expect(res.status).toBe(403)
  })
})

// ═════════════════════════════════════════════
//  PATCH /api/documents/project/:id
// ═════════════════════════════════════════════
describe('PATCH /api/documents/project/:id', () => {
  it('updates document name and category', async () => {
    const res = await request(app)
      .patch('/api/documents/project/11')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Updated Doc', category: 'Ressources' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('rejects student update (403)', async () => {
    const res = await request(app)
      .patch('/api/documents/project/11')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Hack' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for non-existent document', async () => {
    const res = await request(app)
      .patch('/api/documents/project/99999')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Ghost' })
    expect(res.status).toBe(404)
  })
})

// ═════════════════════════════════════════════
//  GET /api/documents/project
// ═════════════════════════════════════════════
describe('GET /api/documents/project', () => {
  it('returns project documents for a promo', async () => {
    const res = await request(app)
      .get('/api/documents/project?promoId=1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('filters by project name', async () => {
    const res = await request(app)
      .get('/api/documents/project?promoId=1&project=Web%20Dev')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ═════════════════════════════════════════════
//  GET /api/documents/project/categories
// ═════════════════════════════════════════════
describe('GET /api/documents/project/categories', () => {
  it('returns project document categories', async () => {
    const res = await request(app)
      .get('/api/documents/project/categories?promoId=1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('filters categories by project', async () => {
    const res = await request(app)
      .get('/api/documents/project/categories?promoId=1&project=Web%20Dev')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ═════════════════════════════════════════════
//  POST /api/documents/project
// ═════════════════════════════════════════════
describe('POST /api/documents/project', () => {
  it('teacher can create a project document', async () => {
    const res = await request(app)
      .post('/api/documents/project')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        promoId: 1,
        project: 'Web Dev',
        type: 'link',
        name: 'New Project Doc',
        pathOrUrl: 'https://example.com/new-project',
        authorName: 'Prof Test',
        authorType: 'teacher',
      })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student cannot create a project document (403)', async () => {
    const res = await request(app)
      .post('/api/documents/project')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        promoId: 1,
        project: 'Web Dev',
        type: 'link',
        name: 'Student Hack',
        pathOrUrl: 'https://example.com/hack',
      })
    expect(res.status).toBe(403)
  })
})

// ═════════════════════════════════════════════
//  DELETE /api/documents/channel/:id
// ═════════════════════════════════════════════
describe('DELETE /api/documents/channel/:id (additional)', () => {
  it('returns 404 for non-existent document', async () => {
    const res = await request(app)
      .delete('/api/documents/channel/99999')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(404)
  })
})
