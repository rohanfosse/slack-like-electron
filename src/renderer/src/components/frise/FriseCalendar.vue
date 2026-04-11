/**
 * Frise chronologique generique et reutilisable.
 * Axe temporel, groupement par jour, popup dropdown, marqueur "Aujourd'hui".
 * Utilise par TabFrise (prof) et StudentTimelineModal (etudiant).
 */
<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatDate } from '@/utils/date'
import FriseDotPopup from './FriseDotPopup.vue'
import type { EnrichedMilestone, PositionedGroup } from '@/composables/useFrise'

const props = defineProps<{
  groups: PositionedGroup[]
  months: { left: number; label: string }[]
  todayPct: number
  dragging?: boolean
}>()

const emit = defineEmits<{
  milestoneClick: [ms: EnrichedMilestone]
  wheel: [e: WheelEvent]
  dragStart: [e: MouseEvent]
  dragMove: [e: MouseEvent]
  dragEnd: [e: MouseEvent]
}>()

// ── Expanded group state ─────────────────────────────────────────────────
const expandedGroup = ref<string | null>(null)

function toggleGroup(dateKey: string) {
  expandedGroup.value = expandedGroup.value === dateKey ? null : dateKey
}

function onGroupClick(group: PositionedGroup) {
  if (group.items.length > 1) {
    toggleGroup(group.dateKey)
  } else {
    emit('milestoneClick', group.items[0])
  }
}

function onPopupSelect(ms: EnrichedMilestone) {
  expandedGroup.value = null
  emit('milestoneClick', ms)
}

// ── Helpers ──────────────────────────────────────────────────────────────
function truncateLabel(text: string, max = 18): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

function dotClassForGroup(group: PositionedGroup) {
  const allDiamond = group.items.every(ms => ms.type === 'soutenance' || ms.type === 'cctl')
  return {
    'fc-dot--diamond': allDiamond,
    'fc-dot--multi': group.items.length > 1,
  }
}
</script>

<template>
  <div class="fc-wrap">
    <!-- Timeline -->
    <div
      class="fc-timeline"
      :class="{ 'fc-grabbing': dragging }"
      @wheel.prevent="(e: WheelEvent) => emit('wheel', e)"
      @mousedown="(e: MouseEvent) => emit('dragStart', e)"
      @mousemove="(e: MouseEvent) => emit('dragMove', e)"
      @mouseup="(e: MouseEvent) => emit('dragEnd', e)"
      @mouseleave="(e: MouseEvent) => emit('dragEnd', e)"
    >
      <!-- Axis -->
      <div class="fc-axis">
        <div v-for="(m, i) in months" :key="i" class="fc-month" :style="{ left: m.left + '%' }">
          {{ m.label }}
        </div>
        <div
          v-for="(m, i) in months" :key="`bg${i}`" class="fc-month-bg" :class="{ even: i % 2 === 0 }"
          :style="i < months.length - 1
            ? { left: m.left + '%', width: (months[i+1].left - m.left) + '%' }
            : { left: m.left + '%', right: '0' }"
        />
        <div v-if="todayPct >= 0 && todayPct <= 100" class="fc-today" :style="{ left: todayPct + '%' }">
          <span class="fc-today-label">Auj.</span>
        </div>
      </div>

      <!-- Single lane -->
      <div class="fc-lane">
        <div class="fc-lane-line" />
        <div
          v-for="(group, gi) in groups" :key="group.dateKey"
          class="fc-milestone"
          :class="{ 'fc-milestone--above': gi % 2 === 0, 'fc-milestone--expanded': expandedGroup === group.dateKey }"
          :style="{ left: group.pct + '%', transform: `translate(-50%, -50%) translateY(${group.offsetY}px)` }"
          @click.stop="onGroupClick(group)"
        >
          <!-- Dot -->
          <div
            class="fc-dot"
            :class="dotClassForGroup(group)"
            :style="{ background: group.mainColor }"
            :title="group.items.length === 1 ? group.items[0].title : `${group.items.length} devoirs`"
          >
            <span v-if="group.items.length > 1" class="fc-dot-count">{{ group.items.length }}</span>
          </div>

          <!-- Hover label -->
          <div class="fc-ms-labels">
            <span class="fc-ms-label" :style="{ color: group.mainColor }">
              {{ group.items.length === 1 ? truncateLabel(group.items[0].title) : `${group.items.length} devoirs` }}
            </span>
            <span class="fc-ms-date">{{ formatDate(group.deadline) }}</span>
          </div>

          <!-- Popup dropdown -->
          <FriseDotPopup
            v-if="expandedGroup === group.dateKey && group.items.length > 1"
            :group="group"
            :above="gi % 2 === 0"
            @select="onPopupSelect"
          />
        </div>
      </div>
    </div>

    <!-- Click outside to close -->
    <div v-if="expandedGroup" class="fc-backdrop" @click="expandedGroup = null" />
  </div>
