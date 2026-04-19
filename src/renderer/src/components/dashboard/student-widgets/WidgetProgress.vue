<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

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
  <UiWidgetCard
    :icon="TrendingUp"
    label="Progression"
    :aria-label="`Progression : ${pct}% soumis, ${gradedPct}% notés`"
  >
    <div class="wpg-body">
      <div class="wpg-ring">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle
            cx="44" cy="44" :r="RADIUS"
            fill="none" stroke="var(--border)" stroke-width="7"
          />
          <circle
            cx="44" cy="44" :r="RADIUS"
            fill="none" stroke="var(--accent)" stroke-width="7"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="submittedOffset"
            transform="rotate(-90 44 44)"
            class="wpg-arc"
          />
          <circle
            cx="44" cy="44" :r="RADIUS"
            fill="none" stroke="var(--color-success)" stroke-width="7"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="gradedOffset"
            transform="rotate(-90 44 44)"
            class="wpg-arc"
          />
        </svg>
        <span class="wpg-pct">{{ pct }}%</span>
      </div>
      <span class="wpg-detail">
        {{ submitted }} soumis · {{ graded }} notés · {{ remaining }} restants
      </span>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wpg-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 0 2px;
}

.wpg-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wpg-arc {
  transition: stroke-dashoffset .6s var(--ease-in-out);
}

.wpg-pct {
  position: absolute;
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.wpg-detail {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
}
</style>
