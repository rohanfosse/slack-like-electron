/** Store Agenda — calendrier agrege : echeances travaux + rappels enseignant. */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { getCategoryColor } from '@/utils/categoryColor'
import type { CalendarEvent, Reminder } from '@/types'

export const useAgendaStore = defineStore('agenda', () => {
  const { api } = useApi()

  const reminders = ref<Reminder[]>([])
  const ganttRows = ref<any[]>([])
  const loading   = ref(false)

  /** Categories uniques extraites des ganttRows. */
  const categories = computed<string[]>(() => {
    const set = new Set<string>()
    for (const t of ganttRows.value) {
      if (t.category) set.add(t.category)
    }
    return [...set].sort()
  })

  /** Aggregate all events from ganttRows + reminders */
  const events = computed<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = []
    const now = new Date().toISOString().slice(0, 10)

    for (const t of ganttRows.value) {
      if (t.deadline) {
        const deadlineDate = t.deadline.substring(0, 10)
        let status: CalendarEvent['submissionStatus'] = 'upcoming'
        if (t.depot_id != null) status = 'submitted'
        else if (deadlineDate < now) status = 'late'
        else status = 'pending'

        list.push({
          id:        `deadline-${t.id}`,
          start:     deadlineDate,
          end:       deadlineDate,
          title:     t.title,
          color:     getCategoryColor(t.category),
          eventType: 'deadline',
          sourceId:  t.id,
          category:  t.category ?? null,
          submissionStatus: status,
          depotsCount: t.depots_count ?? 0,
          studentsTotal: t.students_total ?? 0,
        })
      }
      if (t.start_date) {
        list.push({
          id:        `start-${t.id}`,
          start:     t.start_date.substring(0, 10),
          end:       t.start_date.substring(0, 10),
          title:     t.title,
          color:     getCategoryColor(t.category),
          eventType: 'start_date',
          sourceId:  t.id,
          category:  t.category ?? null,
        })
      }
    }

    for (const r of reminders.value) {
      list.push({
        id:        `reminder-${r.id}`,
        start:     r.date.substring(0, 10),
        end:       r.date.substring(0, 10),
        title:     r.title,
        color:     '#22c55e',
        eventType: 'reminder',
        sourceId:  r.id,
        category:  r.bloc ?? null,
      })
    }

    return list.sort((a, b) => a.start.localeCompare(b.start))
  })

  async function fetchEvents(pid: number): Promise<void> {
    loading.value = true
    try {
      const [gantt, rems] = await Promise.all([
        api<any[]>(() => window.api.getGanttData(pid)),
        api<Reminder[]>(() => window.api.getReminders()),
      ])
      if (gantt) ganttRows.value = gantt
      if (rems)  reminders.value = rems
    } finally {
      loading.value = false
    }
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

  async function deleteReminder(id: number): Promise<boolean> {
    const data = await api(() => window.api.deleteReminder(id))
    if (data !== null) {
      reminders.value = reminders.value.filter(r => r.id !== id)
      return true
    }
    return false
  }

  return {
    reminders, ganttRows, events, categories, loading,
    fetchEvents, createReminder, updateReminder, deleteReminder,
  }
})
