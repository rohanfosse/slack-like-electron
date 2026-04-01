/**
 * Planning semaine : regroupe les devoirs et events par jour sur 7 jours.
 */
import { ref, computed, type Ref } from 'vue'
import type { Devoir } from '@/types'

export interface WeekDay {
  date: string
  label: string
  dayName: string
  isToday: boolean
  events: WeekEvent[]
}

export interface WeekEvent {
  id: number
  title: string
  type: Devoir['type']
  deadline: string
  isSubmitted: boolean
  hour: string
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatHour(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function buildWeek(devoirs: Devoir[], startDate: Date = new Date()): WeekDay[] {
  const today = toDateKey(startDate)
  const days: WeekDay[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = toDateKey(d)

    days.push({
      date: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      dayName: DAY_NAMES[d.getDay()],
      isToday: key === today,
      events: [],
    })
  }

  for (const dv of devoirs) {
    if (!dv.deadline) continue
    const deadlineKey = toDateKey(new Date(dv.deadline))
    const day = days.find(d => d.date === deadlineKey)
    if (day) {
      day.events.push({
        id: dv.id,
        title: dv.title,
        type: dv.type,
        deadline: dv.deadline,
        isSubmitted: dv.depot_id != null,
        hour: formatHour(dv.deadline),
      })
    }
  }

  // Sort events within each day by hour
  for (const day of days) {
    day.events.sort((a, b) => a.deadline.localeCompare(b.deadline))
  }

  return days
}

export function useWeekPlanner(devoirs: Ref<Devoir[]>) {
  const offset = ref(0)

  const startDate = computed(() => {
    const d = new Date()
    d.setDate(d.getDate() + offset.value * 7)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const week = computed(() => buildWeek(devoirs.value, startDate.value))

  const totalEvents = computed(() => week.value.reduce((sum, d) => sum + d.events.length, 0))
  const busiestDay = computed(() => {
    const best = week.value.reduce((a, b) => b.events.length > a.events.length ? b : a, week.value[0])
    return best?.events.length > 0 ? best : null
  })

  function nextWeek() { offset.value++ }
  function prevWeek() { offset.value-- }
  function resetWeek() { offset.value = 0 }

  return { week, offset, totalEvents, busiestDay, startDate, nextWeek, prevWeek, resetWeek }
}
