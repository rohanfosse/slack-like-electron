/**
 * Tests pour usePublicBooking — page publique de reservation.
 *
 * Couvre les 2 modes (token nominatif et lien public ouvert 'event'),
 * fetchEventInfo, fetchSlotsRange (chargement parallele + dedup), bookSlot
 * (payload qui differe selon le mode), icsUrl, et selectSlot/backToCalendar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.mock('@/utils/fetchWithTimeout', () => ({
  fetchWithTimeout: (url: string, opts?: RequestInit) => fetchMock(url, opts),
  isAbortError: (e: unknown) => e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError'),
}))

import { usePublicBooking } from '@/composables/usePublicBooking'

const TOKEN = 'tok-abc'
const SLUG = 'visite-stage'

function jsonRes(payload: unknown) {
  return { json: async () => payload }
}

const eventInfoPayload = {
  eventTitle: 'Suivi memoire',
  description: 'Point de suivi 30 min',
  durationMinutes: 30,
  teacherName: 'Jean Dupont',
  studentName: 'Alice Martin',
  color: '#3b82f6',
  timezone: 'Europe/Paris',
}

function makeSlot(date: string, time: string) {
  return { start: `${date}T${time}:00.000Z`, end: `${date}T${time}:30.000Z`, date, time }
}

describe('usePublicBooking', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  // ── basePath + mode ──────────────────────────────────────────────────────

  describe('basePath selon le mode', () => {
    it('mode token (defaut) : /api/bookings/public/:token', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: eventInfoPayload }))
      const b = usePublicBooking(TOKEN)
      await b.fetchEventInfo()
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/bookings/public/${TOKEN}`),
        expect.any(Object),
      )
      // mode token n'a pas '/event/' dans l'URL
      expect(fetchMock.mock.calls[0][0]).not.toContain('/event/')
    })

    it('mode event : /api/bookings/public/event/:slug', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: eventInfoPayload }))
      const b = usePublicBooking(SLUG, 'event')
      await b.fetchEventInfo()
      expect(fetchMock.mock.calls[0][0]).toContain(`/api/bookings/public/event/${SLUG}`)
    })

    it('encode l\'identifiant (path traversal safety)', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true }))
      const b = usePublicBooking('with spaces&?', 'token')
      await b.fetchEventInfo()
      expect(fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('with spaces&?'))
    })
  })

  // ── fetchEventInfo ───────────────────────────────────────────────────────

  describe('fetchEventInfo', () => {
    it('remplit eventInfo en cas de succes', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: eventInfoPayload }))
      const b = usePublicBooking(TOKEN)
      await b.fetchEventInfo()
      expect(b.eventInfo.value?.eventTitle).toBe('Suivi memoire')
      expect(b.error.value).toBe('')
      expect(b.errorCode.value).toBe('')
    })

    it('mappe error et errorCode quand ok=false', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: false, error: 'Reservations fermees', code: 'closed',
      }))
      const b = usePublicBooking(TOKEN)
      await b.fetchEventInfo()
      expect(b.eventInfo.value).toBeNull()
      expect(b.error.value).toBe('Reservations fermees')
      expect(b.errorCode.value).toBe('closed')
    })

    it('utilise un message generique si error backend manquant', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: false }))
      const b = usePublicBooking(TOKEN)
      await b.fetchEventInfo()
      expect(b.error.value).toContain('Lien de reservation invalide')
    })

    it('passe loading=true pendant l\'appel et false apres', async () => {
      let resolve!: (v: unknown) => void
      fetchMock.mockReturnValueOnce(new Promise((r) => { resolve = r }))
      const b = usePublicBooking(TOKEN)
      const p = b.fetchEventInfo()
      expect(b.loading.value).toBe(true)
      resolve(jsonRes({ ok: true, data: eventInfoPayload }))
      await p
      expect(b.loading.value).toBe(false)
    })
  })

  // ── fetchSlotsRange ──────────────────────────────────────────────────────

  describe('fetchSlotsRange', () => {
    it('charge weeks semaines en parallele et fusionne les slots', async () => {
      // 3 semaines, chacune retourne 2 slots
      fetchMock.mockImplementation((url: string) => {
        const offsetMatch = url.match(/weekOffset=(\d+)/)
        const offset = offsetMatch ? Number(offsetMatch[1]) : 0
        const day = `2026-04-${String(20 + offset).padStart(2, '0')}`
        return Promise.resolve(jsonRes({
          ok: true,
          data: { slots: [makeSlot(day, '09:00'), makeSlot(day, '10:00')], weekStart: day },
        }))
      })
      const b = usePublicBooking(TOKEN)
      await b.fetchSlotsRange(3)
      expect(b.slots.value).toHaveLength(6)
    })

    it('deduplique les slots qui apparaissent dans plusieurs semaines', async () => {
      // Meme slot retourne 3 fois -> compte pour 1
      const dup = makeSlot('2026-04-22', '14:00')
      fetchMock.mockResolvedValue(jsonRes({ ok: true, data: { slots: [dup], weekStart: '2026-04-20' } }))
      const b = usePublicBooking(TOKEN)
      await b.fetchSlotsRange(3)
      expect(b.slots.value).toHaveLength(1)
      expect(b.slots.value[0].start).toBe(dup.start)
    })

    it('trie les slots par start ISO croissant', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonRes({ ok: true, data: { slots: [makeSlot('2026-04-25', '14:00')], weekStart: '2026-04-25' } }))
        .mockResolvedValueOnce(jsonRes({ ok: true, data: { slots: [makeSlot('2026-04-20', '09:00')], weekStart: '2026-04-20' } }))
      const b = usePublicBooking(TOKEN)
      await b.fetchSlotsRange(2)
      expect(b.slots.value.map(s => s.date)).toEqual(['2026-04-20', '2026-04-25'])
    })

    it('ignore les semaines en erreur sans crasher', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonRes({ ok: true, data: { slots: [makeSlot('2026-04-20', '09:00')], weekStart: '2026-04-20' } }))
        .mockResolvedValueOnce(jsonRes({ ok: false, error: 'oops' }))
      const b = usePublicBooking(TOKEN)
      await b.fetchSlotsRange(2)
      expect(b.slots.value).toHaveLength(1)
    })

    it('reset loading=false meme si une fetch throw', async () => {
      fetchMock.mockRejectedValue(new Error('boom'))
      const b = usePublicBooking(TOKEN)
      await b.fetchSlotsRange(2)
      expect(b.loading.value).toBe(false)
    })
  })

  // ── selectSlot / backToCalendar ──────────────────────────────────────────

  describe('selectSlot et backToCalendar', () => {
    it('selectSlot remplit selectedSlot et passe a step=details', () => {
      const b = usePublicBooking(TOKEN)
      const s = makeSlot('2026-04-22', '14:00')
      b.selectSlot(s)
      expect(b.selectedSlot.value).toEqual(s)
      expect(b.step.value).toBe('details')
    })

    it('backToCalendar reset selectedSlot et step', () => {
      const b = usePublicBooking(TOKEN)
      b.selectSlot(makeSlot('2026-04-22', '14:00'))
      b.backToCalendar()
      expect(b.selectedSlot.value).toBeNull()
      expect(b.step.value).toBe('calendar')
    })
  })

  // ── bookSlot — contrats de payload ───────────────────────────────────────

  describe('bookSlot', () => {
    async function setupWith(mode: 'token' | 'event') {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: eventInfoPayload }))
      const b = usePublicBooking(mode === 'token' ? TOKEN : SLUG, mode)
      await b.fetchEventInfo()
      b.selectSlot(makeSlot('2026-04-22', '14:00'))
      return b
    }

    it('renvoie false sans appel API si aucun slot selectionne', async () => {
      const b = usePublicBooking(TOKEN)
      const ok = await b.bookSlot('Alice', 'a@a.com')
      expect(ok).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('mode token : envoie tutorName/tutorEmail (champs historiques)', async () => {
      const b = await setupWith('token')
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: true,
        data: { bookingId: 1, teamsJoinUrl: null, startDatetime: 'a', endDatetime: 'b' },
      }))
      const ok = await b.bookSlot('Bob', 'bob@x.fr')
      expect(ok).toBe(true)
      const body = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body)
      expect(body).toEqual({
        tutorName: 'Bob',
        tutorEmail: 'bob@x.fr',
        startDatetime: '2026-04-22T14:00:00.000Z',
      })
      expect(b.step.value).toBe('confirmation')
    })

    it('mode event : envoie attendeeName/attendeeEmail + captchaToken', async () => {
      const b = await setupWith('event')
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: true,
        data: { bookingId: 2, teamsJoinUrl: null, startDatetime: 'a', endDatetime: 'b' },
      }))
      await b.bookSlot('Bob', 'bob@x.fr', 'captcha-tok')
      const body = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body)
      expect(body).toEqual({
        attendeeName: 'Bob',
        attendeeEmail: 'bob@x.fr',
        startDatetime: '2026-04-22T14:00:00.000Z',
        captchaToken: 'captcha-tok',
      })
    })

    it('mappe error et errorCode quand le serveur refuse', async () => {
      const b = await setupWith('event')
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: false, error: 'Slot deja pris', code: 'slot_taken',
      }))
      const ok = await b.bookSlot('Bob', 'bob@x.fr')
      expect(ok).toBe(false)
      expect(b.error.value).toBe('Slot deja pris')
      expect(b.errorCode.value).toBe('slot_taken')
      expect(b.step.value).toBe('details') // pas de transition vers confirmation
    })

    it('utilise POST + body JSON', async () => {
      const b = await setupWith('token')
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: true,
        data: { bookingId: 1, teamsJoinUrl: null, startDatetime: 'a', endDatetime: 'b' },
      }))
      await b.bookSlot('Bob', 'bob@x.fr')
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
      expect(lastCall[1].method).toBe('POST')
    })
  })

  // ── icsUrl ───────────────────────────────────────────────────────────────

  describe('icsUrl', () => {
    it('renvoie null tant qu\'aucune reservation', () => {
      const b = usePublicBooking(TOKEN)
      expect(b.icsUrl()).toBeNull()
    })

    it('inclut le bookingId dans l\'URL apres reservation (mode token)', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: eventInfoPayload }))
      const b = usePublicBooking(TOKEN)
      await b.fetchEventInfo()
      b.selectSlot(makeSlot('2026-04-22', '14:00'))
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: true,
        data: { bookingId: 77, teamsJoinUrl: null, startDatetime: 'a', endDatetime: 'b' },
      }))
      await b.bookSlot('Bob', 'bob@x.fr')
      expect(b.icsUrl()).toContain(`/api/bookings/public/${TOKEN}/booking/77/ics`)
    })

    it('utilise le path event en mode event', async () => {
      fetchMock.mockResolvedValueOnce(jsonRes({ ok: true, data: eventInfoPayload }))
      const b = usePublicBooking(SLUG, 'event')
      await b.fetchEventInfo()
      b.selectSlot(makeSlot('2026-04-22', '14:00'))
      fetchMock.mockResolvedValueOnce(jsonRes({
        ok: true,
        data: { bookingId: 88, teamsJoinUrl: null, startDatetime: 'a', endDatetime: 'b' },
      }))
      await b.bookSlot('Bob', 'bob@x.fr')
      expect(b.icsUrl()).toContain(`/api/bookings/public/event/${SLUG}/booking/88/ics`)
    })
  })
})
