/**
 * SidebarLive — panneau sidebar pour la section Live.
 * Affiche les brouillons, sessions actives et acces rapide historique/stats.
 */
<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Copy, Trash2, History, BarChart3, Radio } from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live'
import { useAppStore } from '@/stores/app'
import type { LiveSession } from '@/types'

const liveStore = useLiveStore()
const appStore = useAppStore()
const router = useRouter()

const emit = defineEmits<{
  selectSession: [session: LiveSession]
  newSession: []
  tab: [tab: 'history' | 'stats']
}>()

const promoId = computed(() => appStore.activePromoId ?? appStore.currentUser?.promo_id ?? 0)

const activeSessions = computed(() =>
  liveStore.draftSessions.filter(s => s.status === 'active'),
)
const draftSessions = computed(() =>
  liveStore.draftSessions.filter(s => s.status !== 'active'),
)

onMounted(async () => {
  if (promoId.value) await liveStore.fetchDraftSessions(promoId.value)
})

async function onClone(session: LiveSession) {
  if (!promoId.value) return
  await liveStore.cloneSession(session.id, promoId.value)
}

async function onDelete(session: LiveSession) {
  if (!confirm('Supprimer ce brouillon ?')) return
  await liveStore.deleteSession(session.id)
}
</script>

<template>
  <!-- Sessions actives -->
  <div v-if="activeSessions.length" class="sb-live-section">
    <div class="sb-live-section-head">
      <Radio :size="11" class="sb-live-active-dot" />
      <span class="sb-live-section-title">En cours</span>
    </div>
    <div class="sb-live-list">
      <button
        v-for="s in activeSessions"
        :key="s.id"
        type="button"
        class="sb-live-item sb-live-item--active"
        @click="emit('selectSession', s)"
      >
        <span class="sb-live-item-title">{{ s.title }}</span>
        <span class="sb-live-item-meta">{{ s.activities?.length ?? 0 }} activite(s)</span>
      </button>
    </div>
  </div>

  <!-- Brouillons -->
  <div class="sb-live-section">
    <div class="sb-live-section-head">
      <span class="sb-live-section-title">Brouillons</span>
      <span v-if="draftSessions.length" class="sb-live-section-count">{{ draftSessions.length }}</span>
    </div>
    <div v-if="draftSessions.length" class="sb-live-list">
      <div
        v-for="s in draftSessions"
        :key="s.id"
        class="sb-live-item"
      >
        <button type="button" class="sb-live-item-body" @click="emit('selectSession', s)">
          <span class="sb-live-item-title">{{ s.title }}</span>
          <span class="sb-live-item-meta">{{ s.activities?.length ?? 0 }} activite(s)</span>
        </button>
        <div class="sb-live-item-actions">
          <button type="button" class="sb-live-action" title="Dupliquer" aria-label="Dupliquer la session" @click.stop="onClone(s)">
            <Copy :size="11" />
          </button>
          <button type="button" class="sb-live-action sb-live-action--danger" title="Supprimer" aria-label="Supprimer le brouillon" @click.stop="onDelete(s)">
            <Trash2 :size="11" />
          </button>
        </div>
      </div>
    </div>
    <div v-else class="sb-live-empty">Aucun brouillon</div>
  </div>

  <!-- Liens rapides -->
  <div class="sb-live-section">
    <div class="sb-live-section-head">
      <span class="sb-live-section-title">Navigation</span>
    </div>
    <div class="sb-live-links">
      <button type="button" class="sb-live-link" @click="emit('tab', 'history')">
        <History :size="12" /> Historique
      </button>
      <button type="button" class="sb-live-link" @click="emit('tab', 'stats')">
        <BarChart3 :size="12" /> Statistiques
      </button>
    </div>
  </div>
</template>

<style scoped>
.sb-live-section { padding: 4px 10px; }
.sb-live-section + .sb-live-section { margin-top: 4px; }
.sb-live-section-head {
  display: flex; align-items: center; gap: 4px; margin-bottom: 4px;
}
.sb-live-section-title { font-size: 11px; font-weight: 700; color: var(--text-muted); flex: 1; }
.sb-live-section-count {
  font-size: 9px; font-weight: 700; color: var(--accent);
  background: rgba(var(--accent-rgb), .14); padding: 1px 5px; border-radius: 8px;
}
.sb-live-active-dot { color: #ef4444; flex-shrink: 0; animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

.sb-live-list { display: flex; flex-direction: column; gap: 2px; }

.sb-live-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-radius: 6px; border: none;
  background: transparent; cursor: pointer; text-align: left;
  transition: all 0.1s;
}
.sb-live-item:hover { background: var(--bg-hover); }
.sb-live-item--active {
  border-left: 2px solid #ef4444; width: 100%;
}
.sb-live-item-body {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;
  background: none; border: none; cursor: pointer; text-align: left; padding: 0;
}
.sb-live-item-title {
  font-size: 12px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sb-live-item--active .sb-live-item-title { font-weight: 600; }
.sb-live-item-meta { font-size: 10px; color: var(--text-muted); }
.sb-live-item-actions { display: flex; gap: 2px; flex-shrink: 0; }
.sb-live-action {
  width: 22px; height: 22px; border-radius: 4px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.12s;
}
.sb-live-action:hover { background: var(--bg-hover); color: var(--accent); }
.sb-live-action--danger:hover { color: #f87171; }

.sb-live-empty { font-size: 11px; color: var(--text-muted); padding: 8px 4px; }

.sb-live-links { display: flex; flex-direction: column; gap: 1px; }
.sb-live-link {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-secondary); cursor: pointer;
  font-size: 12px; font-weight: 500; font-family: inherit; text-align: left;
  transition: all 0.1s;
}
.sb-live-link:hover { background: var(--bg-hover); color: var(--text-primary); }
</style>
