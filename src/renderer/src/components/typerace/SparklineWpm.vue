/**
 * SparklineWpm — courbe WPM compacte, reutilisee live pendant le jeu et
 * en grand sur l'ecran de fin.
 *
 * Rend une polyline SVG + un "area fill" en degrade sous la courbe. Pas
 * de lib externe (pas d'interet pour 30-120 points simples).
 */
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  samples: number[]
  width?:  number
  height?: number
  /** Axe Y borne par max(samples, yMin) pour eviter un plat quand tous les samples sont faibles. */
  yMin?:   number
  /** Affiche une ligne horizontale pointillee au niveau du target (ex : score du leader). */
  target?: number | null
  /** Epaisseur du trace. */
  stroke?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 280,
  height: 60,
  yMin: 20,
  target: null,
  stroke: 2,
})

const padding = 2

const yMax = computed(() => Math.max(props.yMin, ...props.samples, props.target ?? 0))

const points = computed(() => {
  if (props.samples.length === 0) return ''
  const w = props.width - padding * 2
  const h = props.height - padding * 2
  const n = props.samples.length
  return props.samples.map((v, i) => {
    const x = padding + (n === 1 ? w / 2 : (i / (n - 1)) * w)
    const y = padding + h - (v / yMax.value) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const areaPath = computed(() => {
  if (props.samples.length === 0) return ''
  const w = props.width - padding * 2
  const h = props.height - padding * 2
  const n = props.samples.length
  const pts = props.samples.map((v, i) => {
    const x = padding + (n === 1 ? w / 2 : (i / (n - 1)) * w)
    const y = padding + h - (v / yMax.value) * h
    return [x, y] as const
  })
  const first = pts[0]
  const last = pts[pts.length - 1]
  const lines = pts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const baseY = padding + h
  return `M ${first[0].toFixed(1)} ${baseY} ${lines} L ${last[0].toFixed(1)} ${baseY} Z`
})

const targetY = computed(() => {
  if (props.target == null || yMax.value === 0) return null
  const h = props.height - padding * 2
  return padding + h - (props.target / yMax.value) * h
})

const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="spark"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="currentColor" stop-opacity="0.35" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Ligne cible (ex : leader du jour) -->
    <line
      v-if="targetY != null"
      :x1="padding"
      :x2="width - padding"
      :y1="targetY"
      :y2="targetY"
      class="spark-target"
      stroke-dasharray="3 4"
    />

    <!-- Zone remplie sous la courbe -->
    <path v-if="areaPath" :d="areaPath" :fill="`url(#${gradientId})`" />

    <!-- Courbe principale -->
    <polyline
      v-if="points"
      :points="points"
      fill="none"
      stroke="currentColor"
      :stroke-width="stroke"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.spark {
  color: var(--accent);
  display: block;
}

.spark-target {
  stroke: var(--text-muted);
  stroke-width: 1;
  opacity: .5;
}
</style>
