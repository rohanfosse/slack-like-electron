/**
 * useDemoTyping - poll l'endpoint /api/demo/typing-feed et alimente le
 * messages store avec setTyping(name) pour le canal actif.
 *
 * Rationale : en demo (web), il n'y a pas de socket.io donc l'evenement
 * "X est en train d'ecrire" ne peut pas etre push. Le serveur (demoBots)
 * pose un flag en memoire 2-3s avant chaque insertion bot ; ce composable
 * recupere ces flags par poll rapide (1.5s) et appelle messagesStore.setTyping
 * comme si le socket avait emis un evenement. L'UI existante (typingText
 * computed) prend le relais sans modification.
 *
 * Filtre cote client sur activeChannelId pour ne pas afficher "X tape dans
 * #algorithmique" alors que le visiteur est dans #developpement-web —
 * fideliser au comportement prod.
 */
import { onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'

const POLL_INTERVAL_MS = 1_800

export function useDemoTyping(): void {
  const appStore = useAppStore()
  const messagesStore = useMessagesStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  async function pollOnce(): Promise<void> {
    if (!appStore.currentUser?.demo) return
    const fn = window.api?.demoTypingFeed
    if (typeof fn !== 'function') return
    let res
    try { res = await fn() } catch { return }
    if (!res?.ok || !res.data) return

    const entries = res.data.entries || []
    const activeChannelId = appStore.activeChannelId
    if (!activeChannelId) return

    // setTyping declenche un timeout de 3s cote messagesStore qui clear
    // tout seul. Donc tant qu'on continue de poller pendant que le bot
    // "ecrit", l'indicateur reste visible. Quand le bot insere et que le
    // server clear le flag, on arrete d'appeler setTyping et la fenetre
    // de 3s expire naturellement.
    for (const e of entries) {
      if (e.channelId === activeChannelId && e.authorName) {
        messagesStore.setTyping(e.authorName)
      }
    }
  }

  function schedule(): void {
    timer = setTimeout(() => {
      pollOnce().finally(() => {
        if (appStore.currentUser?.demo) schedule()
        else timer = null
      })
    }, POLL_INTERVAL_MS)
  }

  function start(): void { if (!timer) schedule() }
  function stop(): void  { if (timer) { clearTimeout(timer); timer = null } }

  watch(
    () => appStore.currentUser?.demo === true,
    (isDemo) => { if (isDemo) start(); else stop() },
    { immediate: true },
  )

  onUnmounted(stop)
}
