/**
 * useSidebarCategoryDrag : drag & drop des groupes de categories pour les
 * reordonner. Les channels a l'interieur d'un groupe sont geres par
 * useSidebarActions (drag d'un canal entre categories).
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

export interface CategoryGroup {
  label: string
  key: string
  channels: { id: number; name: string }[]
}

export function useSidebarCategoryDrag<G extends CategoryGroup>(
  sortedGroups: Ref<G[]>,
  reorderCategories: (groups: G[]) => void,
) {
  const dragging = ref<G | null>(null)

  function onStart(e: DragEvent, group: G) {
    dragging.value = group
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onOver(e: DragEvent, _target?: G) {
    e.preventDefault()
  }

  function onDrop(_e: DragEvent, target: G) {
    if (!dragging.value || dragging.value.key === target.key) return
    const groups = [...sortedGroups.value]
    const fromIdx = groups.findIndex((g) => g.key === dragging.value!.key)
    const toIdx = groups.findIndex((g) => g.key === target.key)
    if (fromIdx < 0 || toIdx < 0) return
    const [moved] = groups.splice(fromIdx, 1)
    groups.splice(toIdx, 0, moved)
    reorderCategories(groups)
    dragging.value = null
  }

  function onEnd() {
    dragging.value = null
  }

  return { dragging, onStart, onOver, onDrop, onEnd }
}
