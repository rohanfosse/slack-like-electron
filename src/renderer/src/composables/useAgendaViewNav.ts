/**
 * useAgendaViewNav : etat de la vue calendrier + navigation (prev/next/today).
 * Expose `calRef` que le composant doit binder sur <VueCal :ref="...">.
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

export type AgendaView = 'month' | 'week' | 'day'

interface VueCalInstance {
  previous?: () => void
  next?: () => void
}

const VIEW_KEY = 'cc_agenda_view'
function loadInitialView(): AgendaView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (v === 'month' || v === 'week' || v === 'day') return v
  } catch { /* ignore */ }
  return 'week'
}

export function useAgendaViewNav(initialDate?: string) {
  const calRef: Ref<VueCalInstance | null> = ref(null)
  const activeView = ref<AgendaView>(loadInitialView())
  const currentTitle = ref('')
  const selectedDate = ref(initialDate ?? new Date().toISOString().slice(0, 10))

  function onViewChange(event: { view: string; startDate: Date; endDate: Date }) {
    const view = event.view as AgendaView
    if (view === 'month' || view === 'week' || view === 'day') activeView.value = view
    const start = event.startDate
    const end = event.endDate
    if (view === 'month') {
      currentTitle.value = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    } else if (view === 'day') {
      currentTitle.value = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    } else {
      const sameMonth = start.getMonth() === end.getMonth()
      currentTitle.value = sameMonth
        ? `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        : `${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
    }
  }

  function goPrev() { calRef.value?.previous?.() }
  function goNext() { calRef.value?.next?.() }
  function goToday() { selectedDate.value = new Date().toISOString().slice(0, 10) }
  function switchView(view: AgendaView) {
    activeView.value = view
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* ignore */ }
  }

  return { calRef, activeView, currentTitle, selectedDate, onViewChange, goPrev, goNext, goToday, switchView }
}
