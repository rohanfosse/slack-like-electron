// ─── Security regression tests — one test per audit fix ──────────────────────
// Prevents regressions on C1, C3, H1, H2, H3, H5, H6, H7, H8, H9.
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, db
let studentToken, student2Token, teacherToken, taToken, adminToken

beforeAll(() => {
  setupTestDb()
  db = getTestDb()

  // ── Seed promo 2 + student 2 ────────────────────────────────────────────────
  db.exec(`INSERT OR IGNORE INTO promotions (id, name, color) VALUES (2, 'Promo B', '#E74C3C')`)
  db.prepare(
    `INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
     VALUES (2, 2, 'Alice Martin', 'alice@test.fr', 'AM', 'hash', 0)`
  ).run()

  // ── Seed travail in promo 1 + group ─────────────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO travaux (id, promo_id, title, deadline, type) VALUES (1, 1, 'TP1', '2030-01-01', 'livrable')`
  ).run()
  db.prepare(
    `INSERT OR IGNORE INTO groups (id, promo_id, name) VALUES (1, 1, 'Groupe A')`
  ).run()

  // ── Seed kanban card in promo 1 (travail 1) ────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO kanban_cards (id, travail_id, group_id, title, status, position, created_by)
     VALUES (1, 1, 1, 'Card promo1', 'todo', 0, 'Jean')`
  ).run()

  // ── Seed project in promo 1 ─────────────────────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO projects (id, promo_id, name, created_by) VALUES (1, 1, 'Projet Alpha', 1)`
  ).run()

  // ── Seed depot for student 1 in travail 1 ──────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO depots (id, travail_id, student_id, file_name, file_path)
     VALUES (1, 1, 1, 'rapport.pdf', '/uploads/rapport.pdf')`
  ).run()

  // ── Seed depot for student 2 (should not be visible to student 1) ──────────
  db.prepare(
    `INSERT OR IGNORE INTO depots (id, travail_id, student_id, file_name, file_path)
     VALUES (2, 1, 2, 'rapport2.pdf', '/uploads/rapport2.pdf')`
  ).run()

  // ── Seed rubric for travail 1 ──────────────────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO rubrics (id, travail_id, title) VALUES (1, 1, 'Grille TP1')`
  ).run()

  // ── Seed live session in promo 1 ───────────────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO live_sessions (id, teacher_id, promo_id, title, status, join_code)
     VALUES (1, 1, 1, 'Live Promo1', 'active', 'LIVE01')`
  ).run()

  // ── Seed message in student 1 DM (for signatures test) ─────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO messages (id, dm_student_id, author_name, author_type, content)
     VALUES (1, 1, 'Jean Dupont', 'student', 'Mon doc a signer')`
  ).run()

  // ── Seed signature request for student 1 ───────────────────────────────────
  db.prepare(
    `INSERT OR IGNORE INTO signature_requests (id, message_id, dm_student_id, file_url, file_name, status)
     VALUES (1, 1, 1, '/uploads/test.pdf', 'test.pdf', 'pending')`
  ).run()

  // ── Tokens ──────────────────────────────────────────────────────────────────
  studentToken  = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  student2Token = jwt.sign({ id: 2, name: 'Alice Martin', type: 'student', promo_id: 2 }, JWT_SECRET)
  teacherToken  = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  taToken       = jwt.sign({ id: -2, name: 'TA Test', type: 'ta', promo_id: null }, JWT_SECRET)
  adminToken    = jwt.sign({ id: -1, name: 'Admin Test', type: 'admin', promo_id: null }, JWT_SECRET)

  // ── Build Express app with all relevant routes ─────────────────────────────
  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)

  // Stub socket.io to prevent crashes on emit
  app.set('io', { to: () => ({ emit: () => {} }) })

  const auth = require('../../../server/middleware/auth')
  app.use('/api', auth)

  // Read-only middleware (mirrors server/index.js)
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next()
    try {
      const { getAppConfig } = require('../../../server/db/models/admin')
      const { hasRole } = require('../../../server/permissions')
      if (getAppConfig('read_only') === '1' && !hasRole(req.user?.type, 'ta')) {
        return res.status(503).json({ ok: false, error: 'La plateforme est en mode lecture seule.' })
      }
    } catch { /* skip */ }
    next()
  })

  // Mount routes
  app.use('/api/kanban',      require('../../../server/routes/kanban'))
  app.use('/api/assignments',  require('../../../server/routes/assignments'))
  app.use('/api/live',         require('../../../server/routes/live'))
  app.use('/api/projects',     require('../../../server/routes/projects'))
  app.use('/api/rubrics',      require('../../../server/routes/rubrics'))
  app.use('/api/signatures',   require('../../../server/routes/signatures'))
  app.use('/api/depots',       require('../../../server/routes/depots'))
}, 30_000)

afterAll(() => teardownTestDb())

