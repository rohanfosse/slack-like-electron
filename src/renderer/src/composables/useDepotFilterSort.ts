/**
 * useDepotFilterSort : filtre par nom + tri (nom/date) sur la liste des
 * depots. Les deux etats sont locaux au modal.
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { Depot } from '@/types'

export type DepotSortMode = 'name' | 'date'

export function useDepotFilterSort(depots: Ref<Depot[]>) {
  const searchQuery = ref('')
  const sortMode = ref<DepotSortMode>('name')

  const filtered = computed(() => {
    let list = [...depots.value]
    const q = searchQuery.value.trim().toLowerCase()
    if (q) list = list.filter((d) => d.student_name.toLowerCase().includes(q))
    if (sortMode.value === 'name') {
      list.sort((a, b) => a.student_name.localeCompare(b.student_name))
    } else {
      list.sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))
    }
    return list
  })

  return { searchQuery, sortMode, filtered }
}
