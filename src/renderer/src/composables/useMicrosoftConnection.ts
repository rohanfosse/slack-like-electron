/**
 * useMicrosoftConnection : gere la connexion OAuth Microsoft 365 (Azure AD)
 * partagee entre les vues Settings > Integrations et le Dashboard Booking.
 *
 * Etat module-level (singleton) pour que tous les consommateurs restent
 * synchronises apres connect/disconnect.
 *
 * Flow :
 *   connect()    - ouvre consent Azure AD dans le navigateur
 *                  + poll le serveur toutes les 3s pendant 2 min max
 *   disconnect() - revoke tokens + reset etat local
 *   refresh()    - re-check le statut (appele au mount)
 */
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'

const connected = ref(false)
const expiresAt = ref<string | null>(null)
const loading = ref(false)

let pollInterval: ReturnType<typeof setInterval> | null = null
let pollTimeout: ReturnType<typeof setTimeout> | null = null

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
  if (pollTimeout) { clearTimeout(pollTimeout); pollTimeout = null }
}

export function useMicrosoftConnection() {
  const { showToast } = useToast()

  async function refresh(): Promise<void> {
    try {
      const res = await window.api.getBookingOAuthStatus()
      if (res.ok && res.data) {
        connected.value = res.data.connected
        expiresAt.value = res.data.expiresAt ?? null
      }
    } catch { /* ignore */ }
  }

  async function connect(): Promise<void> {
    loading.value = true
    try {
      const res = await window.api.startBookingOAuth()
      if (!res.ok || !res.data?.url) {
        showToast(res.error || 'Erreur OAuth Microsoft', 'error')
        return
      }
      window.api.openExternal(res.data.url)
      stopPolling()
      pollInterval = setInterval(async () => {
        const st = await window.api.getBookingOAuthStatus()
        if (st.ok && st.data?.connected) {
          connected.value = true
          expiresAt.value = st.data.expiresAt ?? null
          stopPolling()
          showToast('Compte Microsoft connecte', 'success')
        }
      }, 3000)
      pollTimeout = setTimeout(stopPolling, 120_000)
    } catch {
      showToast('Erreur lors de la connexion Microsoft', 'error')
    } finally {
      loading.value = false
    }
  }

  async function disconnect(): Promise<void> {
    loading.value = true
    try {
      const res = await window.api.disconnectBookingOAuth()
      if (res.ok) {
        connected.value = false
        expiresAt.value = null
        showToast('Compte Microsoft deconnecte', 'success')
      } else {
        showToast(res.error || 'Erreur', 'error')
      }
    } catch {
      showToast('Erreur lors de la deconnexion', 'error')
    } finally {
      loading.value = false
    }
  }

  return { connected, expiresAt, loading, connect, disconnect, refresh, stopPolling }
}
