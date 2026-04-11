<script setup lang="ts">
/**
 * WidgetLumenCourses.vue — Liste les cours (repos) disponibles pour l'etudiant.
 * Affiche les 3 repos les plus recemment synchronises avec lien vers /lumen.
 */
import { computed, onMounted } from 'vue'
import { BookOpen, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const lumenStore = useLumenStore()
const appStore = useAppStore()

onMounted(async () => {
  const pid = appStore.activePromoId
  if (pid) await lumenStore.fetchReposForPromo(pid)
})

const recentRepos = computed(() => {
  return [...lumenStore.repos]
    .filter((r) => r.manifest != null)
    .sort((a, b) => {
      const aT = a.lastSyncedAt ?? ''
      const bT = b.lastSyncedAt ?? ''
      return bT.localeCompare(aT)
    })
    .slice(0, 3)
})

function openLumen() {
  router.push('/lumen')
}
</script>

<template>
  <div class="wlc-card">
    <header class="wlc-head">
      <div class="wlc-title">
        <BookOpen :size="14" />
        <span>Cours Lumen</span>
      </div>
      <button type="button" class="wlc-more" @click="openLumen">
        Ouvrir <ChevronRight :size="12" />
      </button>
    </header>

    <div v-if="recentRepos.length === 0" class="wlc-empty">
      Aucun cours disponible.
    </div>
    <ul v-else class="wlc-list">
      <li v-for="repo in recentRepos" :key="repo.id">
        <button type="button" class="wlc-item" @click="openLumen">
          <span class="wlc-item-title">{{ repo.manifest?.project ?? repo.fullName }}</span>
          <span class="wlc-item-meta">
            {{ repo.manifest?.chapters?.length ?? 0 }} chapitres
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wlc-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wlc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wlc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wlc-more {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
}
.wlc-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 12px 0;
  text-align: center;
}
.wlc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wlc-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--t-fast) ease;
}
.wlc-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
}
.wlc-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wlc-item-meta {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
