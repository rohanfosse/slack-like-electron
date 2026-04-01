/**
 * Charge les scores d'engagement et identifie les etudiants a risque.
 */
import { ref, computed, type Ref } from 'vue'

export interface EngagementScore {
  studentId: number
  name: string
  score: number
  messages: number
  onTime: number
  late: number
  missing: number
  totalDevoirs: number
  submitted: number
  lastActivity: string | null
  atRisk: boolean
}

export function useAtRiskStudents(promoId: Ref<number | null>) {
  const scores = ref<EngagementScore[]>([])
  const loading = ref(false)

  const atRiskStudents = computed(() =>
    scores.value
      .filter(s => s.atRisk)
      .sort((a, b) => b.missing - a.missing),
  )

  const atRiskCount = computed(() => atRiskStudents.value.length)

  const avgScore = computed(() => {
    if (!scores.value.length) return 0
    return Math.round(scores.value.reduce((sum, s) => sum + s.score, 0) / scores.value.length)
  })

  function daysSinceActivity(lastActivity: string | null): number | null {
    if (!lastActivity) return null
    const diff = Date.now() - new Date(lastActivity).getTime()
    return Math.floor(diff / 86_400_000)
  }

  async function load() {
    if (!promoId.value) return
    loading.value = true
    try {
      const res = await window.api.getEngagementScores(promoId.value)
      scores.value = res?.ok ? res.data : []
    } finally {
      loading.value = false
    }
  }

  return {
    scores,
    loading,
    atRiskStudents,
    atRiskCount,
    avgScore,
    daysSinceActivity,
    load,
  }
}
