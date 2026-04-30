<template>
  <Teleport to="body">
    <div class="demo-notif-stack" aria-live="polite">
      <TransitionGroup name="demo-notif">
        <article
          v-for="n in visible"
          :key="n.id"
          class="demo-notif"
          :class="{
            'demo-notif--mention': n.kind === 'mention',
            'demo-notif--dm':      n.kind === 'dm',
            'demo-notif--paused':  hovered === n.id,
          }"
          @mouseenter="hovered = n.id"
          @mouseleave="hovered = null"
        >
          <header class="demo-notif-head">
            <span
              class="demo-notif-avatar"
              :style="{ background: avatarColor(n.author) }"
              aria-hidden="true"
            >{{ n.initials || initialsOf(n.author) }}</span>
            <div class="demo-notif-meta">
              <span class="demo-notif-author">{{ n.author }}</span>
              <span class="demo-notif-origin">
                <svg v-if="n.kind === 'dm'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <svg v-else-if="n.kind === 'mention'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
                <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
                <template v-if="n.kind === 'dm'">Message direct</template>
                <template v-else-if="n.kind === 'mention'">Mention dans <b>#{{ n.channelName }}</b></template>
                <template v-else>#{{ n.channelName }}</template>
              </span>
            </div>
            <button
              type="button"
              class="demo-notif-close"
              aria-label="Fermer la notification"
              @click="dismiss(n.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </header>

          <p class="demo-notif-body">{{ n.preview }}</p>

          <footer class="demo-notif-actions">
            <button
              type="button"
              class="demo-notif-btn demo-notif-btn--primary"
              @click="openAndDismiss(n)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              Voir le message
            </button>
            <button
              type="button"
              class="demo-notif-btn demo-notif-btn--ghost"
              @click="dismiss(n.id)"
            >Ignorer</button>
          </footer>

          <span
            class="demo-notif-progress"
            :style="{ animationDuration: AUTO_DISMISS_MS + 'ms', animationPlayState: hovered === n.id ? 'paused' : 'running' }"
            aria-hidden="true"
          ></span>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * DemoNotificationStack - notifications riches en mode demo.
 *
 * Ecoute l'evenement `cursus:demo-notification` (envoye par useDemoNotifications)
 * et affiche une pile (max 3 visibles) de cards avec auto-dismiss 8s, pause
 * au hover, action "Voir le message" qui ouvre le canal/DM concerne.
 *
 * Design : carte arrondie 340px, avatar colore avec initiales, badge type
 * (DM / mention / canal), preview du message, 2 boutons.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter }    from 'vue-router'
import { useAppStore }  from '@/stores/app'

interface Notif {
  id: number
  kind: 'dm' | 'mention' | 'channel'
  author: string
  initials: string | null
  channelId: number | null
  channelName: string | null
  preview: string
}

const MAX_VISIBLE     = 3
const AUTO_DISMISS_MS = 8_000

const queue   = ref<Notif[]>([])
const hovered = ref<number | null>(null)
const router    = useRouter()
const appStore  = useAppStore()
const visible   = computed(() => queue.value.slice(0, MAX_VISIBLE))

const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>()

function scheduleDismiss(id: number): void {
  const existing = dismissTimers.get(id)
  if (existing) clearTimeout(existing)
  dismissTimers.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
}

function dismiss(id: number): void {
  const t = dismissTimers.get(id)
  if (t) { clearTimeout(t); dismissTimers.delete(id) }
  queue.value = queue.value.filter(n => n.id !== id)
}

function initialsOf(name: string): string {
  return name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase()
}

const AVATAR_PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6', '#EF4444', '#0EA5E9']
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

async function openAndDismiss(n: Notif): Promise<void> {
  dismiss(n.id)
  // Naviguer vers la vue messages d'abord
  if (router.currentRoute.value.path !== '/messages') {
    try { await router.push('/messages') } catch { /* ignore */ }
  }
  if (n.channelId && n.kind !== 'dm') {
    try {
      appStore.openChannel(n.channelId, appStore.activePromoId ?? 0, n.channelName || '', 'chat')
    } catch { /* ignore */ }
  } else if (n.kind === 'dm') {
    // En demo, le bot est un student du seed -> on essaie d'ouvrir le DM
    // par le name (best-effort : on n'a pas l'id ici, l'app store ouvrira
    // la liste DMs si le visiteur clique). Pour l'instant on se contente
    // d'aller sur Messages.
  }
}

