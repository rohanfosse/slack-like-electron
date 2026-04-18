/**
 * useDocumentsViewMode : persistance du mode d'affichage (grid/list/dense)
 * dans localStorage. Cle dediee pour la vue Documents.
 */
import { ref, watch } from 'vue'

export type DocumentsViewMode = 'grid' | 'list' | 'dense'

const STORAGE_KEY = 'cc_docs_view_mode'

export function useDocumentsViewMode() {
  const mode = ref<DocumentsViewMode>(
    (localStorage.getItem(STORAGE_KEY) as DocumentsViewMode) ?? 'grid',
  )
  watch(mode, (v) => localStorage.setItem(STORAGE_KEY, v))
  return { mode }
}
