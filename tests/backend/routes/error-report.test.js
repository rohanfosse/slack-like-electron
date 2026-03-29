// ─── Tests route error-report — POST public (pas d'auth) ─────────────────────
const express = require('express')
const request = require('supertest')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let app

beforeAll(() => {
  setupTestDb()

  app = express()
  app.use(express.json())
  // Pas de middleware auth — route publique
  app.use('/api/report-error', require('../../../server/routes/error-report'))
})

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════
//  POST /api/report-error
// ═══════════════════════════════════════════
describe('POST /api/report-error', () => {
  it('accepts a valid error report (200)', async () => {
    const res = await request(app)
      .post('/api/report-error')
      .send({ message: 'Something broke', page: '/home', stack: 'Error at line 1', appVersion: '1.0.0' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('stores the error report in the database', async () => {
    const db = getTestDb()
    const row = db.prepare("SELECT * FROM error_reports WHERE message = 'Something broke'").get()
    expect(row).toBeDefined()
    expect(row.page).toBe('/home')
    expect(row.stack).toBe('Error at line 1')
    expect(row.app_version).toBe('1.0.0')
  })

  it('rejects a report without message (400)', async () => {
    const res = await request(app)
      .post('/api/report-error')
      .send({ page: '/home' })
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toMatch(/message/i)
  })

  it('accepts a report with only message (minimal body)', async () => {
    const res = await request(app)
      .post('/api/report-error')
      .send({ message: 'Minimal error' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('truncates very long messages to 2000 chars', async () => {
    const longMessage = 'x'.repeat(3000)
    const res = await request(app)
      .post('/api/report-error')
      .send({ message: longMessage })
    expect(res.status).toBe(200)

    const db = getTestDb()
    const row = db.prepare("SELECT message FROM error_reports ORDER BY id DESC LIMIT 1").get()
    expect(row.message.length).toBeLessThanOrEqual(2000)
  })

  it('truncates very long stacks to 5000 chars', async () => {
    const longStack = 's'.repeat(6000)
    const res = await request(app)
      .post('/api/report-error')
      .send({ message: 'stack test', stack: longStack })
    expect(res.status).toBe(200)

    const db = getTestDb()
    const row = db.prepare("SELECT stack FROM error_reports WHERE message = 'stack test'").get()
    expect(row.stack.length).toBeLessThanOrEqual(5000)
  })
})
