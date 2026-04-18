/**
 * useSidebarDashboardSummary : resume promo active (nb etudiants / devoirs /
 * % rendus) + derniers rendus soumis (top 3, formate "il y a Xmin/h/j").
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import type { Promotion, Student } from '@/types'

export function useSidebarDashboardSummary(
  promotions: Ref<Promotion[]>,
  students: Ref<Student[]>,
) {
  const appStore = useAppStore()
  const travauxStore = useTravauxStore()

  const activePromoObj = computed(() =>
    promotions.value.find((p) => p.id === appStore.activePromoId) ?? null,
  )

  const promoSummary = computed(() => {
    const gantt = travauxStore.ganttData
    const published = gantt.filter((t) => t.published)
    let depots = 0
    let expected = 0
    for (const t of published) {
      depots += t.depots_count ?? 0
      expected += t.students_total ?? 0
    }
    const stuCount = students.value.filter((s) => s.promo_id === appStore.activePromoId && s.id > 0).length
    return {
      studentCount: stuCount,
      devoirCount: published.length,
      submissionPct: expected > 0 ? Math.round((depots / expected) * 100) : 0,
    }
  })

  const recentActivity = computed(() =>
    travauxStore.allRendus
      .filter((r) => r.submitted_at)
      .sort((a, b) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime())
      .slice(0, 3)
      .map((r) => {
        const ago = Date.now() - new Date(r.submitted_at!).getTime()
        const mins = Math.floor(ago / 60_000)
        const label = mins < 60
          ? `il y a ${mins}min`
          : mins < 1440
            ? `il y a ${Math.floor(mins / 60)}h`
            : `il y a ${Math.floor(mins / 1440)}j`
        return { id: r.id, text: `${r.student_name} - ${r.travail_title ?? 'devoir'}`, time: label }
      }),
  )

  return { activePromoObj, promoSummary, recentActivity }
}
