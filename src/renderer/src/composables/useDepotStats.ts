/**
 * useDepotStats : stats agregees sur la liste des depots d'un devoir.
 * Fournit progression, distribution des notes, note la plus frequente,
 * taux de soumission et nombre de depots non notes.
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Depot } from '@/types'

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'NA']

export function useDepotStats(depots: Ref<Depot[]>) {
  const totalStudents = computed(() => depots.value.length)
  const notedCount = computed(() => depots.value.filter((d) => d.note != null).length)
  const progressPct = computed(() =>
    totalStudents.value ? Math.round((notedCount.value / totalStudents.value) * 100) : 0,
  )

  const gradeDistribution = computed(() => {
    const counts: Record<string, number> = {}
    for (const d of depots.value) {
      if (d.note) counts[d.note] = (counts[d.note] ?? 0) + 1
    }
    return GRADE_ORDER
      .filter((g) => counts[g])
      .map((g) => ({ grade: g, count: counts[g] }))
  })

  /** Note la plus frequente (ou null si aucune note attribuee). */
  const modeGrade = computed(() => {
    if (!gradeDistribution.value.length) return null
    return gradeDistribution.value.reduce((a, b) => (b.count > a.count ? b : a)).grade
  })

  const submittedCount = computed(() =>
    depots.value.filter((d) => d.content || d.file_name).length,
  )

  /** Depots soumis mais pas encore notes (cible du "marquer tout D" / batch). */
  const ungradedCount = computed(() =>
    depots.value.filter((d) => d.note == null && (d.content || d.file_name)).length,
  )

  return {
    totalStudents, notedCount, progressPct,
    gradeDistribution, modeGrade,
    submittedCount, ungradedCount,
  }
}
