// ─── Tests route Lumen — cours markdown ─────────────────────────────────────
const express = require('express')
const request = require('supertest')
const jwt     = require('jsonwebtoken')
const { setupTestDb, teardownTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app, teacherToken, studentToken, otherTeacherToken, otherPromoStudentToken

beforeAll(() => {
  setupTestDb()

  teacherToken = jwt.sign({ id: -1, name: 'Prof Test', type: 'teacher', promo_id: null }, JWT_SECRET)
  otherTeacherToken = jwt.sign({ id: -2, name: 'Prof Autre', type: 'teacher', promo_id: null }, JWT_SECRET)
  studentToken = jwt.sign({ id: 1, name: 'Jean Dupont', type: 'student', promo_id: 1 }, JWT_SECRET)
  otherPromoStudentToken = jwt.sign({ id: 2, name: 'Autre Eleve', type: 'student', promo_id: 2 }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/lumen', auth, require('../../../server/routes/lumen'))
})

afterAll(() => teardownTestDb())

describe('Lumen courses CRUD', () => {
  let courseId

  it('student NE PEUT PAS creer un cours (403)', async () => {
    const res = await request(app)
      .post('/api/lumen/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ promoId: 1, title: 'Cours Etudiant' })
    expect(res.status).toBe(403)
  })

  it('teacher PEUT creer un cours (200)', async () => {
    const res = await request(app)
      .post('/api/lumen/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, title: 'Mon Premier Cours', content: '# Hello' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.status).toBe('draft')
    courseId = res.body.data.id
  })

  it('teacher peut recuperer son cours', async () => {
    const res = await request(app)
      .get(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.content).toBe('# Hello')
  })

  it('student NE VOIT PAS un cours en draft (404)', async () => {
    const res = await request(app)
      .get(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
  })

  it('teacher peut publier son cours', async () => {
    const res = await request(app)
      .post(`/api/lumen/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('published')
    expect(res.body.data.published_at).not.toBeNull()
  })

  it('student VOIT le cours une fois publie', async () => {
    const res = await request(app)
      .get(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.content).toBe('# Hello')
  })

  it('liste publique pour student : uniquement publies', async () => {
    // Creer un draft supplementaire
    await request(app)
      .post('/api/lumen/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, title: 'Draft a cacher' })

    const res = await request(app)
      .get('/api/lumen/courses/promo/1')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.every(c => c.status === 'published')).toBe(true)
  })

  it('liste enseignant : drafts + publies', async () => {
    const res = await request(app)
      .get('/api/lumen/courses/promo/1')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.some(c => c.status === 'draft')).toBe(true)
    expect(res.body.data.some(c => c.status === 'published')).toBe(true)
  })

  it('autre enseignant NE PEUT PAS modifier un cours qu\'il n\'a pas cree (403)', async () => {
    const res = await request(app)
      .patch(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({ title: 'Hijack' })
    expect(res.status).toBe(403)
  })

  it('proprietaire peut modifier le cours', async () => {
    const res = await request(app)
      .patch(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ content: '# Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.content).toBe('# Updated')
  })

  it('proprietaire peut depublier', async () => {
    const res = await request(app)
      .post(`/api/lumen/courses/${courseId}/unpublish`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('draft')
  })

  it('student NE PEUT PAS supprimer un cours (403)', async () => {
    const res = await request(app)
      .delete(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })

  it('student d\'une autre promo NE PEUT PAS lire un cours de la promo 1 (403)', async () => {
    // Recreer un cours publie pour la promo 1
    const create = await request(app)
      .post('/api/lumen/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ promoId: 1, title: 'Promo 1 only', content: '# Secret' })
    const id = create.body.data.id
    await request(app)
      .post(`/api/lumen/courses/${id}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`)

    const res = await request(app)
      .get(`/api/lumen/courses/${id}`)
      .set('Authorization', `Bearer ${otherPromoStudentToken}`)
    expect(res.status).toBe(403)
  })

  it('proprietaire peut supprimer son cours', async () => {
    const res = await request(app)
      .delete(`/api/lumen/courses/${courseId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(true)
  })
})
