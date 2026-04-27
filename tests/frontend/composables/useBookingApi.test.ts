/**
 * Tests pour useBookingApi — wrapper fetch partage entre les composables
 * publics de booking. Verifie le mapping des reponses, des erreurs reseau
 * et des AbortError, plus le buildIcsUrl.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.mock('@/utils/fetchWithTimeout', () => ({
  fetchWithTimeout: (url: string, opts?: RequestInit) => fetchMock(url, opts),
  isAbortError: (e: unknown) => e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError'),
}))

import { bookingApi, buildIcsUrl, SERVER_URL } from '@/composables/useBookingApi'

function jsonRes(payload: unknown) {
  return { json: async () => payload }
}

describe('bookingApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('renvoie la reponse JSON en cas de succes', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: { foo: 'bar' } }))
    const r = await bookingApi<{ foo: string }>('/api/test')
    expect(r.ok).toBe(true)
    expect(r.data).toEqual({ foo: 'bar' })
  })

  it('propage error et code quand res.ok=false', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: false, error: 'ferme', code: 'closed' }))
    const r = await bookingApi('/api/test')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('ferme')
    expect(r.code).toBe('closed')
  })

  it('mappe AbortError sur "Temps d attente depasse."', async () => {
    const e = new Error('aborted'); e.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(e)
    const r = await bookingApi('/api/test')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Temps d')
  })

  it('mappe TimeoutError sur "Temps d attente depasse." (alias d\'AbortError)', async () => {
    const e = new Error('timeout'); e.name = 'TimeoutError'
    fetchMock.mockRejectedValueOnce(e)
    const r = await bookingApi('/api/test')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Temps d')
  })

  it('mappe les autres erreurs sur "Erreur de connexion au serveur."', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'))
    const r = await bookingApi('/api/test')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('connexion')
  })

  it('prefixe le path avec SERVER_URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: true }))
    await bookingApi('/api/foo')
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER_URL}/api/foo`,
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    )
  })

  it('passe les opts au fetch (method POST, body)', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: true }))
    await bookingApi('/api/foo', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    const opts = fetchMock.mock.calls[0][1]
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ a: 1 }))
  })

  it('peut surcharger le Content-Type via opts.headers', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: true }))
    await bookingApi('/api/foo', { headers: { 'Content-Type': 'text/plain' } })
    const opts = fetchMock.mock.calls[0][1]
    expect(opts.headers['Content-Type']).toBe('text/plain')
  })
})

describe('buildIcsUrl', () => {
  it('compose SERVER_URL + basePath + /booking/:id/ics', () => {
    expect(buildIcsUrl('/api/bookings/public/abc', 42))
      .toBe(`${SERVER_URL}/api/bookings/public/abc/booking/42/ics`)
  })

  it('marche aussi pour le mode event', () => {
    expect(buildIcsUrl('/api/bookings/public/event/my-slug', 99))
      .toBe(`${SERVER_URL}/api/bookings/public/event/my-slug/booking/99/ics`)
  })
})
