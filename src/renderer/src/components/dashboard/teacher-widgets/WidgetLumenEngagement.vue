<script setup lang="ts">
/**
 * WidgetLumenEngagement.vue — Stats d'engagement teacher pour la promo.
 * Affiche : nombre de repos, total lectures, moyenne par chapitre.
 */
import { ref, onMounted } from 'vue'
import { Activity } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const stats = ref<{ repos: number; reads: number } | null>(null)

onMounted(async () => {
  const pid = appStore.activePromoId
  if (!pid) return
  const resp = await window.api.getLumenStatsForPromo(pid) as { ok: boolean; data?: { repos: number; reads: number } }
  if (resp.ok && resp.data) stats.value = resp.data
})
</script>

<template>
  <div class="wle-card">
    <header class="wle-head">
      <Activity :size="14" />
      <span>Engagement Lumen</span>
    </header>

    <div v-if="!stats" class="wle-empty">Aucune donnee.</div>
    <div v-else class="wle-metrics">
      <div class="wle-metric">
        <span class="wle-value">{{ stats.repos }}</span>
        <span class="wle-label">Repos</span>
      </div>
      <div class="wle-metric">
        <span class="wle-value">{{ stats.reads }}</span>
        <span class="wle-label">Lectures</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wle-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wle-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wle-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
}
.wle-metrics {
  display: flex;
  gap: 16px;
  justify-content: space-around;
  align-items: center;
  flex: 1;
}
.wle-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.wle-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.wle-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
