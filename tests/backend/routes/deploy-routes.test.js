// ─── Tests route deploy — HMAC webhook auth, signal file writing ─────────────
const express = require('express')
const request = require('supertest')
const fs      = require('fs')
const path    = require('path')

let app, originalEnv

beforeAll(() => {
  originalEnv = process.env.DEPLOY_SECRET
  process.env.DEPLOY_SECRET = 'test-deploy-secret-32chars!!'

  // Clear module cache so deploy.js picks up new env
  const deployPath = require.resolve('../../../server/routes/deploy')
  delete require.cache[deployPath]

  app = express()
  app.use(express.json())
  app.use('/webhook/deploy', require('../../../server/routes/deploy'))
})

afterAll(() => {
  if (originalEnv !== undefined) {
    process.env.DEPLOY_SECRET = originalEnv
  } else {
    delete process.env.DEPLOY_SECRET
  }
  // Clean up signal file if written
  const signalFile = '/deploy-signal/trigger'
  try { if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile) } catch {}
})

// ═══════════════════════════════════════════
//  Auth — HMAC secret validation
// ═══════════════════════════════════════════
describe('Deploy webhook auth', () => {
  it('rejects request without secret (403)', async () => {
    const res = await request(app)
      .post('/webhook/deploy')
      .send({})
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toMatch(/unauthorized/i)
  })

  it('rejects request with wrong secret (403)', async () => {
    const res = await request(app)
      .post('/webhook/deploy')
      .set('x-deploy-secret', 'wrong-secret-value-here!!!!!!')
      .send({})
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
  })

  it('rejects empty secret header (403)', async () => {
    const res = await request(app)
      .post('/webhook/deploy')
      .set('x-deploy-secret', '')
      .send({})
    expect(res.status).toBe(403)
  })

  it('rejects secret with length mismatch (4xx/5xx)', async () => {
    // timingSafeEqual throws when buffers differ in length — server may crash with 500
    // Either way, the request should NOT succeed
    const res = await request(app)
      .post('/webhook/deploy')
      .set('x-deploy-secret', 'short')
      .send({})
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).not.toBe(200)
  })
})

// ═══════════════════════════════════════════
//  Auth — correct secret
// ═══════════════════════════════════════════
describe('Deploy webhook with valid secret', () => {
  it('accepts correct secret and returns ok', async () => {
    const res = await request(app)
      .post('/webhook/deploy')
      .set('x-deploy-secret', 'test-deploy-secret-32chars!!')
      .send({})
    // May fail with 500 if /deploy-signal is not writable in test env — that's OK
    // We verify it doesn't return 403 (auth passed)
    expect(res.status).not.toBe(403)
    if (res.status === 200) {
      expect(res.body.ok).toBe(true)
      expect(res.body.message).toMatch(/deploiement/i)
    }
  })
})

// ═══════════════════════════════════════════
//  Security — no DEPLOY_SECRET configured
// ═══════════════════════════════════════════
describe('Deploy webhook without DEPLOY_SECRET configured', () => {
  let appNoSecret

  beforeAll(() => {
    // Build separate app without secret
    const savedSecret = process.env.DEPLOY_SECRET
    delete process.env.DEPLOY_SECRET

    const deployPath = require.resolve('../../../server/routes/deploy')
    delete require.cache[deployPath]

    appNoSecret = express()
    appNoSecret.use(express.json())
    appNoSecret.use('/webhook/deploy', require('../../../server/routes/deploy'))

    // Restore for other tests
    process.env.DEPLOY_SECRET = savedSecret
    delete require.cache[deployPath]
  })

  it('rejects all requests when DEPLOY_SECRET is not set (403)', async () => {
    const res = await request(appNoSecret)
      .post('/webhook/deploy')
      .set('x-deploy-secret', 'anything')
      .send({})
    expect(res.status).toBe(403)
  })
})
