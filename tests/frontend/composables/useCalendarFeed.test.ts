/**
 * Tests pour useCalendarFeed — gere l'URL d'abonnement iCal publique
 * dans Settings > Integrations (v2.167).
 *
 * Le composable utilise un etat module-level pour etre partage entre
 * plusieurs instances — les tests reset cet etat via revoke() en fin.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const showToast = vi.fn()

/**
 * Mock de useApi : appelle la fonction passee et retourne son `data`,
 * ou null en cas de { ok: false }. Reproduit le comportement simplifie
 * du vrai useApi pour les besoins de test.
 */
const api = vi.fn(async (call: () => Promise<{ ok: boolean; data?: unknown }>) => {
  const res = await call()
  return res.ok ? (res.data ?? null) : null
})

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

const getCalendarFeedToken    = vi.fn()
const rotateCalendarFeedToken = vi.fn()
const revokeCalendarFeedToken = vi.fn()

const clipboardWriteText = vi.fn()

vi.stubGlobal('window', {
  api: {
    getCalendarFeedToken,
    rotateCalendarFeedToken,
    revokeCalendarFeedToken,
  },
})

vi.stubGlobal('navigator', {
  clipboard: { writeText: clipboardWriteText },
})

import { useCalendarFeed } from '@/composables/useCalendarFeed'

describe('useCalendarFeed', () => {
  let feed: ReturnType<typeof useCalendarFeed>

  beforeEach(() => {
    showToast.mockClear()
    api.mockClear()
    getCalendarFeedToken.mockReset()
    rotateCalendarFeedToken.mockReset()
    revokeCalendarFeedToken.mockReset()
    clipboardWriteText.mockReset()
    feed = useCalendarFeed()
  })

  // Reset l'etat module-level apres chaque test pour l'isolation
  afterEach(async () => {
    revokeCalendarFeedToken.mockResolvedValue({ ok: true, data: { revoked: true } })
    await feed.revoke()
  })

  describe('refresh', () => {
    it('remplit le token + url quand le backend a un feed actif', async () => {
      getCalendarFeedToken.mockResolvedValue({
        ok: true,
        data: { token: 'abc123', url: 'http://localhost/ical/abc123.ics', createdAt: '2026-04-19T10:00:00Z' },
      })
      await feed.refresh()
      expect(feed.token.value).toBe('abc123')
      expect(feed.url.value).toBe('http://localhost/ical/abc123.ics')
      expect(feed.createdAt.value).toBe('2026-04-19T10:00:00Z')
    })

    it('reste null quand le backend retourne un feed vide', async () => {
      getCalendarFeedToken.mockResolvedValue({
        ok: true,
        data: { token: null, url: null },
      })
      await feed.refresh()
      expect(feed.token.value).toBeNull()
      expect(feed.url.value).toBeNull()
    })

    it('reste silencieux sur erreur reseau (silent: true)', async () => {
      getCalendarFeedToken.mockResolvedValue({ ok: false, error: 'Network error' })
      await feed.refresh()
      expect(showToast).not.toHaveBeenCalled()
    })
  })

  describe('rotate', () => {
    it('genere un nouveau token + url et affiche un toast succes', async () => {
      rotateCalendarFeedToken.mockResolvedValue({
        ok: true,
        data: { token: 'new-token', url: 'http://localhost/ical/new-token.ics', createdAt: '2026-04-19T11:00:00Z' },
      })
      await feed.rotate()
      expect(feed.token.value).toBe('new-token')
      expect(feed.url.value).toBe('http://localhost/ical/new-token.ics')
      expect(feed.createdAt.value).toBe('2026-04-19T11:00:00Z')
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('genere'), 'success')
    })

    it('set loading=true pendant l\'operation', async () => {
      let resolver!: (v: unknown) => void
      rotateCalendarFeedToken.mockReturnValue(new Promise((r) => { resolver = r }))
      const p = feed.rotate()
      expect(feed.loading.value).toBe(true)
      resolver({ ok: true, data: { token: 't', url: '/ical/t.ics' } })
      await p
      expect(feed.loading.value).toBe(false)
    })

    it('reset loading=false meme si l\'appel throw', async () => {
      rotateCalendarFeedToken.mockRejectedValue(new Error('boom'))
      try { await feed.rotate() } catch { /* ignore */ }
      expect(feed.loading.value).toBe(false)
    })
  })

  describe('revoke', () => {
    it('null le token + url + createdAt en cas de succes', async () => {
      // Seed un token en place d'abord
      rotateCalendarFeedToken.mockResolvedValue({ ok: true, data: { token: 'x', url: '/x.ics' } })
      await feed.rotate()
      expect(feed.token.value).toBe('x')

      revokeCalendarFeedToken.mockResolvedValue({ ok: true, data: { revoked: true } })
      await feed.revoke()

      expect(feed.token.value).toBeNull()
      expect(feed.url.value).toBeNull()
      expect(feed.createdAt.value).toBeNull()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('revoque'), 'success')
    })

    it('ne modifie pas l\'etat si revoked:false', async () => {
      rotateCalendarFeedToken.mockResolvedValue({ ok: true, data: { token: 'keepme', url: '/keepme.ics' } })
      await feed.rotate()

      revokeCalendarFeedToken.mockResolvedValue({ ok: true, data: { revoked: false } })
      await feed.revoke()

      expect(feed.token.value).toBe('keepme')
    })
  })

  describe('copyUrl', () => {
    it('copie l\'URL dans le clipboard + toast succes', async () => {
      rotateCalendarFeedToken.mockResolvedValue({ ok: true, data: { token: 't', url: 'http://localhost/ical/t.ics' } })
      await feed.rotate()
      showToast.mockClear()

      clipboardWriteText.mockResolvedValue(undefined)
      await feed.copyUrl()

      expect(clipboardWriteText).toHaveBeenCalledWith('http://localhost/ical/t.ics')
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('copiee'), 'success')
    })

    it('no-op si aucune URL disponible', async () => {
      await feed.copyUrl()
      expect(clipboardWriteText).not.toHaveBeenCalled()
    })

    it('toast erreur si clipboard.writeText throw (permission denied)', async () => {
      rotateCalendarFeedToken.mockResolvedValue({ ok: true, data: { token: 't', url: '/t.ics' } })
      await feed.rotate()
      showToast.mockClear()

      clipboardWriteText.mockRejectedValue(new Error('denied'))
      await feed.copyUrl()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('selectionne manuellement'), 'error')
    })
  })
})
