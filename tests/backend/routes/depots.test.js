/**
 * Tests unitaires pour les routes dépôts (note et feedback).
 */
const express = require('express')
const request = require('supertest')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let app

beforeAll(() => {
  setupTestDb()

  // Create a travail + depot for testing note/feedback
  const db = getTestDb()
  db.prepare(`
    INSERT INTO travaux (id, promo_id, channel_id, title, deadline, type, published, requires_submission)
    VALUES (100, 1, 1, 'Test Devoir', '2099-12-31T23:59:00Z', 'livrable', 1, 1)
  `).run()
  db.prepare(`
    INSERT INTO depots (id, travail_id, student_id, file_name, file_path)
    VALUES (200, 100, 1, 'rapport.pdf', '/tmp/rapport.pdf')
  `).run()

  app = express()
  app.use(express.json())

  // Auth middleware mock - sets req.user for teacher by default
  app.use((req, _res, next) => {
    // Allow overriding via custom header for 401 tests
    if (req.headers['x-no-auth'] === 'true') {
      // Simulate no auth
      req.user = undefined
      return next()
    }
    req.user = { id: 1, type: 'teacher', name: 'Prof Test' }
    next()
  })

  app.use('/api/depots', require('../../../server/routes/depots'))
})

afterAll(() => teardownTestDb())

describe('POST /api/depots/note', () => {
  it('sets note on a depot (teacher)', async () => {
    const res = await request(app)
      .post('/api/depots/note')
      .send({ depot_id: 200, note: '15' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 403 for student trying to set note', async () => {
    // Override the middleware to set student type
    const studentApp = express()
    studentApp.use(express.json())
    studentApp.use((req, _res, next) => {
      req.user = { id: 1, type: 'student', name: 'Jean Dupont' }
      next()
    })
    studentApp.use('/api/depots', require('../../../server/routes/depots'))

    const res = await request(studentApp)
      .post('/api/depots/note')
      .send({ depot_id: 200, note: '15' })
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })
})

describe('POST /api/depots/feedback', () => {
  it('sets feedback on a depot (teacher)', async () => {
    const res = await request(app)
      .post('/api/depots/feedback')
      .send({ depot_id: 200, feedback: 'Bon travail' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 403 for student trying to give feedback', async () => {
    const studentApp = express()
    studentApp.use(express.json())
    studentApp.use((req, _res, next) => {
      req.user = { id: 1, type: 'student', name: 'Jean Dupont' }
      next()
    })
    studentApp.use('/api/depots', require('../../../server/routes/depots'))

    const res = await request(studentApp)
      .post('/api/depots/feedback')
      .send({ depot_id: 200, feedback: 'Feedback étudiant' })
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })
})

describe('Auth required', () => {
  it('returns error for invalid data without proper fields', async () => {
    const res = await request(app)
      .post('/api/depots/note')
      .send({})
    // Without auth middleware or valid body, server returns 500 (crash on req.user)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('GET /api/depots', () => {
  it('returns depots for a travail', async () => {
    const res = await request(app)
      .get('/api/depots?travailId=100')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('returns empty array for travail with no depots', async () => {
    const res = await request(app)
      .get('/api/depots?travailId=9999')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})

describe('POST /api/depots (submit depot)', () => {
  it('teacher can submit a depot for any student', async () => {
    const res = await request(app)
      .post('/api/depots')
      .send({
        travail_id: 100,
        student_id: 1,
        type: 'link',
        content: 'https://github.com/example',
        link_url: 'https://github.com/example',
      })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student can submit for themselves', async () => {
    const studentApp = express()
    studentApp.use(express.json())
    studentApp.use((req, _res, next) => {
      req.user = { id: 1, type: 'student', name: 'Jean Dupont', promo_id: 1 }
      next()
    })
    studentApp.use('/api/depots', require('../../../server/routes/depots'))

    const res = await request(studentApp)
      .post('/api/depots')
      .send({
        travail_id: 100,
        student_id: 1,
        type: 'file',
        content: '/uploads/test.pdf',
        file_name: 'test.pdf',
      })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('student cannot submit for another student (403)', async () => {
    const studentApp = express()
    studentApp.use(express.json())
    studentApp.use((req, _res, next) => {
      req.user = { id: 1, type: 'student', name: 'Jean Dupont', promo_id: 1 }
      next()
    })
    studentApp.use('/api/depots', require('../../../server/routes/depots'))

    const res = await request(studentApp)
      .post('/api/depots')
      .send({
        travail_id: 100,
        student_id: 99,
        type: 'file',
        content: '/uploads/hack.pdf',
        file_name: 'hack.pdf',
      })
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('student cannot submit for travail of another promo (403)', async () => {
    const db = getTestDb()
    db.exec("INSERT OR IGNORE INTO promotions (id, name, color) VALUES (2, 'Promo B', '#E74C3C')")
    db.exec(`
      INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published, requires_submission)
      VALUES (101, 2, 1, 'Other Promo Devoir', '2099-12-31T23:59:00Z', 'livrable', 1, 1)
    `)

    const studentApp = express()
    studentApp.use(express.json())
    studentApp.use((req, _res, next) => {
      req.user = { id: 1, type: 'student', name: 'Jean Dupont', promo_id: 1 }
      next()
    })
    studentApp.use('/api/depots', require('../../../server/routes/depots'))

    const res = await request(studentApp)
      .post('/api/depots')
      .send({
        travail_id: 101,
        student_id: 1,
        type: 'file',
        content: '/uploads/cross.pdf',
        file_name: 'cross.pdf',
      })
    expect(res.status).toBe(403)
  })

  it('rejects invalid payload (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/depots')
      .send({ travail_id: 100 })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /api/depots/note validation', () => {
  it('rejects note without depot_id', async () => {
    const res = await request(app)
      .post('/api/depots/note')
      .send({ note: '15' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects note without note value', async () => {
    const res = await request(app)
      .post('/api/depots/note')
      .send({ depot_id: 200 })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /api/depots/feedback validation', () => {
  it('rejects feedback without depot_id', async () => {
    const res = await request(app)
      .post('/api/depots/feedback')
      .send({ feedback: 'Good' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