function onNotifEvent(ev: Event): void {
  const detail = (ev as CustomEvent).detail as Partial<Notif> | undefined
  if (!detail || !detail.author) return
  const id = Date.now() + Math.floor(Math.random() * 1000)
  const notif: Notif = {
    id,
    kind:        detail.kind        ?? 'channel',
    author:      detail.author      ?? '',
    initials:    detail.initials    ?? null,
    channelId:   detail.channelId   ?? null,
    channelName: detail.channelName ?? null,
    preview:     detail.preview     ?? '',
  }
  queue.value = [notif, ...queue.value].slice(0, 8)
  scheduleDismiss(id)
}

onMounted(() => {
  window.addEventListener('cursus:demo-notification', onNotifEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('cursus:demo-notification', onNotifEvent as EventListener)
  for (const t of dismissTimers.values()) clearTimeout(t)
  dismissTimers.clear()
})
</script>

<style scoped>
.demo-notif-stack {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  width: 360px;
  max-width: calc(100vw - 32px);
}

.demo-notif {
  position: relative;
  background: var(--bg-2, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 14px;
  padding: 14px 14px 12px;
  box-shadow: 0 16px 40px -16px rgba(15, 23, 42, .25), 0 4px 12px -4px rgba(15, 23, 42, .12);
  pointer-events: auto;
  overflow: hidden;
  transition: transform .2s, box-shadow .2s;
}
.demo-notif:hover {
  transform: translateX(-3px);
  box-shadow: 0 22px 50px -16px rgba(15, 23, 42, .3), 0 6px 16px -4px rgba(15, 23, 42, .16);
}

.demo-notif--mention { border-left: 3px solid #F59E0B; }
.demo-notif--dm      { border-left: 3px solid #6366F1; }
.demo-notif--channel { border-left: 3px solid #94A3B8; }

.demo-notif-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.demo-notif-avatar {
  flex-shrink: 0;
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  letter-spacing: .02em;
}

.demo-notif-meta {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.demo-notif-author {
  font-size: 14px;
  font-weight: 700;
  color: var(--text, #0F172A);
  letter-spacing: -.2px;
  line-height: 1.2;
}

.demo-notif-origin {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-2, #64748B);
  font-weight: 500;
  line-height: 1.3;
}
.demo-notif-origin b {
  font-weight: 600;
  color: var(--text, #0F172A);
}
.demo-notif--mention .demo-notif-origin svg { color: #F59E0B; }
.demo-notif--dm      .demo-notif-origin svg { color: #6366F1; }

.demo-notif-close {
  flex-shrink: 0;
  width: 26px; height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--text-3, #94A3B8);
  cursor: pointer;
  transition: background .15s, color .15s;
}
.demo-notif-close:hover {
  background: var(--bg-glass, rgba(0,0,0,0.05));
  color: var(--text, #0F172A);
}

.demo-notif-body {
  font-size: 13.5px;
  color: var(--text-2, #475569);
  line-height: 1.45;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.demo-notif-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.demo-notif-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 11px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background .15s, color .15s, transform .15s;
  font-family: inherit;
}
.demo-notif-btn:active { transform: translateY(1px); }

.demo-notif-btn--primary {
  background: var(--primary, #6366F1);
  color: #fff;
}
.demo-notif-btn--primary:hover { background: var(--primary-2, #4F46E5); }

.demo-notif-btn--ghost {
  background: transparent;
  color: var(--text-2, #64748B);
}
.demo-notif-btn--ghost:hover {
  background: var(--bg-glass, rgba(0,0,0,0.04));
  color: var(--text, #0F172A);
}

.demo-notif-progress {
  position: absolute;
  bottom: 0; left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, var(--primary, #6366F1), transparent);
  transform-origin: left;
  animation: demo-notif-shrink linear forwards;
}
.demo-notif--mention .demo-notif-progress { background: linear-gradient(90deg, #F59E0B, transparent); }
.demo-notif--dm      .demo-notif-progress { background: linear-gradient(90deg, #6366F1, transparent); }

@keyframes demo-notif-shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* Transitions Vue ──────────────────────────────────────────────────── */
.demo-notif-enter-active, .demo-notif-leave-active {
  transition: opacity .25s, transform .25s;
}
.demo-notif-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.96);
}
.demo-notif-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
.demo-notif-leave-active {
  position: absolute;
  width: calc(100% - 0px);
}

@media (max-width: 520px) {
  .demo-notif-stack {
    top: 64px;
    right: 12px;
    left: 12px;
    width: auto;
    max-width: none;
  }
}
</style>
