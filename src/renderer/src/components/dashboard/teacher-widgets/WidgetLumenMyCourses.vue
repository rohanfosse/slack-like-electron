<script setup lang="ts">
/**
 * WidgetLumenMyCourses.vue — Liste des repos de cours de la promo pour le prof.
 * Metric principale : nombre de chapitres par repo + etat du manifest.
 */
import { computed, onMounted } from 'vue'
import { FolderGit2, ChevronRight, AlertTriangle } from 'lucide-vue-next'
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

const topRepos = computed(() => {
  return [...lumenStore.repos]
    .sort((a, b) => (b.manifest?.chapters.length ?? 0) - (a.manifest?.chapters.length ?? 0))
    .slice(0, 4)
})

function openLumen() {
  router.push('/lumen')
}
</script>

<template>
  <div class="wlmc-card">
    <header class="wlmc-head">
      <div class="wlmc-title">
        <FolderGit2 :size="14" />
        <span>Mes cours Lumen</span>
      </div>
      <button type="button" class="wlmc-more" @click="openLumen">
        Ouvrir <ChevronRight :size="12" />
      </button>
    </header>

    <div v-if="topRepos.length === 0" class="wlmc-empty">
      Aucun repo synchronise. Configure une organisation GitHub pour commencer.
    </div>
    <ul v-else class="wlmc-list">
      <li v-for="repo in topRepos" :key="repo.id">
        <button type="button" class="wlmc-item" @click="openLumen">
          <span class="wlmc-item-title">{{ repo.manifest?.project ?? repo.fullName }}</span>
          <span class="wlmc-item-meta">
            <AlertTriangle v-if="repo.manifestError" :size="11" class="wlmc-warn" />
            <span v-if="repo.manifest">{{ repo.manifest.chapters.length }} chapitres</span>
            <span v-else class="wlmc-warn-text">manifest invalide</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wlmc-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wlmc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wlmc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wlmc-more {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
}
.wlmc-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 12px 0;
  text-align: center;
  line-height: 1.5;
}
.wlmc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wlmc-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 7px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--t-fast) ease;
}
.wlmc-item:hover { background: var(--bg-hover); border-color: var(--accent); }
.wlmc-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wlmc-item-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-muted);
}
.wlmc-warn { color: var(--warning, #d98a00); }
.wlmc-warn-text { color: var(--warning, #d98a00); }
</style>
