/**
 * useBooking — composable pour la gestion des types d'evenements,
 * disponibilites, reservations et OAuth Microsoft.
 */
import { ref, computed, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { formatBookingDate, formatBookingTime } from '@/utils/bookingDate'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EventType {
  id: number
  title: string
  slug: string
  description?: string
  duration_minutes: number
  buffer_minutes: number
  timezone: string
  color: string
  fallback_visio_url?: string
  is_active: number
  created_at: string
}

export interface AvailabilityRule {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
}

export interface Booking {
  id: number
  date: string
  start_time: string
  end_time: string
  student_name?: string
  tutor_name?: string
  status: string
  event_type_title?: string
  visio_url?: string
}

// ── Composable ───────────────────────────────────────────────────────────────

export function useBooking() {
  const { showToast } = useToast()

  const loading = ref(true)
  const msConnected = ref(false)
  const msExpires = ref<string | null>(null)
  const eventTypes = ref<EventType[]>([])
  const availability = ref<AvailabilityRule[]>([])
  const bookings = ref<Booking[]>([])
  const savingAvailability = ref(false)

  const sortedBookings = computed(() => {
    return [...bookings.value].sort((a, b) => {
      const da = `${a.date}T${a.start_time}`
      const db = `${b.date}T${b.start_time}`
      return da.localeCompare(db)
    })
  })

  const rulesByDay = computed(() => {
    const map: Record<number, AvailabilityRule[]> = {}
    for (const r of availability.value) {
      (map[r.day_of_week] ??= []).push(r)
    }
    return map
  })

  // ── Fetch all data ─────────────────────────────────────────────────────

  async function fetchAll() {
    loading.value = true
    try {
      const [etRes, avRes, bkRes, oaRes] = await Promise.all([
        window.api.getBookingEventTypes(),
        window.api.getBookingAvailability(),
        window.api.getMyBookings(),
        window.api.getBookingOAuthStatus(),
      ])
      if (etRes.ok && etRes.data) eventTypes.value = etRes.data
      if (avRes.ok && avRes.data) availability.value = avRes.data
      if (bkRes.ok && bkRes.data) bookings.value = bkRes.data as Booking[]
      if (oaRes.ok && oaRes.data) {
        msConnected.value = oaRes.data.connected
        msExpires.value = oaRes.data.expiresAt ?? null
      }
    } catch {
      showToast('Erreur lors du chargement des donnees de reservation', 'error')
    } finally {
      loading.value = false
    }
  }

  // ── Event Types ────────────────────────────────────────────────────────

  async function createEventType(data: {
    title: string; slug: string; description?: string
    duration_minutes: number; buffer_minutes?: number; timezone?: string; color: string; fallback_visio_url?: string
  }) {
    try {
      const res = await window.api.createBookingEventType(data)
      if (res.ok) {
        showToast('Type de rendez-vous cree', 'success')
        const etRes = await window.api.getBookingEventTypes()
        if (etRes.ok && etRes.data) eventTypes.value = etRes.data
        return true
      }
      showToast(res.error || 'Erreur lors de la creation', 'error')
      return false
    } catch {
      showToast('Erreur lors de la creation du type', 'error')
      return false
    }
  }

  async function toggleActive(et: EventType) {
    try {
      const next = et.is_active ? 0 : 1
      const res = await window.api.updateBookingEventType(et.id, { is_active: next })
      if (res.ok) {
        eventTypes.value = eventTypes.value.map(e =>
          e.id === et.id ? { ...e, is_active: next } : e,
        )
      } else {
        showToast(res.error || 'Erreur', 'error')
      }
    } catch {
      showToast('Erreur lors de la mise a jour', 'error')
    }
  }

  async function deleteEventType(id: number) {
    if (!confirm('Supprimer ce type de rendez-vous ? Les liens existants seront invalides.')) return
    try {
      const res = await window.api.deleteBookingEventType(id)
      if (res.ok) {
        eventTypes.value = eventTypes.value.filter(e => e.id !== id)
        showToast('Type supprime', 'success')
      } else {
        showToast(res.error || 'Erreur lors de la suppression', 'error')
      }
    } catch {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  async function generateLink(eventTypeId: number, studentId: number) {
    try {
      const res = await window.api.createBookingToken(eventTypeId, studentId)
      if (res.ok && res.data) {
        return res.data.bookingUrl
      }
      showToast(res.error || 'Erreur lors de la generation du lien', 'error')
      return null
    } catch {
      showToast('Erreur lors de la generation du lien', 'error')
      return null
    }
  }

  async function generateBulkLinks(eventTypeId: number, promoId: number) {
    try {
      const res = await window.api.createBulkBookingTokens(eventTypeId, promoId)
      if (res.ok && res.data) {
        showToast(`${res.data.length} liens generes`, 'success')
        return res.data
      }
      showToast(res.error || 'Erreur lors de la generation', 'error')
      return null
    } catch {
      showToast('Erreur lors de la generation en masse', 'error')
      return null
    }
  }

  // ── Availability ───────────────────────────────────────────────────────

  function addSlot(day: number, start: string, end: string) {
    if (!start || !end || start >= end) {
      showToast('Horaires invalides', 'error')
      return false
    }
    availability.value = [
      ...availability.value,
      { id: -(Date.now() + day), day_of_week: day, start_time: start, end_time: end },
    ]
    return true
  }

  function removeSlot(rule: AvailabilityRule) {
    availability.value = availability.value.filter(r => r !== rule)
  }

  async function saveAvailability() {
    savingAvailability.value = true
    try {
      const rules = availability.value.map(r => ({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      }))
      const res = await window.api.setBookingAvailability(rules)
      if (res.ok) {
        showToast('Disponibilites enregistrees', 'success')
        const avRes = await window.api.getBookingAvailability()
        if (avRes.ok && avRes.data) availability.value = avRes.data
      } else {
        showToast(res.error || 'Erreur lors de la sauvegarde', 'error')
      }
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      savingAvailability.value = false
    }
  }

  // ── Microsoft OAuth ────────────────────────────────────────────────────

  let oauthPollInterval: ReturnType<typeof setInterval> | null = null
  let oauthPollTimeout: ReturnType<typeof setTimeout> | null = null

  function cleanupOAuthPoll() {
    if (oauthPollInterval) { clearInterval(oauthPollInterval); oauthPollInterval = null }
    if (oauthPollTimeout) { clearTimeout(oauthPollTimeout); oauthPollTimeout = null }
  }

  async function connectMs() {
    try {
      const res = await window.api.startBookingOAuth()
      if (res.ok && res.data?.url) {
        window.api.openExternal(res.data.url)
        cleanupOAuthPoll()
        oauthPollInterval = setInterval(async () => {
          const st = await window.api.getBookingOAuthStatus()
          if (st.ok && st.data?.connected) {
            msConnected.value = true
            msExpires.value = st.data.expiresAt ?? null
            cleanupOAuthPoll()
            showToast('Compte Microsoft connecte', 'success')
          }
        }, 3000)
        oauthPollTimeout = setTimeout(cleanupOAuthPoll, 120_000)
      } else {
        showToast(res.error || 'Erreur OAuth', 'error')
      }
    } catch {
      showToast('Erreur lors de la connexion Microsoft', 'error')
    }
  }

  async function disconnectMs() {
    try {
      const res = await window.api.disconnectBookingOAuth()
      if (res.ok) {
        msConnected.value = false
        msExpires.value = null
        showToast('Compte Microsoft deconnecte', 'success')
      } else {
        showToast(res.error || 'Erreur', 'error')
      }
    } catch {
      showToast('Erreur lors de la deconnexion', 'error')
    }
  }

  // ── Real-time socket listeners ──────────────────────────────────────────

  let unsubBookingNew: (() => void) | null = null
  let unsubBookingCancelled: (() => void) | null = null

  function initSocketListeners() {
    unsubBookingNew = window.api.onBookingNew((data) => {
      showToast(`Nouveau RDV : ${data.tutorName} pour ${data.eventTitle}`, 'success')
      fetchAll() // refresh bookings list
    })
    unsubBookingCancelled = window.api.onBookingCancelled((data) => {
      showToast(`RDV annule : ${data.tutorName} (${data.eventTitle})`, 'error')
      fetchAll()
    })
  }

  function disposeSocketListeners() {
    unsubBookingNew?.()
    unsubBookingCancelled?.()
    unsubBookingNew = null
    unsubBookingCancelled = null
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  const formatDate = formatBookingDate
  const formatTime = formatBookingTime

  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirme', pending: 'En attente',
      cancelled: 'Annule', completed: 'Termine',
    }
    return map[status] || status
  }

  function statusClass(status: string): string {
    if (status === 'confirmed' || status === 'completed') return 'badge-success'
    if (status === 'pending') return 'badge-warning'
    if (status === 'cancelled') return 'badge-danger'
    return ''
  }

  return {
    // State
    loading, msConnected, msExpires,
    eventTypes, availability, bookings,
    savingAvailability,
    // Computed
    sortedBookings, rulesByDay,
    // Actions
    fetchAll,
    createEventType, toggleActive, deleteEventType, generateLink, generateBulkLinks,
    addSlot, removeSlot, saveAvailability,
    connectMs, disconnectMs, cleanupOAuthPoll,
    initSocketListeners, disposeSocketListeners,
    // Helpers
    formatDate, formatTime, statusLabel, statusClass,
  }
}
