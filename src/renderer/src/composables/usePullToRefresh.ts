/**
 * usePullToRefresh - composable pour le geste pull-to-refresh (mobile)
 * Détecte le glissement vertical sur un élément scrollable et déclenche un callback.
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const PULL_THRESHOLD = 60

export function usePullToRefresh(
  scrollEl: Ref<HTMLElement | null>,
  onRefresh: () => Promise<void>,
) {
  const isPulling    = ref(false)
  const pullDistance  = ref(0)
  const isRefreshing = ref(false)

  let startY = 0
  let tracking = false

  function onTouchStart(e: TouchEvent) {
    const el = scrollEl.value
    if (!el || el.scrollTop > 0) return
    startY = e.touches[0].clientY
    tracking = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking) return
    const el = scrollEl.value
    if (!el) return
    const dy = e.touches[0].clientY - startY
    if (dy > 0 && el.scrollTop <= 0) {
      isPulling.value = true
      pullDistance.value = Math.min(dy * 0.5, 120)
      if (dy > 10) e.preventDefault()
    } else {
      isPulling.value = false
      pullDistance.value = 0
    }
  }

  async function onTouchEnd() {
    if (!tracking) return
    tracking = false
    if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
      isRefreshing.value = true
      pullDistance.value = PULL_THRESHOLD
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }
    isPulling.value = false
    pullDistance.value = 0
  }

  onMounted(() => {
    const el = scrollEl.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const el = scrollEl.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  })

  return { isPulling, pullDistance, isRefreshing }
}
