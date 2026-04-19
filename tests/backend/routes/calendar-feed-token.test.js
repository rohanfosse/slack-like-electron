/**
 * Tests pour l'abonnement iCal public (feed tokens).
 *
 * Verifie :
 *  - GET /feed-token renvoie null avant creation
 *  - POST /feed-token cree un token + URL
 *  - POST /feed-token 2x rotate le token (ancien invalide)
 *  - DELETE /feed-token revoque
 *  - /ical/:token.ics retourne 200 + VCALENDAR pour un token valide
 *  - /ical/:token.ics retourne 404 pour un token inconnu/revoque
 *  - Isolation : le token d'un user ne revele pas le calendrier d'un autre
 */
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app
let teacherToken
let studentToken

beforeAll(() => {
  setupTestDb()
  teacherToken = jwt.sign({ id: 1, name: 'Prof Test', type: 'teacher' }, JWT_SECRET)
  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  // Route publique (montee AVANT l'auth dans le vrai serveur)
  app.use('/ical', require('../../../server/routes/public-ical'))
  // Routes authentifiees
  const auth = require('../../../server/middleware/auth')
  app.use('/api/calendar', auth, require('../../../server/routes/calendar'))

  // Donnee iCal : au moins un rappel pour que le VCALENDAR contienne un VEVENT
  const db = getTestDb()
  db.prepare(`INSERT INTO teacher_reminders (promo_tag, date, title, description, bloc)
              VALUES ('T1', '2026-05-12', 'Reunion pedagogique', 'Salle B203', 'BL1')`).run()
})

afterAll(() => teardownTestDb())

describe('GET /api/calendar/feed-token', () => {
  it('returns null before any token is generated', async () => {
    const res = await request(app)
      .get('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.token).toBeNull()
    expect(res.body.data.url).toBeNull()
  })

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/calendar/feed-token')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/calendar/feed-token', () => {
  it('creates a token with a public URL ending in .ics', async () => {
    const res = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.token).toMatch(/^[A-Za-z0-9_-]{30,}$/)
    expect(res.body.data.url).toMatch(/\/ical\/[A-Za-z0-9_-]+\.ics$/)
    expect(res.body.data.url).toContain(res.body.data.token)
  })

  it('rotates the token on second call (old token becomes invalid)', async () => {
    const first = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    const second = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(second.body.data.token).not.toBe(first.body.data.token)

    // L'ancien token doit desormais 404 sur la route publique
    const oldFeed = await request(app).get(`/ical/${first.body.data.token}.ics`)
    expect(oldFeed.status).toBe(404)

    // Le nouveau token doit marcher
    const newFeed = await request(app).get(`/ical/${second.body.data.token}.ics`)
    expect(newFeed.status).toBe(200)
  })
})

describe('DELETE /api/calendar/feed-token', () => {
  it('revokes the subscription', async () => {
    const created = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    const token = created.body.data.token

    const del = await request(app)
      .delete('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(del.status).toBe(200)
    expect(del.body.data.revoked).toBe(true)

    // Apres revocation, l'URL publique doit 404
    const feed = await request(app).get(`/ical/${token}.ics`)
    expect(feed.status).toBe(404)

    // Et GET doit renvoyer null
    const get = await request(app)
      .get('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(get.body.data.token).toBeNull()
  })
})

describe('GET /ical/:token.ics (public)', () => {
  it('returns a valid VCALENDAR without JWT', async () => {
    const created = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    const token = created.body.data.token

    const res = await request(app).get(`/ical/${token}.ics`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/calendar/)
    expect(res.text).toMatch(/^BEGIN:VCALENDAR/)
    expect(res.text).toMatch(/END:VCALENDAR\s*$/)
    expect(res.text).toMatch(/Reunion pedagogique/)
  })

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).get('/ical/deadbeef-not-a-real-token.ics')
    expect(res.status).toBe(404)
  })

  it('does not require authentication', async () => {
    const created = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    // Pas de header Authorization du tout
    const res = await request(app).get(`/ical/${created.body.data.token}.ics`)
    expect(res.status).toBe(200)
  })

  it('returns 304 Not Modified when If-None-Match matches current ETag', async () => {
    const created = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    const token = created.body.data.token

    const first = await request(app).get(`/ical/${token}.ics`)
    expect(first.status).toBe(200)
    const etag = first.headers['etag']
    expect(etag).toMatch(/^"[A-Za-z0-9+/=]+"$/)

    const cached = await request(app)
      .get(`/ical/${token}.ics`)
      .set('If-None-Match', etag)
    expect(cached.status).toBe(304)
    expect(cached.text).toBe('')
  })

  it('isolates users : teacher token does not expose student calendar', async () => {
    const t = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    const s = await request(app)
      .post('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(t.body.data.token).not.toBe(s.body.data.token)

    // Chaque feed doit repondre 200 avec son propre token
    const resT = await request(app).get(`/ical/${t.body.data.token}.ics`)
    const resS = await request(app).get(`/ical/${s.body.data.token}.ics`)
    expect(resT.status).toBe(200)
    expect(resS.status).toBe(200)
    // Les deux calendriers peuvent avoir des contenus differents (travaux vs
    // schedule). On ne teste que leur independance : revoquer le teacher ne
    // doit pas impacter le student.
    await request(app)
      .delete('/api/calendar/feed-token')
      .set('Authorization', `Bearer ${teacherToken}`)
    const after = await request(app).get(`/ical/${s.body.data.token}.ics`)
    expect(after.status).toBe(200)
  })
})
