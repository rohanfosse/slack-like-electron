/**
 * WidgetProgress.vue - Anneau de progression global.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'

const props = defineProps<{
  submitted: number
  total: number
  graded: number
}>()

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const pct = computed(() => (props.total > 0 ? Math.round((props.submitted / props.total) * 100) : 0))
const gradedPct = computed(() => (props.total > 0 ? Math.round((props.graded / props.total) * 100) : 0))

const submittedOffset = computed(() => CIRCUMFERENCE - (CIRCUMFERENCE * pct.value) / 100)
const gradedOffset = computed(() => CIRCUMFERENCE - (CIRCUMFERENCE * gradedPct.value) / 100)

const remaining = computed(() => Math.max(0, props.total - props.submitted))
</script>

<template>
  <div class="dashboard-card sa-card sa-progress" :aria-label="`Progression : ${pct}% soumis, ${gradedPct}% notes`">
    <div class="sa-card-header">
      <TrendingUp :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Progression</span>
    </div>
    <div class="sa-progress-body">
      <div class="sa-progress-ring">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <!-- Background circle -->
          <circle
            cx="44" cy="44" :r="RADIUS"
            fill="none" stroke="var(--border-color, #e0e0e0)" stroke-width="7"
          />
          <!-- Submitted arc -->
          <circle
            cx="44" cy="44" :r="RADIUS"
            fill="none" stroke="var(--accent)" stroke-width="7"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="submittedOffset"
            transform="rotate(-90 44 44)"
            class="sa-ring-arc"
          />
          <!-- Graded arc (overlaid, shorter) -->
          <circle
            cx="44" cy="44" :r="RADIUS"
            fill="none" stroke="var(--color-success, #27ae60)" stroke-width="7"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="gradedOffset"
            transform="rotate(-90 44 44)"
            class="sa-ring-arc"
          />
        </svg>
        <span class="sa-progress-pct sa-mono">{{ pct }}%</span>
      </div>
      <span class="sa-progress-detail">
        {{ submitted }} soumis · {{ graded }} notés · {{ remaining }} restants
      </span>
    </div>
  </div>
</template>

<style scoped>
.sa-mono { font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace; }

.sa-progress-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 0 2px;
}

.sa-progress-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sa-ring-arc {
  transition: stroke-dashoffset .6s cubic-bezier(0.4, 0, 0.2, 1);
}

.sa-progress-pct {
  position: absolute;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.sa-progress-detail {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}
</style>
