/**
 * Tests pour useBooking — composable prof/admin pour la gestion des
 * types d'evenements, des disponibilites, des reservations et des
 * listeners socket temps-reel.
 *
 * On stub l'integralite de window.api + useToast pour piloter les
 * branches succes/erreur/network sans monter de composant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const showToast = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@/utils/bookingDate', () => ({
  formatBookingDate: (d: string) => `[date]${d}`,
  formatBookingTime: (t: string) => `[time]${t}`,
}))

const apiMethods = {
  getBookingEventTypes: vi.fn(),
  getBookingAvailability: vi.fn(),
  getMyBookings: vi.fn(),
  createBookingEventType: vi.fn(),
  updateBookingEventType: vi.fn(),
  deleteBookingEventType: vi.fn(),
  createBookingToken: vi.fn(),
  createBulkBookingTokens: vi.fn(),
  setBookingAvailability: vi.fn(),
  onBookingNew: vi.fn(),
  onBookingCancelled: vi.fn(),
}

const confirmMock = vi.fn(() => true)

vi.stubGlobal('window', { api: apiMethods, confirm: confirmMock })
vi.stubGlobal('confirm', confirmMock)

import { useBooking, type EventType } from '@/composables/useBooking'

function et(over: Partial<EventType> = {}): EventType {
  return {
    id: 1,
    title: 'Suivi memoire',
    slug: 'suivi-memoire',
    description: '',
    duration_minutes: 30,
    buffer_minutes: 0,
    timezone: 'Europe/Paris',
    color: '#3b82f6',
    is_active: 1,
    is_public: 0,
    use_jitsi: 0,
    created_at: '2026-04-01T00:00:00Z',
    ...over,
  }
}

describe('useBooking', () => {
  beforeEach(() => {
    showToast.mockClear()
    confirmMock.mockReset().mockReturnValue(true)
    Object.values(apiMethods).forEach(m => m.mockReset())
    // onBookingNew/onBookingCancelled retournent un unsubscribe par defaut
    apiMethods.onBookingNew.mockReturnValue(() => {})
    apiMethods.onBookingCancelled.mockReturnValue(() => {})
  })

  // ── fetchAll ─────────────────────────────────────────────────────────────

  describe('fetchAll', () => {
    it('charge en parallele eventTypes, availability, bookings', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et()] })
      apiMethods.getBookingAvailability.mockResolvedValue({
        ok: true,
        data: [{ id: 1, day_of_week: 2, start_time: '14:00', end_time: '17:00' }],
      })
      apiMethods.getMyBookings.mockResolvedValue({
        ok: true,
        data: [{ id: 1, date: '2026-05-01', start_time: '14:00', end_time: '14:30', status: 'confirmed' }],
      })
      const b = useBooking()
      await b.fetchAll()
      expect(b.eventTypes.value).toHaveLength(1)
      expect(b.availability.value).toHaveLength(1)
      expect(b.bookings.value).toHaveLength(1)
      expect(b.loading.value).toBe(false)
    })

    it('toast erreur si une fetch throw', async () => {
      apiMethods.getBookingEventTypes.mockRejectedValue(new Error('boom'))
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('chargement'), 'error')
      expect(b.loading.value).toBe(false)
    })

    it('ignore une reponse ok=false sans crasher', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: false, error: 'oops' })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      expect(b.eventTypes.value).toEqual([])
    })
  })

  // ── computed ─────────────────────────────────────────────────────────────

  describe('sortedBookings', () => {
    it('trie par date+heure ascendant sans muter le state', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({
        ok: true,
        data: [
          { id: 1, date: '2026-05-10', start_time: '14:00', end_time: '14:30', status: 'confirmed' },
          { id: 2, date: '2026-05-05', start_time: '09:00', end_time: '09:30', status: 'confirmed' },
          { id: 3, date: '2026-05-05', start_time: '14:00', end_time: '14:30', status: 'confirmed' },
        ],
      })
      const b = useBooking()
      await b.fetchAll()
      expect(b.sortedBookings.value.map(x => x.id)).toEqual([2, 3, 1])
      // bookings.value reste dans l'ordre d'origine (pas de mutation)
      expect(b.bookings.value.map(x => x.id)).toEqual([1, 2, 3])
    })
  })

  describe('rulesByDay', () => {
    it('groupe les regles par day_of_week', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getBookingAvailability.mockResolvedValue({
        ok: true,
        data: [
          { id: 1, day_of_week: 2, start_time: '09:00', end_time: '12:00' },
          { id: 2, day_of_week: 2, start_time: '14:00', end_time: '17:00' },
          { id: 3, day_of_week: 4, start_time: '10:00', end_time: '12:00' },
        ],
      })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      expect(b.rulesByDay.value[2]).toHaveLength(2)
      expect(b.rulesByDay.value[4]).toHaveLength(1)
      expect(b.rulesByDay.value[1]).toBeUndefined()
    })
  })

  // ── createEventType ──────────────────────────────────────────────────────

  describe('createEventType', () => {
    it('refetch + toast succes quand l\'API repond ok', async () => {
      apiMethods.createBookingEventType.mockResolvedValue({ ok: true })
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et()] })
      const b = useBooking()
      const ok = await b.createEventType({
        title: 'X', slug: 'x', duration_minutes: 30, color: '#000',
      })
      expect(ok).toBe(true)
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('cree'), 'success')
      expect(b.eventTypes.value).toHaveLength(1)
    })

    it('toast erreur backend et renvoie false', async () => {
      apiMethods.createBookingEventType.mockResolvedValue({ ok: false, error: 'slug deja pris' })
      const b = useBooking()
      const ok = await b.createEventType({
        title: 'X', slug: 'x', duration_minutes: 30, color: '#000',
      })
      expect(ok).toBe(false)
      expect(showToast).toHaveBeenCalledWith('slug deja pris', 'error')
    })

    it('renvoie false sur exception sans crasher', async () => {
      apiMethods.createBookingEventType.mockRejectedValue(new Error('net'))
      const b = useBooking()
      const ok = await b.createEventType({
        title: 'X', slug: 'x', duration_minutes: 30, color: '#000',
      })
      expect(ok).toBe(false)
    })
  })

  // ── toggleActive ─────────────────────────────────────────────────────────

  describe('toggleActive', () => {
    async function setupWith(initialActive: 0 | 1) {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et({ is_active: initialActive })] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      return b
    }

    it('active -> inactive : patch local optimiste', async () => {
      const b = await setupWith(1)
      apiMethods.updateBookingEventType.mockResolvedValue({ ok: true })
      await b.toggleActive(b.eventTypes.value[0])
      expect(b.eventTypes.value[0].is_active).toBe(0)
      expect(apiMethods.updateBookingEventType).toHaveBeenCalledWith(1, { is_active: 0 })
    })

    it('inactive -> active', async () => {
      const b = await setupWith(0)
      apiMethods.updateBookingEventType.mockResolvedValue({ ok: true })
      await b.toggleActive(b.eventTypes.value[0])
      expect(b.eventTypes.value[0].is_active).toBe(1)
    })

    it('toast erreur sans patcher si l\'API rejette', async () => {
      const b = await setupWith(1)
      apiMethods.updateBookingEventType.mockResolvedValue({ ok: false, error: 'denied' })
      await b.toggleActive(b.eventTypes.value[0])
      expect(b.eventTypes.value[0].is_active).toBe(1) // pas de patch
      expect(showToast).toHaveBeenCalledWith('denied', 'error')
    })
  })

  // ── togglePublic (cas slug allonge) ──────────────────────────────────────

  describe('togglePublic', () => {
    async function setupWith(initial: 0 | 1, slug = 'short') {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et({ is_public: initial, slug })] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      return b
    }

    it('mentionne le slug rallonge dans le toast quand l\'activation change le slug', async () => {
      const b = await setupWith(0, 'short')
      apiMethods.updateBookingEventType.mockResolvedValue({
        ok: true,
        data: et({ is_public: 1, slug: 'short-aBcd1234' }),
      })
      await b.togglePublic(b.eventTypes.value[0])
      expect(b.eventTypes.value[0].slug).toBe('short-aBcd1234')
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Slug allonge'),
        'success',
      )
    })

    it('toast simple quand le slug ne change pas', async () => {
      const b = await setupWith(0, 'short')
      apiMethods.updateBookingEventType.mockResolvedValue({
        ok: true,
        data: et({ is_public: 1, slug: 'short' }),
      })
      await b.togglePublic(b.eventTypes.value[0])
      expect(showToast).toHaveBeenCalledWith('Lien public active', 'success')
    })

    it('fallback : si la reponse n\'a pas de data, patch local', async () => {
      const b = await setupWith(0)
      apiMethods.updateBookingEventType.mockResolvedValue({ ok: true })
      await b.togglePublic(b.eventTypes.value[0])
      expect(b.eventTypes.value[0].is_public).toBe(1)
      expect(showToast).toHaveBeenCalledWith('Lien public active', 'success')
    })

    it('desactivation : toast "desactive"', async () => {
      const b = await setupWith(1, 'long-slug-xxx')
      apiMethods.updateBookingEventType.mockResolvedValue({
        ok: true,
        data: et({ is_public: 0, slug: 'long-slug-xxx' }),
      })
      await b.togglePublic(b.eventTypes.value[0])
      expect(showToast).toHaveBeenCalledWith('Lien public desactive', 'success')
    })
  })

  // ── toggleJitsi ──────────────────────────────────────────────────────────

  describe('toggleJitsi', () => {
    it('flip use_jitsi 0->1 et toast d\'activation', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et({ use_jitsi: 0 })] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      apiMethods.updateBookingEventType.mockResolvedValue({ ok: true })
      await b.toggleJitsi(b.eventTypes.value[0])
      expect(b.eventTypes.value[0].use_jitsi).toBe(1)
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Jitsi Meet active'),
        'success',
      )
    })
  })

  // ── getPublicUrl ────────────────────────────────────────────────────────

  describe('getPublicUrl', () => {
    it('compose une URL avec le slug', () => {
      const b = useBooking()
      const url = b.getPublicUrl(et({ slug: 'visite-stage' }))
      expect(url).toContain('/#/book/e/visite-stage')
    })
  })

  // ── deleteEventType ─────────────────────────────────────────────────────

  describe('deleteEventType', () => {
    it('annule sans appel API si confirm() = false', async () => {
      confirmMock.mockReturnValue(false)
      const b = useBooking()
      await b.deleteEventType(1)
      expect(apiMethods.deleteBookingEventType).not.toHaveBeenCalled()
    })

    it('retire localement + toast quand ok', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et({ id: 1 }), et({ id: 2 })] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      apiMethods.deleteBookingEventType.mockResolvedValue({ ok: true })
      await b.deleteEventType(1)
      expect(b.eventTypes.value.map(e => e.id)).toEqual([2])
      expect(showToast).toHaveBeenCalledWith('Type supprime', 'success')
    })

    it('garde le state intact si l\'API rejette', async () => {
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [et({ id: 1 })] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      await b.fetchAll()
      apiMethods.deleteBookingEventType.mockResolvedValue({ ok: false, error: 'fk' })
      await b.deleteEventType(1)
      expect(b.eventTypes.value).toHaveLength(1)
      expect(showToast).toHaveBeenCalledWith('fk', 'error')
    })
  })

  // ── generateLink + generateBulkLinks ─────────────────────────────────────

  describe('generateLink', () => {
    it('renvoie l\'URL en cas de succes', async () => {
      apiMethods.createBookingToken.mockResolvedValue({ ok: true, data: { bookingUrl: 'http://x/abc' } })
      const b = useBooking()
      const url = await b.generateLink(1, 42)
      expect(url).toBe('http://x/abc')
    })

    it('renvoie null + toast si ok=false', async () => {
      apiMethods.createBookingToken.mockResolvedValue({ ok: false, error: 'unknown student' })
      const b = useBooking()
      const url = await b.generateLink(1, 42)
      expect(url).toBeNull()
      expect(showToast).toHaveBeenCalledWith('unknown student', 'error')
    })
  })

  describe('generateBulkLinks', () => {
    it('renvoie le tableau et toast avec le count', async () => {
      apiMethods.createBulkBookingTokens.mockResolvedValue({
        ok: true,
        data: [{ url: 'a' }, { url: 'b' }, { url: 'c' }],
      })
      const b = useBooking()
      const data = await b.generateBulkLinks(1, 7)
      expect(data).toHaveLength(3)
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('3 liens generes'), 'success')
    })
  })

  // ── addSlot / removeSlot ─────────────────────────────────────────────────

  describe('addSlot', () => {
    it('ajoute une regle et renvoie true', () => {
      const b = useBooking()
      const ok = b.addSlot(2, '14:00', '17:00')
      expect(ok).toBe(true)
      expect(b.availability.value).toHaveLength(1)
      expect(b.availability.value[0].day_of_week).toBe(2)
    })

    it('refuse si start vide ou >= end', () => {
      const b = useBooking()
      expect(b.addSlot(2, '', '17:00')).toBe(false)
      expect(b.addSlot(2, '17:00', '14:00')).toBe(false)
      expect(b.addSlot(2, '14:00', '14:00')).toBe(false)
      expect(b.availability.value).toHaveLength(0)
      expect(showToast).toHaveBeenCalledWith('Horaires invalides', 'error')
    })

    it('utilise un id negatif pour les regles non encore persistees', () => {
      const b = useBooking()
      b.addSlot(3, '09:00', '12:00')
      expect(b.availability.value[0].id).toBeLessThan(0)
    })
  })

  describe('removeSlot', () => {
    it('retire la regle exacte (par reference)', () => {
      const b = useBooking()
      b.addSlot(2, '09:00', '12:00')
      b.addSlot(3, '14:00', '17:00')
      const target = b.availability.value[0]
      b.removeSlot(target)
      expect(b.availability.value).toHaveLength(1)
      expect(b.availability.value[0].day_of_week).toBe(3)
    })
  })

  // ── saveAvailability ─────────────────────────────────────────────────────

  describe('saveAvailability', () => {
    it('serialise sans id, refetch et toast succes', async () => {
      const b = useBooking()
      b.addSlot(2, '09:00', '12:00')
      apiMethods.setBookingAvailability.mockResolvedValue({ ok: true })
      apiMethods.getBookingAvailability.mockResolvedValue({
        ok: true,
        data: [{ id: 1, day_of_week: 2, start_time: '09:00', end_time: '12:00' }],
      })
      await b.saveAvailability()
      const arg = apiMethods.setBookingAvailability.mock.calls[0][0]
      expect(arg).toEqual([{ day_of_week: 2, start_time: '09:00', end_time: '12:00' }])
      expect(b.availability.value[0].id).toBe(1) // reload
      expect(b.savingAvailability.value).toBe(false)
    })

    it('reset savingAvailability=false meme sur exception', async () => {
      apiMethods.setBookingAvailability.mockRejectedValue(new Error('boom'))
      const b = useBooking()
      await b.saveAvailability()
      expect(b.savingAvailability.value).toBe(false)
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('sauvegarde'), 'error')
    })
  })

  // ── socket listeners ─────────────────────────────────────────────────────

  describe('socket listeners', () => {
    it('initSocketListeners souscrit aux 2 events', () => {
      const b = useBooking()
      b.initSocketListeners()
      expect(apiMethods.onBookingNew).toHaveBeenCalledTimes(1)
      expect(apiMethods.onBookingCancelled).toHaveBeenCalledTimes(1)
    })

    it('onBookingNew toast + refetch', async () => {
      let cb!: (d: { tutorName: string; eventTitle: string }) => void
      apiMethods.onBookingNew.mockImplementation((handler: typeof cb) => {
        cb = handler
        return () => {}
      })
      apiMethods.getBookingEventTypes.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getBookingAvailability.mockResolvedValue({ ok: true, data: [] })
      apiMethods.getMyBookings.mockResolvedValue({ ok: true, data: [] })
      const b = useBooking()
      b.initSocketListeners()
      cb({ tutorName: 'Alice', eventTitle: 'Suivi' })
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        'success',
      )
      // fetchAll appele dans le handler — on attend qu'il finisse
      await Promise.resolve()
      expect(apiMethods.getBookingEventTypes).toHaveBeenCalled()
    })

    it('disposeSocketListeners appelle les unsubscribe et reset', () => {
      const unsubNew = vi.fn()
      const unsubCanc = vi.fn()
      apiMethods.onBookingNew.mockReturnValue(unsubNew)
      apiMethods.onBookingCancelled.mockReturnValue(unsubCanc)
      const b = useBooking()
      b.initSocketListeners()
      b.disposeSocketListeners()
      expect(unsubNew).toHaveBeenCalledTimes(1)
      expect(unsubCanc).toHaveBeenCalledTimes(1)
      // Re-dispose ne refait pas appel (deja a null)
      b.disposeSocketListeners()
      expect(unsubNew).toHaveBeenCalledTimes(1)
    })
  })

  // ── helpers d'affichage ─────────────────────────────────────────────────

  describe('statusLabel', () => {
    it('mappe les statuts connus', () => {
      const b = useBooking()
      expect(b.statusLabel('confirmed')).toBe('Confirme')
      expect(b.statusLabel('pending')).toBe('En attente')
      expect(b.statusLabel('cancelled')).toBe('Annule')
      expect(b.statusLabel('completed')).toBe('Termine')
    })

    it('renvoie le statut brut pour un code inconnu', () => {
      const b = useBooking()
      expect(b.statusLabel('weird')).toBe('weird')
    })
  })

  describe('statusClass', () => {
    it('mappe vers les classes badge-*', () => {
      const b = useBooking()
      expect(b.statusClass('confirmed')).toBe('badge-success')
      expect(b.statusClass('completed')).toBe('badge-success')
      expect(b.statusClass('pending')).toBe('badge-warning')
      expect(b.statusClass('cancelled')).toBe('badge-danger')
      expect(b.statusClass('unknown')).toBe('')
    })
  })
})
