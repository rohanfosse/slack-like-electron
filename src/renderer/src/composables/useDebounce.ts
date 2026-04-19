import {
  ref,
  watch,
  unref,
  onUnmounted,
  onScopeDispose,
  getCurrentInstance,
  getCurrentScope,
  type Ref,
  type MaybeRef,
} from 'vue'

/**
 * Retourne une ref debounced qui ne se met à jour
 * qu'après `delay` ms sans changement de `source`.
 *
 * - `delay` peut être un nombre ou un `Ref<number>` (réactif).
 * - Les timers sont automatiquement nettoyés à l'unmount / dispose du scope.
 * - Si la nouvelle valeur est identique à la valeur debounced courante, aucun timer n'est planifié.
 */
export function useDebounce<T>(source: Ref<T>, delay: MaybeRef<number> = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null

  function clear(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const stopWatch = watch(source, (val) => {
    clear()
    // Skip if already equal (évite les writes inutiles + watchers dérivés)
    if (Object.is(val, debounced.value)) return
    const d = Math.max(0, unref(delay) ?? 0)
    timer = setTimeout(() => {
      timer = null
      debounced.value = val
    }, d)
  })

  function dispose(): void {
    stopWatch()
    clear()
  }

  // Enregistrement du cleanup sur le propriétaire disponible (instance > scope effet)
  if (getCurrentInstance()) {
    onUnmounted(dispose)
  } else if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

  return debounced
}
