<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Activity, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useTravauxStore } from '@/stores/travaux'
import { useAppStore } from '@/stores/app'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

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
      counts[6 - diffDays]++
    }
  }
  return counts
})

const maxCount = computed(() => Math.max(1, ...dailyCounts.value))
const totalLast7d = computed(() => dailyCounts.value.reduce((acc, n) => acc + n, 0))

const polylinePoints = computed(() => {
  const W = 100
  const H = 30
  const margin = 2
  const stepX = (W - margin * 2) / 6
  return dailyCounts.value
    .map((c, i) => {
      const x = margin + i * stepX
      const y = H - margin - (c / maxCount.value) * (H - margin * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

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
  <UiWidgetCard
    :icon="Activity"
    label="Activité 7 jours"
    interactive
    aria-label="Voir l'activité de rendus"
    @click="goToDevoirs"
  >
    <template #header-extra>
      <ChevronRight :size="13" class="wpv-chevron" />
    </template>

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
  </UiWidgetCard>
</template>

<style scoped>
.wpv-chevron { color: var(--text-muted); }

.wpv-stats {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
}
.wpv-total {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
}
.wpv-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 500;
}
.wpv-trend {
  margin-left: auto;
  font-size: var(--text-base);
  font-weight: 800;
}
.wpv-trend--up   { color: var(--color-success); }
.wpv-trend--down { color: var(--color-danger); }
.wpv-trend--flat { color: var(--text-muted); }

.wpv-sparkline {
  width: 100%;
  height: 42px;
  margin-top: var(--space-xs);
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
