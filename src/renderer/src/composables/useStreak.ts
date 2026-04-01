/**
 * Calcule le streak (jours consecutifs d'activite) d'un etudiant.
 * Sources : depots (submitted_at) + messages recents (last_message_at).
 */
import { ref, computed } from 'vue'

export interface StreakData {
  current: number
  longest: number
  activeDays: Set<string>
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function computeStreak(dates: string[]): StreakData {
  const activeDays = new Set(dates.map(d => toDateKey(d)))
  if (!activeDays.size) return { current: 0, longest: 0, activeDays }

  const sorted = [...activeDays].sort()
  let current = 0
  let longest = 0
  let run = 1

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    if (diffDays === 1) {
      run++
    } else {
      longest = Math.max(longest, run)
      run = 1
    }
  }
  longest = Math.max(longest, run)

  // Current streak: count backwards from today
  const todayKey = today()
  const yesterdayKey = toDateKey(new Date(Date.now() - 86_400_000).toISOString())

  if (!activeDays.has(todayKey) && !activeDays.has(yesterdayKey)) {
    current = 0
  } else {
    current = 0
    let checkDate = activeDays.has(todayKey) ? new Date() : new Date(Date.now() - 86_400_000)
    while (activeDays.has(toDateKey(checkDate.toISOString()))) {
      current++
      checkDate = new Date(checkDate.getTime() - 86_400_000)
    }
  }

  return { current, longest, activeDays }
}

export function useStreak() {
  const loading = ref(false)
  const streakData = ref<StreakData>({ current: 0, longest: 0, activeDays: new Set() })

  const current = computed(() => streakData.value.current)
  const longest = computed(() => streakData.value.longest)
  const isActiveToday = computed(() => streakData.value.activeDays.has(today()))

  async function load(studentId: number) {
    loading.value = true
    try {
      const [travauxRes, contactsRes] = await Promise.all([
        window.api.getStudentTravaux(studentId),
        window.api.getRecentDmContacts(studentId, 100),
      ])

      const dates: string[] = []

      // Depot dates
      if (travauxRes?.ok) {
        for (const d of travauxRes.data) {
          if (d.depot_id) dates.push(d.deadline)
        }
      }

      // DM activity dates
      if (contactsRes?.ok) {
        for (const c of contactsRes.data) {
          if (c.last_message_at) dates.push(c.last_message_at)
        }
      }

      streakData.value = computeStreak(dates)
    } finally {
      loading.value = false
    }
  }

  return { loading, current, longest, isActiveToday, streakData, load }
}
