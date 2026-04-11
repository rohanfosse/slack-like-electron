/**
 * Tests pour l'endpoint GET /api/lumen/promos/:promoId/search (FTS5).
 * Couvre :
 *   - validation Zod (q manquant, q trop court, limit invalide)
 *   - visibility filtering (student vs teacher)
 *   - format de reponse (results array avec snippet)
 *   - safety contre les query FTS5 malformees
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only-32chars!!'
const express = require('express')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')
const { JWT_SECRET } = require('../helpers/fixtures')

let app
let studentToken, teacherToken
let visibleRepoId, hiddenRepoId

beforeAll(() => {
  setupTestDb()
  const db = getTestDb()
  const lumen = require('../../../server/db/models/lumen')

  // 2 repos : 1 visible, 1 masque
  db.prepare(
    `INSERT INTO lumen_repos (promo_id, owner, repo, default_branch, manifest_json, is_visible)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(1, 'cesi', 'cours-a', 'main', JSON.stringify({
    project: 'Cours A',
    chapters: [
      { title: 'Intro', path: 'README.md' },
      { title: 'Variables', path: 'cours/01.md' },
    ],
  }), 1)
  visibleRepoId = db.prepare('SELECT id FROM lumen_repos WHERE repo = ?').get('cours-a').id

  db.prepare(
    `INSERT INTO lumen_repos (promo_id, owner, repo, default_branch, manifest_json, is_visible)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(1, 'cesi', 'cours-secret', 'main', JSON.stringify({
    project: 'Cours Secret',
    chapters: [{ title: 'Confidential', path: 'README.md' }],
  }), 0)
  hiddenRepoId = db.prepare('SELECT id FROM lumen_repos WHERE repo = ?').get('cours-secret').id

  // Index FTS5 : on insere directement via le helper du model
  lumen.upsertLumenChapterFts(visibleRepoId, 'README.md', 'Intro', 'JavaScript est un langage')
  lumen.upsertLumenChapterFts(visibleRepoId, 'cours/01.md', 'Variables', 'Une variable contient une valeur')
  lumen.upsertLumenChapterFts(hiddenRepoId, 'README.md', 'Confidential', 'Contenu top secret JavaScript')

  studentToken = jwt.sign({ id: 1, name: 'Jean', type: 'student', promo_id: 1 }, JWT_SECRET)
  teacherToken = jwt.sign({ id: -1, name: 'Prof', type: 'teacher', promo_id: null }, JWT_SECRET)

  app = express()
  app.use(express.json())
  app.set('jwtSecret', JWT_SECRET)
  const auth = require('../../../server/middleware/auth')
  app.use('/api/lumen', auth, require('../../../server/routes/lumen'))
})

afterAll(() => teardownTestDb())

describe('GET /api/lumen/promos/:promoId/search', () => {
  describe('validation', () => {
    it('refuse q manquant', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(400)
    })

    it('refuse q trop court (<2 chars)', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=a').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(400)
    })

    it('accepte q valide', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=javascript').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
    })
  })

  describe('visibility filtering', () => {
    it('student ne voit pas les chapitres des repos masques', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=javascript').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      const results = res.body.data?.results ?? []
      // 1 seul match dans cours-a (visible). Le repo masque ne ressort pas.
      expect(results.find((r) => r.repoId === hiddenRepoId)).toBeUndefined()
      expect(results.find((r) => r.repoId === visibleRepoId)).toBeDefined()
    })

    it('teacher voit aussi les chapitres des repos masques', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=javascript').set('Authorization', `Bearer ${teacherToken}`)
      expect(res.status).toBe(200)
      const results = res.body.data?.results ?? []
      // 2 matches : visible + masque
      expect(results.find((r) => r.repoId === hiddenRepoId)).toBeDefined()
      expect(results.find((r) => r.repoId === visibleRepoId)).toBeDefined()
    })

    it('student ne peut pas chercher dans une promo qui n\'est pas la sienne', async () => {
      const res = await request(app).get('/api/lumen/promos/2/search?q=javascript').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
    })
  })

  describe('format de reponse', () => {
    it('chaque resultat contient les champs attendus', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=variable').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      const results = res.body.data?.results ?? []
      expect(results.length).toBeGreaterThan(0)
      const r = results[0]
      expect(r).toHaveProperty('repoId')
      expect(r).toHaveProperty('repoName')
      expect(r).toHaveProperty('chapterPath')
      expect(r).toHaveProperty('chapterTitle')
      expect(r).toHaveProperty('snippet')
      expect(r).toHaveProperty('rank')
    })

    it('snippet contient des tags <mark> autour du terme', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=variable').set('Authorization', `Bearer ${studentToken}`)
      const results = res.body.data?.results ?? []
      expect(results[0].snippet).toContain('<mark>')
    })

    it('limit override', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=javascript&limit=1').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      const results = res.body.data?.results ?? []
      expect(results.length).toBeLessThanOrEqual(1)
    })
  })

  describe('safety', () => {
    it('query avec caracteres speciaux FTS5 ne crash pas (return empty au lieu de throw)', async () => {
      // Caracteres qui causent normalement "fts5: syntax error"
      const res = await request(app).get('/api/lumen/promos/1/search?q=' + encodeURIComponent('AND OR NOT (foo')).set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      // buildFtsQuery echappe les tokens entre guillemets, donc ca passe
      expect(res.body.data?.results).toBeDefined()
    })

    it('query qui ne match rien retourne results vide', async () => {
      const res = await request(app).get('/api/lumen/promos/1/search?q=zyxwvut').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data?.results).toEqual([])
    })
  })
})
