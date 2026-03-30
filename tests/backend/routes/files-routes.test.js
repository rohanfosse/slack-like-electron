// ─── Tests route fichiers — upload, extension blocking, size limit ────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const path    = require('path')
const fs      = require('fs')
const { setupTestDb, teardownTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, teacherToken, studentToken, uploadDir

beforeAll(() => {
  setupTestDb()

  // Tokens
  teacherToken = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)

  // Temporary upload dir for tests
  uploadDir = path.join(__dirname, '../../.tmp-uploads-test')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  process.env.UPLOAD_DIR = path.dirname(uploadDir) // files.js appends /uploads
  // Override to match expected dir
  process.env.UPLOAD_DIR = path.dirname(uploadDir)

  // Express app
  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')

  // Re-require files route after setting UPLOAD_DIR — but module may be cached.
  // Clear cache to pick up new UPLOAD_DIR
  const filesRoutePath = require.resolve('../../../server/routes/files')
  delete require.cache[filesRoutePath]

  app.use('/api/files', auth, require('../../../server/routes/files'))
}, 30_000)

afterAll(() => {
  teardownTestDb()
  // Cleanup temp upload dir
  if (uploadDir && fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir)
    for (const f of files) fs.unlinkSync(path.join(uploadDir, f))
    fs.rmdirSync(uploadDir)
  }
  delete process.env.UPLOAD_DIR
})

// ═══════════════════════════════════════════
//  POST /api/files/upload — happy path
// ═══════════════════════════════════════════
describe('POST /api/files/upload', () => {
  it('teacher CAN upload a valid file (200)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', Buffer.from('hello world'), 'test-doc.pdf')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toMatch(/^\/uploads\//)
    expect(res.body.file_size).toBeGreaterThan(0)
  })

  it('student CAN upload a valid file (200)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('student file'), 'rapport.docx')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toMatch(/^\/uploads\//)
  })

  it('unauthenticated request is rejected (401)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', Buffer.from('anon'), 'file.txt')
    expect(res.status).toBe(401)
  })

  it('request without file returns 400', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toMatch(/aucun fichier/i)
  })
})

// ═══════════════════════════════════════════
//  Blocked extensions
// ═══════════════════════════════════════════
describe('Blocked extensions', () => {
  const blockedExts = ['.exe', '.bat', '.php', '.html', '.svg', '.sh', '.ps1', '.dll']

  for (const ext of blockedExts) {
    it(`rejects ${ext} files (400)`, async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('malicious'), `malware${ext}`)
      expect(res.status).toBe(400)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toMatch(/non autorisé/i)
    })
  }
})

// ═══════════════════════════════════════════
//  File naming — crypto random + sanitized
// ═══════════════════════════════════════════
describe('File naming security', () => {
  it('generates unique filename with timestamp and random hex', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', Buffer.from('content'), 'my file (1).pdf')
    expect(res.status).toBe(200)
    // Should contain timestamp_hex_sanitized.pdf pattern
    const filename = res.body.data.replace('/uploads/', '')
    expect(filename).toMatch(/^\d+_[a-f0-9]+_.*\.pdf$/)
    // No spaces or parentheses in the sanitized filename
    expect(filename).not.toMatch(/[\s()]/)
  })
})
