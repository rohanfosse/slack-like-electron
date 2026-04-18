/**
 * useSidebarDocsHelpers : derive listes/compteurs pour la sidebar Documents.
 */
import { computed } from 'vue'
import { useDocumentsStore } from '@/stores/documents'

export function useSidebarDocsHelpers() {
  const docStore = useDocumentsStore()

  const docCategories = computed(() => {
    const cats = new Set(docStore.documents.map((d) => d.category ?? 'General'))
    return Array.from(cats).sort()
  })

  const projectDocCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const d of docStore.documents) {
      const p = d.project ?? ''
      counts[p] = (counts[p] ?? 0) + 1
    }
    return counts
  })

  const docCatCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const d of docStore.documents) {
      const cat = d.category ?? 'General'
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
  })

  return { docCategories, projectDocCounts, docCatCounts }
}
