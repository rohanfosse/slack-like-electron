/**
 * useDemoNotifications - notifications adossees a l'activite reelle des bots
 *
 * V4 : filtre cote client aux events qui concernent reellement le visiteur
 * (DMs entrants + @mentions). Avant on crachait une notif pour chaque
 * message canal, ce qui etait du bruit (cf. retour utilisateur "trop de
 * notifs pour des trucs qui ne me concernent pas").
 *
 * V3 : on remplace le catalogue de scenarios scriptes par un poll de
 * `/api/demo/notifications/feed?since=<lastId>`. L'endpoint renvoie les
 * messages reellement inseres en DB par le worker `demoBots.js` depuis
 * le dernier tick. Resultat : le visiteur voit des notifs qui correspondent
 * a ce qui se passe vraiment dans les canaux (s'il ouvre le canal cite
 * apres une notif "Sara a poste...", il trouve effectivement le message).
 *
 * Le payload emis est rich (kind / author / channelId / channelName /
 * preview / initials) — consomme par DemoNotificationStack.vue qui rend
 * une carte avec avatar, badge type, boutons "Voir / Ignorer".
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

interface RichNotifPayload {
  kind:        'dm' | 'mention' | 'channel'
  author:      string
  initials:    string | null
  channelId:   number | null
  channelName: string | null
  preview:     string
}

const FIRST_POLL_DELAY_MS = 18_000   // 18s : laisser le visiteur scanner le dashboard
const POLL_INTERVAL_MS    = 30_000   // 30s : aligne sur le tick bots (assez vif)
const MAX_TOASTS_PER_TICK = 2        // ne jamais en cracher plus de 2 d'un coup (filtre relevance)

function classifyEvent(ev: FeedEvent): 'dm' | 'mention' | 'channel' {
  if (ev.isDm) return 'dm'
  if (ev.isMention) return 'mention'
  return 'channel'
}

function buildPayload(ev: FeedEvent): RichNotifPayload {
  return {
    kind:        classifyEvent(ev),
    author:      ev.author,
    initials:    ev.initials,
    channelId:   ev.channelId,
    channelName: ev.channelName,
    preview:     ev.preview,
  }
}

export function useDemoNotifications(): void {
  const appStore = useAppStore()
  let outerTimer: ReturnType<typeof setTimeout> | null = null
  let stepTimers: Set<ReturnType<typeof setTimeout>> = new Set()
  // -1 = inconnu, 0 = "tout neuf depuis maintenant" (premier poll initialise)
  let lastSeenId = -1

  function fireRichNotif(payload: RichNotifPayload): void {
    if (!appStore.currentUser?.demo) return
    try {
      window.dispatchEvent(new CustomEvent('cursus:demo-notification', { detail: payload }))
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

    const allEvents = (res.data.events || []) as FeedEvent[]

    // 1er poll : on prend juste le lastId comme baseline, pas de toasts
    // (sinon le visiteur recoit toute l'activite des 15 dernieres minutes
    // d'un coup en arrivant sur le dashboard).
    if (lastSeenId < 0) {
      lastSeenId = res.data.lastId || (allEvents.length ? allEvents[allEvents.length - 1].id : 0)
      return
    }

    if (!allEvents.length) return
    // Avancer toujours le curseur sur le dernier id vu, meme si on filtre :
    // sinon les events filtres reviennent indefiniment au prochain poll.
    lastSeenId = allEvents[allEvents.length - 1].id

    // Filtre relevance : on ne notifie que pour les DMs et les mentions.
    // Les messages canaux ordinaires sont laisses au feed du chat — pas
    // de toast (sinon spam ininteressant pour l'etudiant). Cote prof,
    // meme regle : on s'attache aux interactions directes.
    const relevant = allEvents.filter(ev => ev.isDm || ev.isMention)
    if (!relevant.length) return

    // Decale chaque notif de quelques secondes pour eviter le mur de toasts
    // si plusieurs bots ont parle dans le meme tick.
    const toShow = relevant.slice(0, MAX_TOASTS_PER_TICK)
    toShow.forEach((ev, i) => {
      const t = setTimeout(() => {
        stepTimers.delete(t)
        fireRichNotif(buildPayload(ev))
      }, i * 4_500)
      stepTimers.add(t)
    })
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
