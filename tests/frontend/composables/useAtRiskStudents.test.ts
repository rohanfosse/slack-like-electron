/**
 * Tests pour le composable useAtRiskStudents — logique pure (filtering, sorting).
 */
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useAtRiskStudents, type EngagementScore } from '@/composables/useAtRiskStudents'

// Mock window.api
vi.stubGlobal('window', {
  api: {
    getEngagementScores: vi.fn(),
  },
})

const SCORES: EngagementScore[] = [
  { studentId: 1, name: 'Alice', score: 85, messages: 50, onTime: 8, late: 1, missing: 0, totalDevoirs: 9, submitted: 9, lastActivity: '2026-04-01T10:00:00Z', atRisk: false },
  { studentId: 2, name: 'Bob', score: 25, messages: 5, onTime: 2, late: 2, missing: 4, totalDevoirs: 8, submitted: 4, lastActivity: '2026-03-20T10:00:00Z', atRisk: true },
  { studentId: 3, name: 'Claire', score: 15, messages: 1, onTime: 1, late: 0, missing: 6, totalDevoirs: 7, submitted: 1, lastActivity: null, atRisk: true },
  { studentId: 4, name: 'David', score: 60, messages: 30, onTime: 5, late: 2, missing: 1, totalDevoirs: 8, submitted: 7, lastActivity: '2026-03-31T10:00:00Z', atRisk: false },
]

describe('useAtRiskStudents', () => {
  it('filters at-risk students', async () => {
    ;(window.api.getEngagementScores as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: SCORES })
    const promoId = ref<number | null>(1)
    const { atRiskStudents, load } = useAtRiskStudents(promoId)
    await load()
    expect(atRiskStudents.value.length).toBe(2)
    expect(atRiskStudents.value.every(s => s.atRisk)).toBe(true)
  })

  it('sorts at-risk by missing count descending', async () => {
    ;(window.api.getEngagementScores as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: SCORES })
    const promoId = ref<number | null>(1)
    const { atRiskStudents, load } = useAtRiskStudents(promoId)
    await load()
    expect(atRiskStudents.value[0].name).toBe('Claire') // 6 missing
    expect(atRiskStudents.value[1].name).toBe('Bob')    // 4 missing
  })

  it('computes atRiskCount', async () => {
    ;(window.api.getEngagementScores as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: SCORES })
    const promoId = ref<number | null>(1)
    const { atRiskCount, load } = useAtRiskStudents(promoId)
    await load()
    expect(atRiskCount.value).toBe(2)
  })

  it('computes avgScore', async () => {
    ;(window.api.getEngagementScores as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: SCORES })
    const promoId = ref<number | null>(1)
    const { avgScore, load } = useAtRiskStudents(promoId)
    await load()
    expect(avgScore.value).toBe(Math.round((85 + 25 + 15 + 60) / 4))
  })

  it('daysSinceActivity returns correct days', () => {
    const promoId = ref<number | null>(1)
    const { daysSinceActivity } = useAtRiskStudents(promoId)
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(daysSinceActivity(twoDaysAgo)).toBe(2)
  })

  it('daysSinceActivity returns null for null input', () => {
    const promoId = ref<number | null>(1)
    const { daysSinceActivity } = useAtRiskStudents(promoId)
    expect(daysSinceActivity(null)).toBeNull()
  })

  it('does not load when promoId is null', async () => {
    const spy = (window.api.getEngagementScores as ReturnType<typeof vi.fn>)
    spy.mockClear()
    const promoId = ref<number | null>(null)
    const { load } = useAtRiskStudents(promoId)
    await load()
    expect(spy).not.toHaveBeenCalled()
  })

  it('handles API error gracefully', async () => {
    ;(window.api.getEngagementScores as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, error: 'fail' })
    const promoId = ref<number | null>(1)
    const { scores, load } = useAtRiskStudents(promoId)
    await load()
    expect(scores.value).toEqual([])
  })
})
