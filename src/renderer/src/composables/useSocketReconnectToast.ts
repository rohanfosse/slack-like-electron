/**
 * useSocketReconnectToast — toast discret pour la connexion socket.
 *
 * Quand la socket se deconnecte, on attend 3s avant de montrer "Reconnexion
 * en cours..." (les micro-coupures sont frequentes en salle de classe avec
 * Wi-Fi flappy et ne meritent pas un flash visuel).
 *
 * Quand la socket revient, on affiche "Reconnecté" et on re-sync le canal
 * actif pour rattraper les messages manques.
 *
 * Extrait de App.vue pour reduire la taille de l entree et permettre un
 * test unitaire isole (timer + transition connected/disconnected).
 */
import { watch, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'
import { useToast } from '@/composables/useToast'

export const RECONNECT_TOAST_DELAY_MS = 3000

export function useSocketReconnectToast() {
  const appStore = useAppStore()
  const { showToast } = useToast()

  let wasDisconnected = false
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null

  const stop = watch(() => appStore.socketConnected, (connected) => {
    if (connected && wasDisconnected) {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null }
      showToast('Reconnecté', 'success')
      // Re-sync : recharger les messages du canal actif pour rattraper
      // les messages manques pendant la coupure.
      try { useMessagesStore().fetchMessages?.() } catch { /* ignore */ }
    } else if (!connected && appStore.currentUser) {
      disconnectTimer = setTimeout(() => {
        showToast('Reconnexion en cours…', 'info')
      }, RECONNECT_TOAST_DELAY_MS)
    }
    wasDisconnected = !connected
  })

  onBeforeUnmount(() => {
    stop()
    if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null }
  })
}