</template>

<style scoped>
.fc-wrap { position: relative; }

.fc-timeline {
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--bg-sidebar); position: relative;
  cursor: grab; user-select: none; min-height: 120px;
}
.fc-grabbing { cursor: grabbing; }

/* Axis */
.fc-axis { position: relative; height: 32px; border-bottom: 1px solid var(--border); }
.fc-month {
  position: absolute; top: 9px; font-size: 10px; font-weight: 600;
  color: var(--text-muted); white-space: nowrap; transform: translateX(-50%);
  pointer-events: none; letter-spacing: .3px;
}
.fc-month-bg { position: absolute; top: 0; bottom: 0; }
.fc-month-bg.even { background: var(--bg-active); }
.fc-today {
  position: absolute; top: 0; bottom: -180px; width: 2px;
  background: rgba(74,144,217,.4); z-index: 3; pointer-events: none;
}
.fc-today-label {
  position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
  font-size: 9px; font-weight: 700; color: var(--accent);
  background: var(--bg-sidebar); padding: 1px 5px; border-radius: 4px; white-space: nowrap;
}

/* Lane */
.fc-lane { position: relative; height: 160px; display: flex; align-items: center; }
.fc-lane-line {
  position: absolute; left: 2%; right: 2%; top: 50%;
  height: 2px; background: var(--bg-active); border-radius: 1px; transform: translateY(-50%);
}

/* Milestone */
.fc-milestone {
  position: absolute; top: 50%;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  cursor: pointer; z-index: 2; transition: transform var(--motion-fast) var(--ease-out);
}
.fc-milestone--expanded { z-index: 10; }
.fc-ms-labels {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  pointer-events: none; position: absolute; top: calc(100% + 4px);
  opacity: 0; transform: translateY(2px); transition: opacity .2s, transform .2s;
  background: var(--bg-modal); border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15);
  white-space: nowrap; z-index: 15;
}
.fc-milestone:hover .fc-ms-labels { opacity: 1; transform: translateY(0); }
.fc-ms-label { font-size: 11px; font-weight: 600; white-space: nowrap; }
.fc-ms-date { font-size: 9px; font-weight: 500; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }

/* Dot */
.fc-dot {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid var(--bg-sidebar); flex-shrink: 0;
  transition: transform .15s, box-shadow .15s; position: relative;
  display: flex; align-items: center; justify-content: center;
}
.fc-dot--multi { width: 20px; height: 20px; border-radius: 50%; }
.fc-dot-count { font-size: 9px; font-weight: 800; color: #fff; line-height: 1; pointer-events: none; }
.fc-milestone:hover .fc-dot { transform: scale(1.3); box-shadow: 0 0 0 4px var(--bg-hover); }
.fc-dot--diamond { border-radius: 2px; transform: rotate(45deg); }
.fc-milestone:hover .fc-dot--diamond { transform: rotate(45deg) scale(1.3); }

/* Backdrop */
.fc-backdrop { position: fixed; inset: 0; z-index: 5; }

@media (max-width: 600px) {
  .fc-lane { height: 120px; }
}
</style>
