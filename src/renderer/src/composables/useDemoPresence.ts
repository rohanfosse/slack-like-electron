/**
 * useDemoPresence - simule une presence Socket.IO via polling HTTP en demo.
 *
 * En mode normal, le backend emet `presence:update` via Socket.IO toutes les
 * fois qu'un user se connecte/deconnecte. En mode demo, on n'a pas de socket
 * actif (le shim skip `connectSocket` car le middleware socket auth rejette
 * les JWT demo). On simule donc la presence en pollant `/api/demo/presence`
 * toutes les ~10s et on injecte le resultat dans `appStore.onlineUsers`,
 * que les composants existants consomment deja (Sidebar, Dashboard, etc.).
 *
 * Auto-start a chaque login demo via App.vue, auto-stop au logout / unmount.
 */
import { onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'

const POLL_INTERVAL_MS = 10_000

interface DemoPresenceResponse {
  ok: boolean
  data?: {
    online: Array<{ id: number; name: string; role: string; status: null }>
    typing: { channelId: number; userName: string } | null
  }
}

export function useDemoPresence() {
  const appStore = useAppStore()
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function tick() {
    try {
      const res = await window.api.demoPresence?.()
      if (!res?.ok || !res.data) return
      // Met directement a jour onlineUsers : les composants consommateurs
      // (sidebar, dashboard, WidgetPromoActivity) reagiront automatiquement.
      appStore.onlineUsers = res.data.online
      // Le typing est ignore en V3 MVP — les composables qui l'utilisent
      // s'attendent a un event Socket.IO (`onTyping`) qu'on ne peut pas
      // facilement simuler sans refacto. Garder le payload pour V4 si
      // besoin (ex. dispatch d'un CustomEvent).
    } catch {
      // Reseau / serveur down : on continue silencieusement, pas de spam log.
    }
  }

  function start() {
    if (pollTimer) return
    void tick() // premier tick immediat
    pollTimer = setInterval(tick, POLL_INTERVAL_MS)
  }

  function stop() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  // Auto start/stop sur le passage demo on/off (login, logout, leave demo).
  const stopWatch = watch(
    () => appStore.currentUser?.demo === true,
    (isDemo) => {
      if (isDemo) start()
      else { stop(); appStore.onlineUsers = [] }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stop()
    stopWatch()
  })

  return { start, stop }
}
