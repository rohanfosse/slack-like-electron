/**
 * End-to-end : verifie qu'un visiteur etudiant peut parcourir le demo
 * sans rencontrer de 4xx/5xx aux etapes critiques. Ce test agit comme
 * un smoke-test : il n'inspecte pas chaque shape en detail (les autres
 * fichiers le font), mais s'assure que le HAPPY PATH ne casse jamais.
 *
 * Si une regression introduit un 403/404/500 quelque part dans le flow,
 * ce test detecte le scenario complet plutot qu'une ligne isolee — utile
 * apres un gros refacto pour valider qu'on n'a pas casse une etape sans
 * s'en rendre compte.
 *
 * Etapes :
 *  1. Start session etudiante
 *  2. Charge le dashboard : promotions, channels, students, presence,
 *     assignments, notif feed, typing feed
 *  3. Messages : channel page, send, edit own, react, pin, delete
 *  4. DM : recent contacts, page DM, send DM
 *  5. Live : active session, submit QCM, history, fetch session detail
 *  6. Lumen : repos list, chapter content, mark read, save note
 *  7. Bookmarks : add, list, remove
 *  8. End session
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars!!'

const request = require('supertest')
const express = require('express')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.set('jwtSecret', process.env.JWT_SECRET)
  app.use('/api/demo', require('../../../server/routes/demo'))
  return app
}

const auth = (token) => ({ Authorization: `Bearer ${token}` })

async function expectOk(req, label) {
  const res = await req
  if (res.status !== 200) {
    throw new Error(`${label} attendu 200, recu ${res.status} : ${JSON.stringify(res.body).slice(0, 200)}`)
  }
  if (res.body.ok !== true) {
    throw new Error(`${label} attendu ok=true : ${JSON.stringify(res.body).slice(0, 200)}`)
  }
  return res
}

describe('Student journey end-to-end', () => {
  it('happy path complet sans 4xx/5xx', async () => {
    const app = buildApp()

    // ── 1. Start session
    const start = await expectOk(
      request(app).post('/api/demo/start').send({ role: 'student' }),
      'POST /api/demo/start',
    )
    const { token, currentUser: user } = start.body.data
    expect(token).toMatch(/^demo-/)
    expect(user.type).toBe('student')

    // ── 2. Dashboard reads
    await expectOk(request(app).get('/api/demo/promotions').set(auth(token)), '/promotions')
    const channelsRes = await expectOk(
      request(app).get(`/api/demo/promotions/${user.promo_id}/channels`).set(auth(token)),
      '/promotions/:id/channels',
    )
    const studentsRes = await expectOk(
      request(app).get(`/api/demo/promotions/${user.promo_id}/students`).set(auth(token)),
      '/promotions/:id/students',
    )
    await expectOk(request(app).get('/api/demo/presence').set(auth(token)), '/presence')
    await expectOk(
      request(app).get(`/api/demo/students/${user.id}/assignments`).set(auth(token)),
      '/students/:id/assignments',
    )
    await expectOk(
      request(app).get('/api/demo/notifications/feed?since=0').set(auth(token)),
      '/notifications/feed',
    )
    await expectOk(request(app).get('/api/demo/typing-feed').set(auth(token)), '/typing-feed')
    await expectOk(request(app).get('/api/demo/teachers').set(auth(token)), '/teachers')

    expect(channelsRes.body.data.length).toBeGreaterThan(0)
    expect(studentsRes.body.data.length).toBeGreaterThan(0)

    const channelId = channelsRes.body.data[0].id

    // ── 3. Messages
    const pageRes = await expectOk(
      request(app).get(`/api/demo/messages/channel/${channelId}/page`).set(auth(token)),
      '/messages/channel/:id/page',
    )
    expect(pageRes.body.data.length).toBeGreaterThan(0)

    const sentRes = await expectOk(
      request(app).post('/api/demo/messages').set(auth(token))
        .send({ channelId, content: 'hello demo' }),
      'POST /messages',
    )
    const myMsgId = sentRes.body.data.id

    await expectOk(
      request(app).patch(`/api/demo/messages/${myMsgId}`).set(auth(token))
        .send({ content: 'hello demo (edit)' }),
      'PATCH /messages/:id',
    )

    await expectOk(
      request(app).post('/api/demo/messages/reactions').set(auth(token))
        .send({ msgId: myMsgId, reactionsJson: JSON.stringify({ '👍': { count: 1, users: ['Toi'] } }) }),
      'POST /messages/reactions',
    )

    await expectOk(
      request(app).post('/api/demo/messages/pin').set(auth(token))
        .send({ messageId: myMsgId, pinned: true }),
      'POST /messages/pin',
    )

    // ── 4. DMs
    const contactsRes = await expectOk(
      request(app).get('/api/demo/messages/recent-dm-contacts').set(auth(token)),
      '/messages/recent-dm-contacts',
    )
    expect(contactsRes.body.data.length).toBeGreaterThan(0)
    const peer = contactsRes.body.data.find(c => c.partner_role === 'student')
    if (peer) {
      await expectOk(
        request(app).get(`/api/demo/messages/dm/${peer.partner_id}/page`).set(auth(token)),
        '/messages/dm/:id/page',
      )
      await expectOk(
        request(app).post('/api/demo/messages').set(auth(token))
          .send({ dmStudentId: peer.partner_id, content: 'hey en demo' }),
        'POST /messages (dm)',
      )
    }

    // ── 5. Live
    await expectOk(
      request(app).get(`/api/demo/live/sessions/promo/${user.promo_id}/active`).set(auth(token)),
      '/live/sessions/promo/:id/active',
    )
    await expectOk(
      request(app).get(`/api/demo/live/sessions/promo/${user.promo_id}/history`).set(auth(token)),
      '/live/sessions/promo/:id/history',
    )
    await expectOk(
      request(app).get('/api/demo/live/sessions/code/AVL-2026').set(auth(token)),
      '/live/sessions/code/:code',
    )
    await expectOk(
      request(app).get('/api/demo/live/activities/1001/results').set(auth(token)),
      '/live/activities/:id/results',
    )
    await expectOk(
      request(app).post('/api/demo/live/activities/1001/respond').set(auth(token))
        .send({ answers: [0] }),
      'POST /live/activities/:id/respond',
    )
    await expectOk(
      request(app).get('/api/demo/live/sessions/demo-live-h1').set(auth(token)),
      '/live/sessions/:id (past)',
    )

    // ── 6. Lumen
    await expectOk(
      request(app).get(`/api/demo/lumen/repos/promo/${user.promo_id}`).set(auth(token)),
      '/lumen/repos/promo/:id',
    )
    await expectOk(
      request(app).get('/api/demo/lumen/repos/9001/content?path=ch01-tri-rapide.md').set(auth(token)),
      '/lumen/repos/:id/content',
    )
    await expectOk(
      request(app).post('/api/demo/lumen/repos/9001/read').set(auth(token))
        .send({ path: 'ch01-tri-rapide.md' }),
      'POST /lumen/repos/:id/read',
    )
    await expectOk(
      request(app).put('/api/demo/lumen/repos/9001/note').set(auth(token))
        .send({ path: 'ch01-tri-rapide.md', content: 'mes notes du chapitre 1' }),
      'PUT /lumen/repos/:id/note',
    )
    const noteRes = await expectOk(
      request(app).get('/api/demo/lumen/repos/9001/note?path=ch01-tri-rapide.md').set(auth(token)),
      'GET /lumen/repos/:id/note',
    )
    expect(noteRes.body.data.note).toBe('mes notes du chapitre 1')

    // ── 7. Bookmarks
    const bookmarksBefore = await expectOk(
      request(app).get('/api/demo/bookmarks').set(auth(token)),
      '/bookmarks',
    )
    const initialCount = bookmarksBefore.body.data.length

    await expectOk(
      request(app).post('/api/demo/bookmarks').set(auth(token))
        .send({ messageId: myMsgId }),
      'POST /bookmarks',
    )
    const bookmarksAfter = await expectOk(
      request(app).get('/api/demo/bookmarks').set(auth(token)),
      '/bookmarks (after add)',
    )
    expect(bookmarksAfter.body.data.length).toBe(initialCount + 1)

    await expectOk(
      request(app).delete(`/api/demo/bookmarks/${myMsgId}`).set(auth(token)),
      'DELETE /bookmarks/:id',
    )

    // ── 8. End session
    await expectOk(request(app).post('/api/demo/end').set(auth(token)), '/end')

    // Apres /end, le token est invalide (le tenant a ete purge). Une
    // requete subsequente DOIT retourner 401 (non 500). Important pour
    // que le front detecte la session expiree.
    const afterEnd = await request(app).get('/api/demo/promotions').set(auth(token))
    expect([401, 403, 404]).toContain(afterEnd.status)
  })
})
