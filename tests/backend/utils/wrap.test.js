const { resolveStatus } = require('../../../server/utils/wrap')
const wrap = require('../../../server/utils/wrap')
const express = require('express')
const request = require('supertest')

// ─── resolveStatus ──────────────────────────────────────────────────────────

describe('resolveStatus', () => {
  it('uses err.statusCode if present', () => {
    expect(resolveStatus({ statusCode: 404, message: 'Not found' })).toBe(404)
  })

  it('maps UNIQUE constraint to 409', () => {
    expect(resolveStatus({ message: 'UNIQUE constraint failed: students.email' })).toBe(409)
  })

  it.each([
    'requis', 'invalide', 'introuvable', 'autorisé', 'Accès',
    'pas pu', 'incorrect', 'expiré', 'existe', 'Données invalides',
    'trop long', 'trop court', 'refusé', 'manquant', 'déjà traité',
  ])('maps "%s" keyword to 400', (keyword) => {
    expect(resolveStatus({ message: `Le champ est ${keyword}` })).toBe(400)
  })

  it('defaults to 500 for unknown errors', () => {
    expect(resolveStatus({ message: 'Unexpected database crash' })).toBe(500)
  })

  it('defaults to 500 for empty message', () => {
    expect(resolveStatus({ message: '' })).toBe(500)
    expect(resolveStatus({})).toBe(500)
  })

  it('prioritizes statusCode over string matching', () => {
    expect(resolveStatus({ statusCode: 503, message: 'introuvable' })).toBe(503)
  })
})

// ─── wrap middleware ────────────────────────────────────────────────────────

describe('wrap middleware', () => {
  function buildApp(handler) {
    const app = express()
    app.get('/test', wrap(handler))
    return app
  }

  it('returns { ok: true, data } on success', async () => {
    const app = buildApp(() => ({ hello: 'world' }))
    const res = await request(app).get('/test')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, data: { hello: 'world' } })
  })

  it('handles async handlers', async () => {
    const app = buildApp(async () => {
      return Promise.resolve({ async: true })
    })
    const res = await request(app).get('/test')
    expect(res.status).toBe(200)
    expect(res.body.data.async).toBe(true)
  })

  it('returns 400 for client errors', async () => {
    const app = buildApp(() => { throw new Error('Champ requis') })
    const res = await request(app).get('/test')
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('returns 500 for unknown errors', async () => {
    const app = buildApp(() => { throw new Error('Database crash') })
    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
  })

  it('returns custom statusCode from AppError', async () => {
    const app = buildApp(() => {
      const err = new Error('Not found')
      err.statusCode = 404
      throw err
    })
    const res = await request(app).get('/test')
    expect(res.status).toBe(404)
  })

  it('returns null data for void handlers', async () => {
    const app = buildApp(() => null)
    const res = await request(app).get('/test')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeNull()
  })

  // Non-regression : les 500 doivent renvoyer un message generique pour
  // eviter la fuite de chemins/colonnes DB/stacks au client.
  it('masque le message interne sur un 500 (pas de leak)', async () => {
    const app = buildApp(() => {
      throw new Error('SQLITE_CONSTRAINT: depots.travail_id FK failure in /srv/cursus/db.sqlite')
    })
    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Erreur interne du serveur')
    expect(res.body.error).not.toContain('SQLITE')
    expect(res.body.error).not.toContain('/srv/')
  })

  it('conserve le message original sur un 400', async () => {
    const app = buildApp(() => { throw new Error('Email invalide') })
    const res = await request(app).get('/test')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email invalide')
  })

  // Non-regression : meme un 4xx ne doit pas laisser passer des leaks
  // (chemins, constraints SQLite, stack lines) — le keyword matching est
  // substring-based et peut etre matche par accident.
  it('sanitise un message 4xx contenant un leak SQLite', async () => {
    const app = buildApp(() => { throw new Error('introuvable: SQLITE_CONSTRAINT failed: users.email') })
    const res = await request(app).get('/test')
    expect(res.body.error).toBe('Requête invalide')
  })

  it('sanitise un message 4xx contenant un chemin Windows', async () => {
    const app = buildApp(() => { throw new Error('Email déjà utilisée par C:\\srv\\cursus\\db.sqlite') })
    const res = await request(app).get('/test')
    expect(res.body.error).not.toContain('C:\\')
  })

  it('sanitise un message 4xx contenant un chemin Unix systeme', async () => {
    const app = buildApp(() => { throw new Error('Email déjà utilisée par /srv/cursus/db.sqlite') })
    const res = await request(app).get('/test')
    expect(res.body.error).not.toContain('/srv/')
  })
})
