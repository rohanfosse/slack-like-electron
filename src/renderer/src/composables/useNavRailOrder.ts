/**
 * useNavRailOrder - ordre + visibilite des boutons de la sidebar (NavRail).
 *
 * L'utilisateur peut :
 *  - drag-and-drop les elements de navigation pour les reordonner
 *  - clic-droit sur un element pour le masquer
 *  - clic-droit sur la navrail vide pour reafficher les masques
 *
 * Persistance locale (localStorage).
 *
 * - Les ids inconnus stockes sont ignores (ex: module retire).
 * - Les nouveaux ids absents de l'ordre apparaissent a la fin par defaut.
 * - La visibilite "systeme" (module desactive, role incompatible) est
 *   decidee par l'appelant via `isSystemVisible` et ne fait pas partie
 *   de l'etat stocke. Le masquage utilisateur est independant et cumulatif.
 */
import { ref, computed, type Ref } from 'vue'
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage'

const ORDER_KEY  = 'cc_navrail_order_v1'
const HIDDEN_KEY = 'cc_navrail_hidden_v1'

export function useNavRailOrder(defaultOrder: readonly string[]) {
  const savedOrder:   Ref<string[]> = ref(safeGetJSON<string[]>(ORDER_KEY,  []))
  const hiddenIds:    Ref<string[]> = ref(safeGetJSON<string[]>(HIDDEN_KEY, []))

  function persistOrder(ids: string[]) {
    savedOrder.value = ids
    safeSetJSON(ORDER_KEY, ids)
  }

  function persistHidden(ids: string[]) {
    hiddenIds.value = ids
    safeSetJSON(HIDDEN_KEY, ids)
  }

  /** Ordre effectif : ids sauves (filtres par defaultOrder) puis ids manquants
   *  dans l'ordre canonique. Inclut les masques — l'appelant decide de les
   *  rendre ou non via `isHidden`. */
  const effectiveOrder = computed<string[]>(() => {
    const known = new Set<string>(defaultOrder)
    const seen = new Set<string>()
    const result: string[] = []
    for (const id of savedOrder.value) {
      if (known.has(id) && !seen.has(id)) { result.push(id); seen.add(id) }
    }
    for (const id of defaultOrder) {
      if (!seen.has(id)) { result.push(id); seen.add(id) }
    }
    return result
  })

  const hiddenSet = computed<Set<string>>(() => new Set(hiddenIds.value))
  function isHidden(id: string): boolean { return hiddenSet.value.has(id) }

  /** Deplace `draggedId` juste avant `targetId`. No-op si ids identiques. */
  function move(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const current = [...effectiveOrder.value]
    const from = current.indexOf(draggedId)
    if (from === -1) return
    current.splice(from, 1)
    const to = current.indexOf(targetId)
    if (to === -1) current.push(draggedId)
    else current.splice(to, 0, draggedId)
    persistOrder(current)
  }

  function hide(id: string) {
    if (hiddenSet.value.has(id)) return
    persistHidden([...hiddenIds.value, id])
  }

  function show(id: string) {
    if (!hiddenSet.value.has(id)) return
    persistHidden(hiddenIds.value.filter(x => x !== id))
  }

  function moveTo(id: string, position: 'top' | 'bottom') {
    const current = [...effectiveOrder.value]
    const idx = current.indexOf(id)
    if (idx === -1) return
    current.splice(idx, 1)
    if (position === 'top') current.unshift(id)
    else current.push(id)
    persistOrder(current)
  }

  function reset() {
    persistOrder([])
    persistHidden([])
  }

  return {
    effectiveOrder,
    hiddenIds: computed(() => hiddenIds.value),
    isHidden,
    move,
    moveTo,
    hide,
    show,
    reset,
  }
}
