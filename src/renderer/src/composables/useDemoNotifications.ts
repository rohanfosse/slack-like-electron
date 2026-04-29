/**
 * useDemoNotifications - notifications adossees a l'activite reelle des bots
 *
 * V3 : on remplace le catalogue de scenarios scriptes par un poll de
 * `/api/demo/notifications/feed?since=<lastId>`. L'endpoint renvoie les
 * messages reellement inseres en DB par le worker `demoBots.js` depuis
 * le dernier tick. Chaque event devient un toast. Resultat : le visiteur
 * voit des notifs qui correspondent a ce qui se passe vraiment dans les
 * canaux (s'il ouvre #algorithmique apres une notif "Sara a poste...",
 * il trouve effectivement le message).
 *
 * Cadence du poll calee sur le tick des bots (60s server-side) avec un
 * delai initial pour laisser le temps de scanner le dashboard.
 */
import { onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'

interface FeedEvent {
  id: number
  channelId: number | null
  channelName: string | null
  author: string
  initials: string | null
  preview: string
  isMention: boolean
  isDm: boolean
  createdAt: string
}

const FIRST_POLL_DELAY_MS = 18_000   // 18s : laisser le visiteur scanner le dashboard
const POLL_INTERVAL_MS    = 30_000   // 30s : aligne sur le tick bots (assez vif)
const MAX_TOASTS_PER_TICK = 3        // ne jamais en cracher plus de 3 d'un coup

function buildToast(ev: FeedEvent): { title: string; body: string } {
  if (ev.isDm) {
    return {
      title: ev.author,
      body: `t'a envoye un message direct : "${ev.preview}"`,
    }
  }
  const channel = ev.channelName ? `#${ev.channelName}` : ''
  if (ev.isMention) {
    return {
      title: ev.author,
      body: `t'a mentionne(e) dans ${channel} : "${ev.preview}"`,
    }
  }
  return {
    title: ev.author,
    body: `${channel} : ${ev.preview}`,
  }
}

export function useDemoNotifications(): void {
  const appStore = useAppStore()
  let outerTimer: ReturnType<typeof setTimeout> | null = null
  let stepTimers: Set<ReturnType<typeof setTimeout>> = new Set()
  // -1 = inconnu, 0 = "tout neuf depuis maintenant" (premier poll initialise)
  let lastSeenId = -1

  function fireNotif(title: string, body: string): void {
    if (!appStore.currentUser?.demo) return
    try {
      window.dispatchEvent(new CustomEvent('cursus:notif-toast', { detail: { title, body } }))
    } catch { /* CustomEvent indisponible */ }
  }

  async function pollOnce(): Promise<void> {
    if (!appStore.currentUser?.demo) return
    const fn = window.api?.demoNotifFeed
    if (typeof fn !== 'function') return
    let res
    try {
      res = await fn(lastSeenId < 0 ? 0 : lastSeenId)
    } catch { return }
    if (!res?.ok || !res.data) return

    const events = (res.data.events || []) as FeedEvent[]

    // 1er poll : on prend juste le lastId comme baseline, pas de toasts
    // (sinon le visiteur recoit toute l'activite des 15 dernieres minutes
    // d'un coup en arrivant sur le dashboard).
    if (lastSeenId < 0) {
      lastSeenId = res.data.lastId || (events.length ? events[events.length - 1].id : 0)
      return
    }

    if (!events.length) return

    // Decale chaque toast de quelques secondes pour eviter le mur de toasts
    // si plusieurs bots ont parle dans le meme tick.
    const toShow = events.slice(0, MAX_TOASTS_PER_TICK)
    toShow.forEach((ev, i) => {
      const t = setTimeout(() => {
        stepTimers.delete(t)
        const { title, body } = buildToast(ev)
        fireNotif(title, body)
      }, i * 4_500)
      stepTimers.add(t)
    })
    lastSeenId = events[events.length - 1].id
  }

  function scheduleNext(): void {
    outerTimer = setTimeout(() => {
      pollOnce().finally(() => {
        if (appStore.currentUser?.demo) scheduleNext()
        else outerTimer = null
      })
    }, POLL_INTERVAL_MS)
  }

  function start(): void {
    if (outerTimer) return
    outerTimer = setTimeout(() => {
      pollOnce().finally(() => {
        if (appStore.currentUser?.demo) scheduleNext()
        else outerTimer = null
      })
    }, FIRST_POLL_DELAY_MS)
  }

  function stop(): void {
    if (outerTimer) { clearTimeout(outerTimer); outerTimer = null }
    for (const t of stepTimers) clearTimeout(t)
    stepTimers.clear()
    lastSeenId = -1
  }

  watch(
    () => appStore.currentUser?.demo === true,
    (isDemo) => { if (isDemo) start(); else stop() },
    { immediate: true },
  )

  onUnmounted(stop)
}
