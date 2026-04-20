/** Store Agenda — calendrier agrege multi-promo pour les profs. */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { normalizePromoColor } from '@/utils/promoPalette'
import type { CalendarEvent, Reminder } from '@/types'

export interface PromoCalendar {
  id: number
  name: string
  color: string
}

// ─── Types internes ─────────────────────────────────────────────────────────

/** Ligne Gantt renvoyée par l'API (forme agrégée cote serveur). */
export interface GanttRow {
  id: number
  title: string
  deadline?: string | null
  start_date?: string | null
  category?: string | null
  depot_id?: number | null
  depots_count?: number | null
  students_total?: number | null
  promo_id?: number | null
  promo_name?: string | null
  promo_color?: string | null
}

interface OutlookEvent {
  id: string
  subject: string
  start: string
  end: string
  isAllDay: boolean
  location: string | null
  bodyPreview: string | null
  teamsJoinUrl: string | null
  organizer: string | null
  showAs: string
  categories: string[]
}

// ─── Helpers date ────────────────────────────────────────────────────────────

const REMINDER_COLOR = '#22c55e'
const OUTLOOK_COLOR  = '#0ea5e9'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function fmtDateTime(d: Date): string {
  return `${fmtDateOnly(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Détermine si une date ISO contient une heure "réelle" choisie par l'utilisateur.
 * `YYYY-MM-DDT00:00:00(.000)?Z?` est la sérialisation d'une date pure côté serveur,
 * pas un rappel planifié à minuit — on le traite comme date pure (allDay).
 */
function hasRealTime(iso: string): boolean {
  return iso.length > 10
    && iso.includes('T')
    && !/T00:00:00(\.000)?Z?$/.test(iso)
}

// ─── Event builders ─────────────────────────────────────────────────────────

function buildDeadlineEvent(row: GanttRow, nowDate: string): CalendarEvent | null {
  if (!row.deadline) return null
  const deadlineDate = row.deadline.substring(0, 10)
  const promoColor = normalizePromoColor(row.promo_color, row.promo_name)
  let status: CalendarEvent['submissionStatus'] = 'upcoming'
  if (row.depot_id != null) status = 'submitted'
  else if (deadlineDate < nowDate) status = 'late'
  else status = 'pending'

  return {
    id: `deadline-${row.id}`,
    start: deadlineDate,
    end: deadlineDate,
    title: row.title,
    color: promoColor,
    eventType: 'deadline',
    sourceId: row.id,
    category: row.category ?? null,
    submissionStatus: status,
    depotsCount: row.depots_count ?? 0,
    studentsTotal: row.students_total ?? 0,
    promoId: row.promo_id ?? undefined,
    promoName: row.promo_name ?? undefined,
    promoColor,
    allDay: true,
    draggable: true,
  }
}

function buildStartEvent(row: GanttRow): CalendarEvent | null {
  if (!row.start_date) return null
  const promoColor = normalizePromoColor(row.promo_color, row.promo_name)
  return {
    id: `start-${row.id}`,
    start: row.start_date.substring(0, 10),
    end: row.start_date.substring(0, 10),
    title: row.title,
    color: promoColor,
    eventType: 'start_date',
    sourceId: row.id,
    category: row.category ?? null,
    promoId: row.promo_id ?? undefined,
    promoName: row.promo_name ?? undefined,
    promoColor,
    allDay: true,
  }
}

function buildReminderEvent(r: Reminder): CalendarEvent | null {
  if (typeof r.date !== 'string' || !r.date) return null
  const timed = hasRealTime(r.date)
  const startStr = timed ? r.date.replace('T', ' ').slice(0, 16) : r.date.substring(0, 10)
  let endStr = startStr

  if (timed) {
    const d = new Date(r.date)
    if (isNaN(d.getTime())) return null
    d.setMinutes(d.getMinutes() + 60)
    endStr = fmtDateTime(d)
  }

  return {
    id: `reminder-${r.id}`,
    start: startStr,
    end: endStr,
    title: r.title,
    color: REMINDER_COLOR,
    eventType: 'reminder',
    sourceId: r.id,
    category: r.bloc ?? null,
    allDay: !timed,
    draggable: true,
  }
}

function buildOutlookEvent(ev: OutlookEvent): CalendarEvent | null {
  const sd = new Date(ev.start)
  const ed = new Date(ev.end)
  if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return null

  let startStr: string
  let endStr: string

  if (ev.isAllDay) {
    startStr = fmtDateOnly(sd)
    // Outlook semi-open : end exclusive (lendemain 00:00). Reculer d'1 jour pour end inclusive cote grille.
    const adjusted = new Date(ed.getTime())
    adjusted.setUTCDate(adjusted.getUTCDate() - 1)
    endStr = fmtDateOnly(adjusted)
    // Safety : événement 1 jour → end < start possible, on aligne
    if (endStr < startStr) endStr = startStr
  } else {
    startStr = fmtDateTime(sd)
    endStr = fmtDateTime(ed)
  }

  return {
    id: `outlook-${ev.id}`,
    start: startStr,
    end: endStr,
    title: ev.subject,
    color: OUTLOOK_COLOR,
    eventType: 'outlook',
    sourceId: 0,
    category: ev.categories[0] ?? null,
    outlookId: ev.id,
    teamsJoinUrl: ev.teamsJoinUrl,
    location: ev.location,
    organizer: ev.organizer,
    allDay: ev.isAllDay,
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAgendaStore = defineStore('agenda', () => {
  const { api } = useApi()

  const reminders = ref<Reminder[]>([])
  const ganttRows = ref<GanttRow[]>([])
  const loading   = ref(false)

  const outlookEvents    = ref<OutlookEvent[]>([])
  const outlookConnected = ref(false)
  const outlookEnabled   = ref(true)

  // Dedup : requête fetchEvents concurrente pour le même pid = réutilisation
  let inflightFetch: { pid: number; promise: Promise<void> } | null = null
  // Dedup Outlook : dernière fenêtre en vol
  let inflightOutlook: Promise<void> | null = null

  /** Promos uniques extraites des ganttRows (pour le mode multi-promo prof). */
  const promos = computed<PromoCalendar[]>(() => {
    const map = new Map<number, PromoCalendar>()
    for (const t of ganttRows.value) {
      if (t.promo_id && !map.has(t.promo_id)) {
        map.set(t.promo_id, {
          id: t.promo_id,
          name: t.promo_name || `Promo ${t.promo_id}`,
          color: normalizePromoColor(t.promo_color, t.promo_name),
        })
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  })

  /** Categories uniques. */
  const categories = computed<string[]>(() => {
    const set = new Set<string>()
    for (const t of ganttRows.value) {
      if (t.category) set.add(t.category)
    }
    return [...set].sort()
  })

  /** Agrégation de tous les events (deadlines, start_dates, rappels, Outlook). */
  const events = computed<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = []
    const now = todayIso()

    for (const row of ganttRows.value) {
      const deadline = buildDeadlineEvent(row, now)
      if (deadline) list.push(deadline)
      const startEv = buildStartEvent(row)
      if (startEv) list.push(startEv)
    }

    for (const r of reminders.value) {
      const ev = buildReminderEvent(r)
      if (ev) list.push(ev)
    }

    if (outlookEnabled.value) {
      for (const ev of outlookEvents.value) {
        const built = buildOutlookEvent(ev)
        if (built) list.push(built)
      }
    }

    return list.sort((a, b) => a.start.localeCompare(b.start))
  })

  /**
   * Charge les events. pid=0 charge toutes les promos (mode prof multi-promo).
   * Les appels concurrents pour le même pid sont dédupliqués.
   */
  async function fetchEvents(pid: number): Promise<void> {
    if (inflightFetch && inflightFetch.pid === pid) return inflightFetch.promise

    loading.value = true
    const promise = (async () => {
      try {
        const [gantt, rems] = await Promise.all([
          api<GanttRow[]>(() => window.api.getGanttData(pid) as unknown as Promise<{ ok: boolean; data?: GanttRow[] | null; error?: string }>),
          api<Reminder[]>(() => window.api.getReminders()),
        ])
        if (gantt) ganttRows.value = gantt
        if (rems)  reminders.value = rems
      } finally {
        loading.value = false
      }
    })()

    inflightFetch = { pid, promise }
    try {
      await promise
    } finally {
      if (inflightFetch?.promise === promise) inflightFetch = null
    }
  }

  /**
   * Fetch Outlook events pour une fenêtre [from, to]. Profs uniquement
   * (Microsoft connecté côté serveur). Échec silencieux → connected=false.
   */
  async function fetchOutlookEvents(fromIso: string, toIso: string): Promise<void> {
    if (!outlookEnabled.value) return
    if (isNaN(Date.parse(fromIso)) || isNaN(Date.parse(toIso))) {
      outlookConnected.value = false
      return
    }

    // Dedup : si un fetch est déjà en vol, on attend celui-ci
    if (inflightOutlook) return inflightOutlook

    const promise = (async () => {
      try {
        const res = await window.api.getOutlookEvents(fromIso, toIso)
        if (res?.ok && res.data) {
          outlookEvents.value = Array.isArray(res.data.events) ? res.data.events : []
          outlookConnected.value = !!res.data.connected
        } else {
          outlookConnected.value = false
        }
      } catch {
        outlookConnected.value = false
        outlookEvents.value = []
      }
    })()

    inflightOutlook = promise
    try {
      await promise
    } finally {
      if (inflightOutlook === promise) inflightOutlook = null
    }
  }

  function toggleOutlookSync(enabled: boolean): void {
    outlookEnabled.value = enabled
    if (!enabled) outlookEvents.value = []
  }

  async function createReminder(payload: Omit<Reminder, 'id' | 'created_at'>): Promise<boolean> {
    const data = await api<Reminder>(() => window.api.createReminder(payload))
    if (data) {
      reminders.value = [...reminders.value, data].sort((a, b) => a.date.localeCompare(b.date))
      return true
    }
    return false
  }

  async function updateReminder(id: number, payload: Partial<Reminder>): Promise<boolean> {
    const data = await api<Reminder>(() => window.api.updateReminder(id, payload))
    if (data) {
      reminders.value = reminders.value.map(r => r.id === id ? data : r)
      return true
    }
    return false
  }

  /**
   * Replanifie un évènement (drag-to-reschedule). Dispatch sur le bon endpoint
   * selon le préfixe de l'ID évènement :
   *   - `reminder-<id>`  → updateReminder
   *   - `deadline-<id>`  → updateTravail({ deadline })
   *
   * Retourne `true` en cas de succès, `false` sinon. Le caller est responsable
   * du rollback visuel si `false` (l'état du store n'est pas muté en cas d'échec).
   *
   * Optimistic locking : en cas de succès, les données sont rafraîchies via
   * l'API (les mises à jour concurrentes sont reflétées au prochain render).
   */
  async function updateEventDate(eventId: string, newIsoDate: string): Promise<boolean> {
    if (eventId.startsWith('reminder-')) {
      const id = Number(eventId.slice('reminder-'.length))
      if (!Number.isFinite(id)) return false
      return updateReminder(id, { date: newIsoDate })
    }
    if (eventId.startsWith('deadline-')) {
      const id = Number(eventId.slice('deadline-'.length))
      if (!Number.isFinite(id)) return false
      const res = await api(
        () => window.api.updateTravail(id, { deadline: newIsoDate }),
        { context: 'devoir' },
      )
      if (res === null) return false
      // Mise à jour locale pour éviter un round-trip complet
      ganttRows.value = ganttRows.value.map((row) =>
        row.id === id ? { ...row, deadline: newIsoDate } : row,
      )
      return true
    }
    // start_date / outlook / inconnu : non draggable
    return false
  }

  async function deleteReminder(id: number): Promise<boolean> {
    const data = await api(() => window.api.deleteReminder(id))
    if (data !== null) {
      reminders.value = reminders.value.filter(r => r.id !== id)
      return true
    }
    return false
  }

  return {
    reminders, ganttRows, events, promos, categories, loading,
    fetchEvents, createReminder, updateReminder, updateEventDate, deleteReminder,
    // Outlook sync
    outlookEvents, outlookConnected, outlookEnabled,
    fetchOutlookEvents, toggleOutlookSync,
  }
})
