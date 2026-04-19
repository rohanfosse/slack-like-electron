/**
 * useNotificationBanner — bandeau "Activer les notifications ?" affiche
 * apres 15s si l utilisateur n a encore ni accorde ni refuse la permission.
 *
 * Extrait de App.vue (inline setTimeout + 3 handlers). Centralise la logique
 * pour la rendre testable et nettoyee au unmount (le setTimeout n etait pas
 * clear avant — leak mineur si l app est unmount entre 0 et 15s).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

export const NOTIF_BANNER_DELAY_MS = 15_000

export function useNotificationBanner() {
  const visible = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function accept() {
    // La Promise Notification.requestPermission peut rejeter sur certains
    // navigateurs (Firefox legacy) — on avale l erreur.
    try { Notification.requestPermission().catch(() => {}) } catch { /* ignore */ }
    visible.value = false
  }

  function dismiss() {
    visible.value = false
  }

  onMounted(() => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    timer = setTimeout(() => { visible.value = true }, NOTIF_BANNER_DELAY_MS)
  })

  onBeforeUnmount(() => {
    if (timer) { clearTimeout(timer); timer = null }
  })

  return { visible, accept, dismiss }
}
