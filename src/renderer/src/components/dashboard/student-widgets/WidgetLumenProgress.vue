<script setup lang="ts">
/**
 * WidgetLumenProgress.vue — Progression de lecture des chapitres Lumen.
 * Affiche un ring gauge avec le % lu et un compteur X/Y sur l'ensemble
 * des chapitres des repos de la promo.
 */
import { computed, onMounted } from 'vue'
import { Target, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const lumenStore = useLumenStore()
const appStore = useAppStore()

onMounted(async () => {
  const pid = appStore.activePromoId
  if (pid) {
    await Promise.all([
      lumenStore.fetchReposForPromo(pid),
      lumenStore.fetchMyReads(),
    ])
  }
})

const totals = computed(() => {
  let total = 0
  let read  = 0
  for (const r of lumenStore.repos) {
    const chapters = r.manifest?.chapters ?? []
    total += chapters.length
    for (const c of chapters) {
      if (lumenStore.readChapters.has(`${r.id}::${c.path}`)) read += 1
    }
  }
  return { total, read }
})

const percent = computed(() => {
  if (totals.value.total === 0) return 0
  return Math.round((totals.value.read / totals.value.total) * 100)
})

// Ring gauge SVG : circonference = 2*PI*r ≈ 151 pour r=24
const RADIUS = 24
const CIRC = 2 * Math.PI * RADIUS
const dashOffset = computed(() => CIRC - (percent.value / 100) * CIRC)

function openLumen() {
  router.push('/lumen')
}
</script>

<template>
  <div class="wlp-card">
    <header class="wlp-head">
      <div class="wlp-title">
        <Target :size="14" />
        <span>Ma progression</span>
      </div>
      <button type="button" class="wlp-more" @click="openLumen">
        <ChevronRight :size="12" />
      </button>
    </header>

    <div class="wlp-body">
      <svg class="wlp-ring" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" :r="RADIUS" class="wlp-ring-bg" />
        <circle
          cx="32" cy="32" :r="RADIUS"
          class="wlp-ring-fg"
          :stroke-dasharray="CIRC"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div class="wlp-stats">
        <span class="wlp-percent">{{ percent }}%</span>
        <span class="wlp-count">{{ totals.read }} / {{ totals.total }} chapitres</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wlp-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wlp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wlp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wlp-more {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px;
}

.wlp-body {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  padding: 8px 0;
}
.wlp-ring {
  flex-shrink: 0;
}
.wlp-ring-bg {
  fill: none;
  stroke: var(--border);
  stroke-width: 5;
}
.wlp-ring-fg {
  fill: none;
  stroke: var(--accent);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 400ms ease-out;
}
.wlp-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wlp-percent {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.wlp-count {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
