/**
 * useDepotActions : actions ponctuelles sur un depot (ouvrir/telecharger),
 * ou sur le devoir entier (marquer tout D, export CSV) + ouverture des
 * modales rubric.
 */
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import { useModalsStore } from '@/stores/modals'
import { useToast } from '@/composables/useToast'
import { useOpenExternal } from '@/composables/useOpenExternal'
import type { Depot } from '@/types'

export function formatLateDelay(seconds: number): string {
  if (seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const d = Math.floor(h / 24)
  if (d >= 1) return `+${d}j ${h % 24}h`
  return `+${h}h${Math.floor((seconds % 3600) / 60)}min`
}

export function useDepotActions() {
  const appStore = useAppStore()
  const travauxStore = useTravauxStore()
  const modals = useModalsStore()
  const { showToast } = useToast()
  const { openExternal } = useOpenExternal()

  async function openDepot(d: Depot) {
    if (d.type === 'link') await openExternal(d.content)
    else await window.api.openPath(d.content)
  }

  async function downloadDepot(d: Depot) {
    if (d.type === 'file') await window.api.downloadFile(d.content)
  }

  async function markAllD() {
    if (!appStore.currentTravailId) return
    await travauxStore.markNonSubmittedAsD(appStore.currentTravailId)
    showToast('Rendus manquants marques D', 'success')
  }

  async function exportCsv() {
    if (!appStore.currentTravailId) return
    const res = await window.api.exportCsv(appStore.currentTravailId)
    if (res?.ok && res.data) showToast(`Export : ${res.data}`, 'success')
  }

  function openRubricEditor() {
    appStore.rubricDepotId = null
    modals.rubric = true
  }

  function openRubricScoring(d: Depot) {
    appStore.rubricDepotId = d.id
    modals.rubric = true
  }

  return {
    openDepot, downloadDepot,
    markAllD, exportCsv,
    openRubricEditor, openRubricScoring,
  }
}
