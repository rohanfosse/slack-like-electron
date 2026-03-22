<!-- QcmResults.vue - Barres horizontales animées pour les résultats QCM -->
<script setup lang="ts">
  import { computed } from 'vue'
  import type { LiveResults } from '@/types'

  const props = defineProps<{ results: LiveResults }>()

  const COLORS = ['#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']

  const maxCount = computed(() =>
    Math.max(1, ...props.results.data.map(d => d.count)),
  )
</script>

<template>
  <div class="qcm-results">
    <div class="qcm-total">{{ results.totalResponses }} réponse{{ results.totalResponses > 1 ? 's' : '' }}</div>
    <div v-for="(row, i) in results.data" :key="row.option ?? i" class="qcm-row">
      <div class="qcm-label">{{ row.option ?? `Option ${(row.index ?? i) + 1}` }}</div>
      <div class="qcm-bar-track">
        <div
          class="qcm-bar-fill"
          :style="{ width: `${(row.count / maxCount) * 100}%`, background: COLORS[i % COLORS.length] }"
        />
      </div>
      <div class="qcm-count">{{ row.count }}</div>
      <div v-if="row.percent != null" class="qcm-pct">{{ Math.round(row.percent) }}%</div>
    </div>
  </div>
</template>

<style scoped>
.qcm-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.qcm-total {
  font-size: 15px;
  color: var(--text-muted, #888);
  font-weight: 600;
  text-align: center;
}
.qcm-row {
  display: grid;
  grid-template-columns: 180px 1fr 50px 50px;
  align-items: center;
  gap: 12px;
}
.qcm-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qcm-bar-track {
  height: 36px;
  background: var(--bg-hover);
  border-radius: 8px;
  overflow: hidden;
}
.qcm-bar-fill {
  height: 100%;
  border-radius: 8px;
  transition: width .6s cubic-bezier(.34,1.56,.64,1);
  min-width: 4px;
}
.qcm-count {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary, #fff);
  text-align: center;
}
.qcm-pct {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted, #888);
  text-align: center;
}
</style>