// ═══════════════════════════════════════════════════════════════════════════════
//  C1 — Kanban: student from promo 2 CANNOT patch/delete a card in promo 1
// ═══════════════════════════════════════════════════════════════════════════════
describe('C1 — Kanban cross-promo isolation', () => {
  it('student from promo 2 CANNOT patch a card in promo 1', async () => {
    const res = await request(app)
      .patch('/api/kanban/cards/1')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ title: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('student from promo 2 CANNOT delete a card in promo 1', async () => {
    const res = await request(app)
      .delete('/api/kanban/cards/1')
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  C3 — Read-only mode: admin CAN still write when read_only is enabled
// ═══════════════════════════════════════════════════════════════════════════════
describe('C3 — Read-only mode bypass for admin/teacher', () => {
  beforeAll(() => {
    db.prepare("INSERT OR REPLACE INTO app_config (key, value) VALUES ('read_only', '1')").run()
  })

  afterAll(() => {
    db.prepare("DELETE FROM app_config WHERE key = 'read_only'").run()
  })

  it('student is blocked by read_only (503)', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Blocked' })
    expect(res.status).toBe(503)
  })

  it('teacher CAN still write when read_only is enabled (not 503)', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Teacher bypass' })
    expect(res.status).not.toBe(503)
    expect(res.body.ok).toBe(true)
  })

  it('admin CAN still write when read_only is enabled (not 503)', async () => {
    const res = await request(app)
      .post('/api/kanban/travaux/1/groups/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin bypass' })
    expect(res.status).not.toBe(503)
    expect(res.body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H1 — Teacher schedule: student gets 403
// ═══════════════════════════════════════════════════════════════════════════════
describe('H1 — Teacher schedule restricted to teachers', () => {
  it('student CANNOT access teacher-schedule (403)', async () => {
    const res = await request(app)
      .get('/api/assignments/teacher-schedule')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('teacher CAN access teacher-schedule', async () => {
    const res = await request(app)
      .get('/api/assignments/teacher-schedule')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H3 — Live leaderboard: student from promo 2 CANNOT access promo 1
// ═══════════════════════════════════════════════════════════════════════════════
describe('H3 — Live leaderboard promo isolation', () => {
  it('student from promo 2 CANNOT access promo 1 leaderboard', async () => {
    const res = await request(app)
      .get('/api/live/sessions/1/leaderboard')
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })

  it('student from promo 1 CAN access promo 1 leaderboard', async () => {
    const res = await request(app)
      .get('/api/live/sessions/1/leaderboard')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H5 — TA my-projects: student gets 403
// ═══════════════════════════════════════════════════════════════════════════════
describe('H5 — TA my-projects restricted to teachers/TAs', () => {
  it('student CANNOT access /ta/my-projects (403)', async () => {
    const res = await request(app)
      .get('/api/projects/ta/my-projects')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('TA CAN access /ta/my-projects', async () => {
    const res = await request(app)
      .get('/api/projects/ta/my-projects')
      .set('Authorization', `Bearer ${taToken}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H6 — Projects by promo: student from promo 2 CANNOT list promo 1 projects
// ═══════════════════════════════════════════════════════════════════════════════
describe('H6 — Projects by promo isolation', () => {
  it('student from promo 2 CANNOT list promo 1 projects', async () => {
    const res = await request(app)
      .get('/api/projects/promo/1')
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })

  it('student from promo 1 CAN list promo 1 projects', async () => {
    const res = await request(app)
      .get('/api/projects/promo/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H7 — Rubric: student from promo 2 CANNOT read promo 1 rubric
// ═══════════════════════════════════════════════════════════════════════════════
describe('H7 — Rubric promo isolation', () => {
  it('student from promo 2 CANNOT read promo 1 rubric', async () => {
    const res = await request(app)
      .get('/api/rubrics/1')
      .set('Authorization', `Bearer ${student2Token}`)
    expect(res.status).toBe(403)
  })

  it('student from promo 1 CAN read promo 1 rubric', async () => {
    const res = await request(app)
      .get('/api/rubrics/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H8 — Signatures by-message: student CANNOT read another student's signature
// ═══════════════════════════════════════════════════════════════════════════════
describe('H8 — Signatures by-message ownership', () => {
  it('student 2 CANNOT read student 1 signature (403)', async () => {
    const res = await request(app)
      .get('/api/signatures/by-message/1')
      .set('Authorization', `Bearer ${student2Token}`)
    // Should be 403 because dm_student_id (1) !== student2.id (2)
    expect(res.status).toBe(403)
  })

  it('student 1 CAN read their own signature', async () => {
    const res = await request(app)
      .get('/api/signatures/by-message/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  H9 — Depots: student only sees their own submissions, not peers
// ═══════════════════════════════════════════════════════════════════════════════
describe('H9 — Depots student filtering', () => {
  it('student 1 only sees their own depots (not student 2)', async () => {
    const res = await request(app)
      .get('/api/depots?travailId=1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const depots = res.body.data
    expect(Array.isArray(depots)).toBe(true)
    // All returned depots must belong to student 1
    for (const d of depots) {
      expect(d.student_id).toBe(1)
    }
    // Student 2's depot must NOT be present
    const student2Depot = depots.find(d => d.student_id === 2)
    expect(student2Depot).toBeUndefined()
  })

  it('teacher sees all depots', async () => {
    const res = await request(app)
      .get('/api/depots?travailId=1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const depots = res.body.data
    expect(depots.length).toBeGreaterThanOrEqual(2)
  })
})
