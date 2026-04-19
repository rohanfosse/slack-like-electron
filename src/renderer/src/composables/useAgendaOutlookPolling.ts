/**
 * useAgendaOutlookPolling : fetch des events Outlook sur une fenêtre de
 * ± 1 mois autour de la date sélectionnée + auto-refresh toutes les 5 min.
 * Réactif au changement de showOutlook et selectedDate.
 *
 * Robustesse :
 *  - Un seul watcher combiné (évite les doubles fetches au changement simultané).
 *  - Les fetches concurrents sont dédupliqués (le store gère aussi un guard).
 *  - Les dates invalides sont rejetées avant l'appel réseau.
 *  - Le polling est arrêté/redémarré automatiquement selon `showOutlook`+`isTeacher`.
 */
import { watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { useAgendaStore } from '@/stores/agenda'

const POLL_INTERVAL_MS = 5 * 60 * 1000

function parseAnchor(iso: string): Date | null {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

function windowAround(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor)
  from.setDate(1)
  from.setMonth(from.getMonth() - 1)
  const to = new Date(anchor)
  to.setDate(1)
  to.setMonth(to.getMonth() + 2)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function useAgendaOutlookPolling(
  isTeacher: Ref<boolean>,
  showOutlook: Ref<boolean>,
  selectedDate: Ref<string>,
) {
  const agenda = useAgendaStore()
  let interval: ReturnType<typeof setInterval> | null = null
  let loading = false

  async function load(): Promise<void> {
    if (loading) return
    const anchor = parseAnchor(selectedDate.value)
    if (!anchor) return
    const { from, to } = windowAround(anchor)
    loading = true
    try {
      await agenda.fetchOutlookEvents(from, to)
    } finally {
      loading = false
    }
  }

  function shouldPoll(): boolean {
    return showOutlook.value && isTeacher.value
  }

  function start(): void {
    stop()
    interval = setInterval(() => {
      if (shouldPoll()) load()
    }, POLL_INTERVAL_MS)
  }

  function stop(): void {
    if (interval) { clearInterval(interval); interval = null }
  }

  // Un seul watcher combiné : évite les doubles déclenchements lorsque
  // `showOutlook` et `selectedDate` changent dans le même tick.
  watch(
    () => [showOutlook.value, selectedDate.value, isTeacher.value] as const,
    ([show, , teacher], oldVals) => {
      const prevShow = oldVals?.[0]
      // Le toggle showOutlook pilote aussi l'état du store (source unique de vérité).
      if (prevShow !== undefined && prevShow !== show) agenda.toggleOutlookSync(show)
      if (show && teacher) load()
      // Synchronise le polling avec l'état courant (auto-pause quand inutile).
      if (shouldPoll()) {
        if (!interval) start()
      } else {
        stop()
      }
    },
  )

  onBeforeUnmount(stop)

  return { load, start, stop }
}
