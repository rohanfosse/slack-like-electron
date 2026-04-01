/**
 * Logique de notation en lot (batch grading).
 * Gere la navigation, le filtre, l'auto-save au changement d'etudiant, et les raccourcis clavier.
 */
import { ref, computed, watch, type Ref } from 'vue'
import type { Depot } from '@/types'

export type BatchFilter = 'all' | 'ungraded' | 'graded'
const GRADES = ['A', 'B', 'C', 'D'] as const
const ALL_GRADES = ['A', 'B', 'C', 'D', 'NA'] as const
type Grade = typeof GRADES[number]

export interface BatchGradingOptions {
  depots: Ref<Depot[]>
  onSave: (depotId: number, note: string, feedback: string) => Promise<void>
}

export function useBatchGrading({ depots, onSave }: BatchGradingOptions) {
  const active        = ref(false)
  const activeIndex   = ref(0)
  const filter        = ref<BatchFilter>('all')
  const pendingNote   = ref('')
  const pendingFeedback = ref('')
  const saving        = ref(false)
  const savedFlash    = ref(false)

  // Sort once, filter separately (avoids re-sorting on every computed access)
  const sortedDepots = computed(() =>
    [...depots.value].sort((a, b) => a.student_name.localeCompare(b.student_name)),
  )

  const filteredList = computed(() => {
    if (filter.value === 'ungraded') return sortedDepots.value.filter(d => d.note == null)
    if (filter.value === 'graded')   return sortedDepots.value.filter(d => d.note != null)
    return sortedDepots.value
  })

  const activeDepot = computed(() => filteredList.value[activeIndex.value] ?? null)

  const totalCount  = computed(() => depots.value.length)
  const gradedCount = computed(() => depots.value.filter(d => d.note != null).length)
  const progressPct = computed(() =>
    totalCount.value ? Math.round((gradedCount.value / totalCount.value) * 100) : 0,
  )

  const distribution = computed(() => {
    const counts: Record<string, number> = {}
    for (const d of depots.value) {
      if (d.note) counts[d.note] = (counts[d.note] ?? 0) + 1
    }
    return ALL_GRADES
      .filter(g => counts[g])
      .map(g => ({ grade: g, count: counts[g] }))
  })

  function selectIndex(i: number) {
    const clamped = Math.max(0, Math.min(i, filteredList.value.length - 1))
    if (clamped === activeIndex.value) return
    activeIndex.value = clamped
  }

  function next() { selectIndex(activeIndex.value + 1) }
  function prev() { selectIndex(activeIndex.value - 1) }

  function selectDepot(depotId: number) {
    const idx = filteredList.value.findIndex(d => d.id === depotId)
    if (idx >= 0) activeIndex.value = idx
  }

  // Sync pending values when active depot changes
  watch(activeDepot, (d) => {
    if (!d) return
    pendingNote.value     = d.note ?? ''
    pendingFeedback.value = d.feedback ?? ''
  })

  function setGrade(grade: Grade) {
    pendingNote.value = grade
  }

  // Skip save if nothing was entered (prevents overwriting existing data with empty string)
  function hasChanges(depot: Depot): boolean {
    const noteChanged = pendingNote.value !== (depot.note ?? '')
    const feedbackChanged = pendingFeedback.value !== (depot.feedback ?? '')
    return noteChanged || feedbackChanged
  }

  async function save(): Promise<boolean> {
    const d = activeDepot.value
    if (!d || saving.value) return false
    if (!hasChanges(d)) return false
    saving.value = true
    try {
      await onSave(d.id, pendingNote.value, pendingFeedback.value)
      savedFlash.value = true
      setTimeout(() => { savedFlash.value = false }, 600)
      return true
    } finally {
      saving.value = false
    }
  }

  // Auto-save previous depot when navigating (uses oldIdx to avoid watcher race)
  let skipAutoSave = false
  watch(activeIndex, async (_newIdx, oldIdx) => {
    if (oldIdx == null || !active.value || skipAutoSave) {
      skipAutoSave = false
      return
    }
    const prevDepot = filteredList.value[oldIdx]
    if (prevDepot && pendingNote.value) {
      saving.value = true
      try {
        const noteChanged = pendingNote.value !== (prevDepot.note ?? '')
        const feedbackChanged = pendingFeedback.value !== (prevDepot.feedback ?? '')
        if (noteChanged || feedbackChanged) {
          await onSave(prevDepot.id, pendingNote.value, pendingFeedback.value)
        }
      } finally {
        saving.value = false
      }
    }
    skipAutoSave = false
  })

  async function saveAndNext() {
    const ok = await save()
    if (ok) {
      skipAutoSave = true
      next()
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!active.value) return

    const target = e.target as HTMLElement
    const inTextarea = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT'

    if (e.key === 'Escape') {
      e.preventDefault()
      active.value = false
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (e.key === 'ArrowUp') prev()
      else next()
      return
    }

    if (e.key === 'Enter' && inTextarea && !e.shiftKey) {
      e.preventDefault()
      saveAndNext()
      return
    }

    if (!inTextarea) {
      const upper = e.key.toUpperCase()
      if (GRADES.includes(upper as Grade)) {
        e.preventDefault()
        setGrade(upper as Grade)
        return
      }
    }
  }

  function toggle() {
    active.value = !active.value
    if (active.value) {
      activeIndex.value = 0
      // The watch(activeDepot) will sync pendingNote/pendingFeedback automatically
    }
  }

  return {
    active,
    activeIndex,
    filter,
    pendingNote,
    pendingFeedback,
    saving,
    savedFlash,
    filteredList,
    activeDepot,
    totalCount,
    gradedCount,
    progressPct,
    distribution,
    toggle,
    next,
    prev,
    selectIndex,
    selectDepot,
    setGrade,
    save,
    saveAndNext,
    handleKeydown,
  }
}
