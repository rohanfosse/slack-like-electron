<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Zap, ArrowRight, Radio } from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const liveStore = useLiveStore()
const appStore = useAppStore()

const hasLive = computed(() => !!liveStore.currentSession && liveStore.currentSession.status === 'active')

onMounted(() => {
  if (liveStore.currentSession) return
  const pid = appStore.activePromoId
  if (pid) liveStore.fetchActiveForPromo(pid)
})
</script>

<template>
  <!-- Session active : CTA rouge -->
  <div
    v-if="hasLive"
    class="wlv wlv--active"
    role="button"
    tabindex="0"
    aria-label="Rejoindre la session Live en cours"
    @click="router.push('/live')"
    @keydown.enter="router.push('/live')"
    @keydown.space.prevent="router.push('/live')"
  >
    <Zap :size="16" class="wlv-icon" />
    <span class="wlv-dot" />
    <span class="wlv-text">Live en cours : <strong>{{ liveStore.currentSession?.title }}</strong></span>
    <button class="wlv-btn wlv-btn--active">Rejoindre <ArrowRight :size="12" /></button>
  </div>

  <!-- Pas de session : etat compact avec bouton -->
  <div
    v-else
    class="wlv wlv--idle"
    role="button"
    tabindex="0"
    aria-label="Rejoindre une session Live"
    @click="router.push('/live')"
    @keydown.enter="router.push('/live')"
    @keydown.space.prevent="router.push('/live')"
  >
    <Radio :size="14" class="wlv-icon--idle" />
    <span class="wlv-text--idle">Pas de session Live en cours</span>
    <button class="wlv-btn wlv-btn--idle">Rejoindre <ArrowRight :size="11" /></button>
  </div>
</template>

<style scoped>
.wlv {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out);
  height: 100%;
}
.wlv:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Active session */
.wlv--active {
  background: rgba(var(--color-danger-rgb), .08);
  border: 1px solid rgba(var(--color-danger-rgb), .25);
}
.wlv--active:hover { background: rgba(var(--color-danger-rgb), .12); }
.wlv-icon { color: var(--color-danger); }
.wlv-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  animation: wlv-pulse 1.5s ease-in-out infinite;
}
@keyframes wlv-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: .4; }
}
.wlv-text {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.wlv-btn--active {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  font-weight: 700;
  padding: 5px var(--space-md);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-danger);
  color: #fff;
  cursor: pointer;
  font-family: var(--font);
}

/* Idle */
.wlv--idle {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
}
.wlv--idle:hover { background: var(--bg-hover); border-color: var(--accent); }
.wlv-icon--idle {
  color: var(--text-muted);
  opacity: .5;
  flex-shrink: 0;
}
.wlv-text--idle {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.wlv-btn--idle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 4px var(--space-sm);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font);
  transition: background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out);
  white-space: nowrap;
}
.wlv-btn--idle:hover {
  background: rgba(var(--accent-rgb), .06);
  border-color: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .wlv-dot { animation: none; }
}
</style>
