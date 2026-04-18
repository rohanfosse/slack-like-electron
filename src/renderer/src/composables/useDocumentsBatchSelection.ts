/**
 * useDocumentsBatchSelection : selection multiple de documents pour suppression
 * en masse. Optimistic : on tente chaque delete individuellement et on compte
 * les succes avant d'afficher le toast final.
 */
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { AppDocument } from '@/types'

export function useDocumentsBatchSelection(filtered: Ref<AppDocument[]>) {
  const docStore = useDocumentsStore()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const selectionMode = ref(false)
  const selectedIds = ref<Set<number>>(new Set())

  function toggle(id: number) {
    if (selectedIds.value.has(id)) selectedIds.value.delete(id)
    else selectedIds.value.add(id)
    selectedIds.value = new Set(selectedIds.value)
  }

  function selectAll() {
    for (const doc of filtered.value) selectedIds.value.add(doc.id)
    selectedIds.value = new Set(selectedIds.value)
  }

  function clear() {
    selectedIds.value = new Set()
    selectionMode.value = false
  }

  async function deleteSelected() {
    if (!selectedIds.value.size) return
    const count = selectedIds.value.size
    const ok = await confirm(
      `Supprimer ${count} document${count > 1 ? 's' : ''} ?`,
      'danger',
      'Supprimer',
    )
    if (!ok) return
    let deleted = 0
    for (const id of selectedIds.value) {
      const res = await docStore.deleteDocument(id)
      if (res) deleted++
    }
    showToast(`${deleted} document${deleted > 1 ? 's' : ''} supprime${deleted > 1 ? 's' : ''}.`, 'success')
    clear()
  }

  return { selectionMode, selectedIds, toggle, selectAll, clear, deleteSelected }
}
