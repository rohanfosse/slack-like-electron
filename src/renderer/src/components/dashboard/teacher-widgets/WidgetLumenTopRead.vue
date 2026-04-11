<script setup lang="ts">
/**
 * WidgetLumenTopRead.vue — Top 5 chapitres les plus lus dans la promo.
 * Resout le titre humain via le manifest du repo charge dans le store.
 */
import { ref, onMounted, computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'

interface CountRow { repo_id: number; path: string; readers: number }

const appStore = useAppStore()
const lumenStore = useLumenStore()
const counts = ref<CountRow[]>([])

onMounted(async () => {
  const pid = appStore.activePromoId
  if (!pid) return
  await lumenStore.fetchReposForPromo(pid)
  const resp = await window.api.getLumenReadCountsForPromo(pid) as { ok: boolean; data?: { counts: CountRow[] } }
  if (resp.ok && resp.data) counts.value = resp.data.counts
})

const top = computed(() => {
  return [...counts.value]
    .sort((a, b) => b.readers - a.readers)
    .slice(0, 5)
    .map((c) => {
      const repo = lumenStore.repos.find((r) => r.id === c.repo_id)
      const chapter = repo?.manifest?.chapters.find((ch) => ch.path === c.path)
      return {
        ...c,
        title: chapter?.title ?? c.path,
        repoName: repo?.manifest?.project ?? repo?.fullName ?? '',
      }
    })
})

const maxReaders = computed(() => top.value[0]?.readers ?? 1)
</script>

<template>
  <div class="wltr-card">
    <header class="wltr-head">
      <TrendingUp :size="14" />
      <span>Top chapitres lus</span>
    </header>

    <div v-if="top.length === 0" class="wltr-empty">
      Aucune lecture enregistree.
    </div>
    <ul v-else class="wltr-list">
      <li v-for="(item, i) in top" :key="`${item.repo_id}::${item.path}`">
        <div class="wltr-item">
          <span class="wltr-rank">{{ i + 1 }}</span>
          <div class="wltr-item-body">
            <span class="wltr-item-title">{{ item.title }}</span>
            <span class="wltr-item-repo">{{ item.repoName }}</span>
            <div class="wltr-bar-wrap">
              <div class="wltr-bar" :style="{ width: `${(item.readers / maxReaders) * 100}%` }" />
            </div>
          </div>
          <span class="wltr-readers">{{ item.readers }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wltr-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wltr-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wltr-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
}
.wltr-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wltr-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wltr-rank {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  width: 14px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.wltr-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.wltr-item-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wltr-item-repo {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wltr-bar-wrap {
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
  height: 4px;
  margin-top: 3px;
}
.wltr-bar {
  background: var(--accent);
  height: 100%;
  transition: width 400ms ease-out;
}
.wltr-readers {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 20px;
  text-align: right;
}
</style>
