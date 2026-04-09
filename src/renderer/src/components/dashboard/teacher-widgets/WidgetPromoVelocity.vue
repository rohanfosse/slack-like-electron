/**
 * WidgetPromoVelocity.vue — Mini sparkline SVG du nombre de rendus
 * soumis sur les 7 derniers jours pour la promo active. Temperature
 * rapide de l'activite etudiante.
 */
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Activity, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useTravauxStore } from '@/stores/travaux'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const travauxStore = useTravauxStore()
const appStore = useAppStore()

onMounted(async () => {
  const promoId = appStore.activePromoId ?? appStore.currentUser?.promo_id
  if (!promoId) return
  if (travauxStore.allRendus.length === 0) {
    await travauxStore.fetchRendus(promoId)
  }
})

/**
 * Compte les rendus par jour sur les 7 derniers jours (incluant aujourd'hui).
 * Retourne un tableau de 7 nombres, du plus ancien au plus recent.
 */
const dailyCounts = computed<number[]>(() => {
  const counts = new Array(7).fill(0) as number[]
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (const d of travauxStore.allRendus) {
    if (!d.submitted_at) continue
    const date = new Date(d.submitted_at)
    const sameDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.floor((today.getTime() - sameDay.getTime()) / (86_400_000))
    if (diffDays >= 0 && diffDays < 7) {
      // Index 6 = aujourd'hui, 0 = il y a 6 jours
      counts[6 - diffDays]++
    }
  }
  return counts
})

const maxCount = computed(() => Math.max(1, ...dailyCounts.value))
const totalLast7d = computed(() => dailyCounts.value.reduce((acc, n) => acc + n, 0))

// Points SVG pour le polyline. Canvas 100x30, marge 2px.
const polylinePoints = computed(() => {
  const W = 100
  const H = 30
  const margin = 2
  const stepX = (W - margin * 2) / 6  // 7 points, 6 intervalles
  return dailyCounts.value
    .map((c, i) => {
      const x = margin + i * stepX
      const y = H - margin - (c / maxCount.value) * (H - margin * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

// Labels jours de la semaine (derniers 7 jours)
const dayLabels = computed<string[]>(() => {
  const labels: string[] = []
  const now = new Date()
  const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    labels.push(weekdays[d.getDay()])
  }
  return labels
})

// Tendance : compare 3 derniers jours vs 3 prec
const trend = computed<'up' | 'down' | 'flat'>(() => {
  const last3 = dailyCounts.value.slice(-3).reduce((a, b) => a + b, 0)
  const prev3 = dailyCounts.value.slice(-6, -3).reduce((a, b) => a + b, 0)
  if (last3 > prev3 * 1.1) return 'up'
  if (last3 < prev3 * 0.9) return 'down'
  return 'flat'
})

function goToDevoirs() { router.push('/assignments') }
</script>

<template>
  <div
    class="dashboard-card sa-card wpv-card"
    role="button"
    tabindex="0"
    aria-label="Voir l'activite de rendus"
    @click="goToDevoirs"
    @keydown.enter="goToDevoirs"
    @keydown.space.prevent="goToDevoirs"
  >
    <div class="sa-card-header">
      <Activity :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Activite 7 jours</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <div class="wpv-stats">
      <span class="wpv-total">{{ totalLast7d }}</span>
      <span class="wpv-label">rendus</span>
      <span class="wpv-trend" :class="`wpv-trend--${trend}`">
        <template v-if="trend === 'up'">↑</template>
        <template v-else-if="trend === 'down'">↓</template>
        <template v-else>→</template>
      </span>
    </div>

    <svg class="wpv-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        :points="polylinePoints"
        fill="none"
        stroke="var(--accent)"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Dots sur chaque point -->
      <circle
        v-for="(c, i) in dailyCounts"
        :key="i"
        :cx="2 + i * (96 / 6)"
        :cy="28 - (c / maxCount) * 26"
        r="1.4"
        fill="var(--accent)"
      />
    </svg>

    <div class="wpv-labels">
      <span v-for="(lbl, i) in dayLabels" :key="i" class="wpv-day">{{ lbl }}</span>
    </div>
  </div>
</template>

<style scoped>
.wpv-card { cursor: pointer; }

.wpv-stats {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 6px;
}
.wpv-total {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.wpv-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.wpv-trend {
  margin-left: auto;
  font-size: 14px;
  font-weight: 800;
}
.wpv-trend--up   { color: #3fb76f; }
.wpv-trend--down { color: #d9534f; }
.wpv-trend--flat { color: var(--text-muted); }

.wpv-sparkline {
  width: 100%;
  height: 42px;
  margin-top: 6px;
  display: block;
}

.wpv-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 9px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}
.wpv-day {
  flex: 1;
  text-align: center;
}
</style>
