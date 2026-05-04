/**
 * Frise chronologique unifiée - tous les devoirs sur une seule ligne temporelle.
 * Couleur par projet, vue semaine/mois/trimestre/année, drag & zoom.
 */
<script setup lang="ts">
import { ref, computed } from 'vue'
import { BarChart2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import FriseCalendar from '@/components/frise/FriseCalendar.vue'
import type { FriseMilestone, FrisePromo, EnrichedMilestone } from '@/composables/useFrise'
import { buildProjectColorMap, flattenMilestones, groupByDay, positionGroups } from '@/composables/useFrise'

const props = defineProps<{
  friseOffset: number
  friseDragging: boolean
  ganttDateRange: { start: Date; end: Date } | null
  frise: FrisePromo[]
  ganttMonths: { left: number; label: string }[]
  ganttTodayPct: number
  milestoneLeft: (deadline: string) => string
  projectLineStyle: (milestones: FriseMilestone[]) => Record<string, string>
}>()

const emit = defineEmits<{
  'update:friseOffset': [val: number]
  goToProject: [key: string]
  onFriseWheel: [e: WheelEvent]
  onFriseDragStart: [e: MouseEvent]
  onFriseDragMove: [e: MouseEvent]
  onFriseDragEnd: [e: MouseEvent]
  onMilestoneClick: [ms: FriseMilestone]
  setFriseZoom: [days: number]
}>()

// ── Zoom presets ──────────────────────────────────────────────────────────
type ZoomLevel = 'semaine' | 'mois' | 'trimestre' | 'annee'
const activeZoom = ref<ZoomLevel>('mois')
const ZOOM_MAP: Record<ZoomLevel, { days: number; label: string }> = {
  semaine:   { days: 14,  label: 'Semaine' },
  mois:      { days: 30,  label: 'Mois' },
  trimestre: { days: 90,  label: 'Trimestre' },
  annee:     { days: 365, label: 'Année' },
}

function setZoom(z: ZoomLevel) {
  activeZoom.value = z
  emit('setFriseZoom', ZOOM_MAP[z].days)
}

// ── Palette + enrichment + grouping (delegated to useFrise) ──────────────
const projectColorMap = computed(() => buildProjectColorMap(props.frise))
const flatMilestones  = computed(() => flattenMilestones(props.frise, projectColorMap.value))
const groupedByDay    = computed(() => groupByDay(flatMilestones.value))
const positionedGroups = computed(() => positionGroups(groupedByDay.value, props.milestoneLeft))

// ── Légende projets ──────────────────────────────────────────────────────
const projectLegend = computed(() => {
  const seen = new Map<string, { label: string; color: string; count: number }>()
  for (const ms of flatMilestones.value) {
    if (!seen.has(ms.projectKey)) {
      seen.set(ms.projectKey, { label: ms.projectLabel, color: ms.color, count: 0 })
    }
    seen.get(ms.projectKey)!.count++
  }
  return [...seen.values()]
})

</script>

<template>
  <div class="tf">
    <!-- Toolbar -->
    <div class="tf-toolbar">
      <div class="tf-zoom-group">
        <button
          v-for="(v, k) in ZOOM_MAP" :key="k"
          class="tf-zoom-btn" :class="{ active: activeZoom === k }"
          @click="setZoom(k as ZoomLevel)"
        >{{ v.label }}</button>
      </div>
      <span class="tf-count">{{ flatMilestones.length }} devoir{{ flatMilestones.length > 1 ? 's' : '' }}</span>
      <div class="tf-nav">
        <button class="tf-nav-btn" title="Période précédente" @click="emit('update:friseOffset', friseOffset - ZOOM_MAP[activeZoom].days / 2)">
          <ChevronLeft :size="16" />
        </button>
        <button v-if="friseOffset !== 0" class="tf-nav-center" @click="emit('update:friseOffset', 0)">Aujourd'hui</button>
        <button class="tf-nav-btn" title="Période suivante" @click="emit('update:friseOffset', friseOffset + ZOOM_MAP[activeZoom].days / 2)">
          <ChevronRight :size="16" />
        </button>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="!ganttDateRange || !flatMilestones.length" class="tf-empty">
      <BarChart2 :size="36" style="opacity:.2;margin-bottom:10px" />
      <p>Aucune donnée de planification disponible.</p>
    </div>

    <!-- Timeline (FriseCalendar) -->
    <FriseCalendar
      v-else
      :groups="positionedGroups"
      :months="ganttMonths"
      :today-pct="ganttTodayPct"
      :dragging="friseDragging"
      @milestone-click="(ms: EnrichedMilestone) => emit('onMilestoneClick', ms)"
      @wheel="(e: WheelEvent) => emit('onFriseWheel', e)"
      @drag-start="(e: MouseEvent) => emit('onFriseDragStart', e)"
      @drag-move="(e: MouseEvent) => emit('onFriseDragMove', e)"
      @drag-end="(e: MouseEvent) => emit('onFriseDragEnd', e)"
    />

    <!-- Légende projets -->
    <div v-if="projectLegend.length" class="tf-legend">
      <button
        v-for="p in projectLegend" :key="p.label"
        class="tf-legend-item"
        @click="emit('goToProject', p.label)"
      >
        <span class="tf-legend-dot" :style="{ background: p.color }" />
        <span class="tf-legend-label">{{ p.label }}</span>
        <span class="tf-legend-count">{{ p.count }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tf { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.tf-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px; gap: 8px; flex-wrap: wrap;
}
.tf-zoom-group { display: flex; gap: 0; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.tf-zoom-btn {
  font-size: 12px; font-weight: 600; padding: 6px 14px;
  background: transparent; color: var(--text-muted);
  border: none; cursor: pointer; font-family: var(--font);
  transition: all .15s;
}
.tf-zoom-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.tf-zoom-btn.active { background: var(--accent); color: #fff; }
.tf-count { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.tf-nav { display: flex; align-items: center; gap: 4px; }
.tf-nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text-secondary); cursor: pointer; transition: all .15s;
}
.tf-nav-btn:hover { background: var(--bg-active); color: var(--text-primary); }
.tf-nav-center {
  font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: var(--radius-sm);
  background: rgba(var(--accent-rgb),.12); color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb),.25); cursor: pointer; font-family: var(--font);
  transition: all .15s;
}
.tf-nav-center:hover { background: rgba(var(--accent-rgb),.2); }

/* ── Empty ────────────────────────────────────────────────────────────────── */
.tf-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; color: var(--text-muted); font-size: 13px; text-align: center;
}

/* ── Légende ──────────────────────────────────────────────────────────────── */
.tf-legend {
  display: flex; gap: 6px; flex-wrap: wrap; padding: 0 4px;
}
.tf-legend-item {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: var(--radius-lg);
  background: var(--bg-elevated); border: 1px solid var(--border);
  cursor: pointer; font-family: var(--font); transition: all .15s;
}
.tf-legend-item:hover { background: var(--bg-hover); border-color: var(--text-muted); }
.tf-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.tf-legend-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.tf-legend-count { font-size: 11px; color: var(--text-muted); }

@media (max-width: 600px) {
  .tf-toolbar { flex-direction: column; align-items: stretch; }
  .tf-zoom-group { width: 100%; }
  .tf-zoom-btn { flex: 1; text-align: center; }
}
</style>
