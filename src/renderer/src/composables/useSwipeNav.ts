/**
 * useSwipeNav — composable pour navigation par swipe (mobile drawer sidebar).
 * Swipe droite = ouvrir la sidebar, swipe gauche = fermer.
 * Actif uniquement sur les écrans tactiles < 768px.
 */
import { onMounted, onUnmounted, type Ref } from 'vue'

const SWIPE_THRESHOLD = 50
const EDGE_ZONE       = 30 // pixels depuis le bord gauche pour initier un swipe-open

export function useSwipeNav(
  sidebarOpen: Ref<boolean>,
  toggleSidebar: () => void,
) {
  let startX = 0
  let startY = 0
  let tracking = false

  function isMobile(): boolean {
    return window.innerWidth <= 768
  }

  function onTouchStart(e: TouchEvent) {
    if (!isMobile()) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    tracking = true
  }

  function onTouchEnd(e: TouchEvent) {
    if (!tracking) return
    tracking = false
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY

    // Ignorer les mouvements principalement verticaux
    if (Math.abs(dy) > Math.abs(dx)) return

    if (dx > SWIPE_THRESHOLD && !sidebarOpen.value && startX < EDGE_ZONE) {
      // Swipe droite depuis le bord — ouvrir
      toggleSidebar()
    } else if (dx < -SWIPE_THRESHOLD && sidebarOpen.value) {
      // Swipe gauche — fermer
      toggleSidebar()
    }
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchend', onTouchEnd)
  })
}
