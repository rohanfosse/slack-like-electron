/**
 * RadialTimer — anneau circulaire qui se vide au fil du chrono.
 *
 * Prefere a un chip "45s" pour donner une perception inconsciente du
 * temps restant (moins besoin de lire). La couleur vire au danger sur
 * les 10 dernieres secondes.
 */
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  remainingMs: number
  totalMs:     number
  size?:       number
  stroke?:     number
  /** Seuil (ms) en-dessous duquel la couleur vire au rouge. */
  dangerMs?:   number
}

const props = withDefaults(defineProps<Props>(), {
  size: 96,
  stroke: 6,
  dangerMs: 10_000,
})

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const progress = computed(() => Math.max(0, Math.min(1, props.remainingMs / props.totalMs)))
const dashOffset = computed(() => circumference.value * (1 - progress.value))

const isDanger = computed(() => props.remainingMs <= props.dangerMs)
const secondsLeft = computed(() => Math.ceil(props.remainingMs / 1000))
</script>

<template>
  <div
    class="radial-timer"
    :class="{ 'radial-timer--danger': isDanger }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="timer"
    :aria-label="`${secondsLeft} secondes restantes`"
  >
    <svg :width="size" :height="size" aria-hidden="true">
      <!-- Piste -->
      <circle
        :cx="size / 2" :cy="size / 2" :r="radius"
        class="radial-track"
        :stroke-width="stroke"
        fill="none"
      />
      <!-- Progression -->
      <circle
        :cx="size / 2" :cy="size / 2" :r="radius"
        class="radial-bar"
        :stroke-width="stroke"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div class="radial-label">
      <span class="radial-value">{{ secondsLeft }}</span>
      <span class="radial-unit">s</span>
    </div>
  </div>
</template>

<style scoped>
.radial-timer {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  transition: color .2s;
}

.radial-timer--danger {
  color: var(--color-danger);
  animation: radial-pulse 1s ease-in-out infinite;
}

@keyframes radial-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}

.radial-track {
  stroke: var(--border);
}

.radial-bar {
  stroke: currentColor;
  transition: stroke-dashoffset 100ms linear, stroke .2s;
  stroke-linecap: round;
}

.radial-label {
  position: absolute;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.radial-timer--danger .radial-label {
  color: var(--color-danger);
}

.radial-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1;
}

.radial-unit {
  font-size: 13px;
  font-weight: 600;
  opacity: .6;
}
</style>
