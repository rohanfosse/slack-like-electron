/**
 * MobileNav - barre de navigation fixe en bas pour les écrans < 768px.
 * Reprend les mêmes destinations que NavRail en format horizontal.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, MessageSquare, BookOpen, FileText, Radio } from 'lucide-vue-next'
import { useAppStore }    from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import { useLiveStore }   from '@/stores/live'
import { useModules }     from '@/composables/useModules'

const appStore     = useAppStore()
const travauxStore = useTravauxStore()
const liveStore    = useLiveStore()
const { isEnabled } = useModules()
const router       = useRouter()
const route        = useRoute()

const pendingCount = computed(() => travauxStore.urgentPendingCount)
const showLive     = computed(() =>
  isEnabled('live') && !appStore.isStaff && liveStore.currentSession && liveStore.currentSession.status !== 'ended',
)
</script>

<template>
  <nav class="mobile-nav" aria-label="Navigation mobile">
    <button
      class="mobile-nav-btn"
      :class="{ active: route.name === 'dashboard' }"
      @click="router.push('/dashboard')"
    >
      <LayoutDashboard :size="20" />
      <span>Accueil</span>
    </button>

    <button
      class="mobile-nav-btn"
      :class="{ active: route.name === 'messages' }"
      @click="router.push('/messages')"
    >
      <MessageSquare :size="20" />
      <span>Messages</span>
    </button>

    <button
      class="mobile-nav-btn"
      :class="{ active: route.name === 'devoirs' }"
      @click="router.push('/devoirs')"
    >
      <BookOpen :size="20" />
      <span>Devoirs</span>
      <span v-if="appStore.isStudent && pendingCount > 0" class="mobile-nav-badge">
        {{ pendingCount > 9 ? '9+' : pendingCount }}
      </span>
    </button>

    <button
      class="mobile-nav-btn"
      :class="{ active: route.name === 'documents' }"
      @click="router.push('/documents')"
    >
      <FileText :size="20" />
      <span>Docs</span>
    </button>

    <button
      v-if="showLive"
      class="mobile-nav-btn"
      :class="{ active: route.name === 'live' }"
      @click="router.push('/live')"
    >
      <Radio :size="20" />
      <span>Quiz</span>
      <span class="mobile-nav-live-dot" />
    </button>
  </nav>
</template>

<style scoped>
/* Visible uniquement en mobile */
.mobile-nav {
  display: none;
}

@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--bg-rail);
    border-top: 1px solid var(--border);
    z-index: var(--z-sidebar);
    align-items: center;
    justify-content: space-around;
    padding: 0 4px;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}

.mobile-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  position: relative;
  transition: color var(--t-fast), background var(--t-fast);
  min-width: 0;
}

.mobile-nav-btn.active {
  color: var(--accent);
}

.mobile-nav-btn.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: var(--accent);
  border-radius: 0 0 3px 3px;
}

.mobile-nav-btn:active {
  background: var(--bg-hover);
}

.mobile-nav-badge {
  position: absolute;
  top: 2px;
  right: 6px;
  background: var(--color-danger);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 1.2;
}

.mobile-nav-live-dot {
  position: absolute;
  top: 4px;
  right: 10px;
  width: 7px;
  height: 7px;
  background: #e74c3c;
  border-radius: 50%;
  animation: live-pulse 1.5s infinite;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
