/**
 * usePublicBooking — composable for the public-facing booking page.
 * Uses fetch() directly (not window.api) so it works in both Electron and web.
 */
import { ref, computed } from 'vue'

const SERVER_URL = (import.meta.env?.VITE_SERVER_URL as string | undefined) || 'http://localhost:3001'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookingEventInfo {
  eventTitle: string
  description?: string
  durationMinutes: number
  teacherName: string
  studentName: string
  color: string
  timezone?: string
}

export interface BookingSlot {
  start: string
  end: string
  date: string
  time: string
}

export interface BookingResult {
  bookingId: number
  teamsJoinUrl: string | null
  startDatetime: string
  endDatetime: string
}

// ── Composable ───────────────────────────────────────────────────────────────

export function usePublicBooking(token: string) {
  const eventInfo = ref<BookingEventInfo | null>(null)
  const slots = ref<BookingSlot[]>([])
  const weekStart = ref('')
  const selectedSlot = ref<BookingSlot | null>(null)
  const step = ref<'calendar' | 'details' | 'confirmation'>('calendar')
  const loading = ref(false)
  const error = ref('')
  const bookingResult = ref<BookingResult | null>(null)

  // Group slots by date
  const slotsByDate = computed(() => {
    const map: Record<string, BookingSlot[]> = {}
    for (const s of slots.value) {
      (map[s.date] ??= []).push(s)
    }
    return map
  })

  async function apiFetch<T>(path: string, opts?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
    try {
      const res = await fetch(`${SERVER_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      })
      return await res.json()
    } catch {
      return { ok: false, error: 'Erreur de connexion au serveur.' }
    }
  }

  async function fetchEventInfo() {
    loading.value = true
    error.value = ''
    const res = await apiFetch<BookingEventInfo>(`/api/bookings/public/${token}`)
    if (res.ok && res.data) {
      eventInfo.value = res.data
    } else {
      error.value = res.error || 'Lien de reservation invalide.'
    }
    loading.value = false
  }

  async function fetchSlots(weekOffset = 0) {
    loading.value = true
    const res = await apiFetch<{ slots: BookingSlot[]; weekStart: string }>(
      `/api/bookings/public/${token}/slots?weekOffset=${weekOffset}`,
    )
    if (res.ok && res.data) {
      slots.value = res.data.slots
      weekStart.value = res.data.weekStart
    }
    loading.value = false
  }

  function selectSlot(slot: BookingSlot) {
    selectedSlot.value = slot
    step.value = 'details'
  }

  function backToCalendar() {
    selectedSlot.value = null
    step.value = 'calendar'
  }

  async function bookSlot(tutorName: string, tutorEmail: string) {
    if (!selectedSlot.value) return false
    loading.value = true
    error.value = ''
    const res = await apiFetch<BookingResult>(`/api/bookings/public/${token}/book`, {
      method: 'POST',
      body: JSON.stringify({
        tutorName,
        tutorEmail,
        startDatetime: selectedSlot.value.start,
      }),
    })
    if (res.ok && res.data) {
      bookingResult.value = res.data
      step.value = 'confirmation'
      loading.value = false
      return true
    }
    error.value = res.error || 'Erreur lors de la reservation.'
    loading.value = false
    return false
  }

  // ICS download URL
  function icsUrl(): string | null {
    if (!bookingResult.value) return null
    return `${SERVER_URL}/api/bookings/public/${token}/booking/${bookingResult.value.bookingId}/ics`
  }

  return {
    eventInfo, slots, weekStart, selectedSlot, step,
    loading, error, bookingResult,
    slotsByDate,
    fetchEventInfo, fetchSlots, selectSlot, backToCalendar, bookSlot,
    icsUrl,
  }
}
