<script setup lang="ts">
  import { computed } from 'vue'
  import { ChevronLeft, ChevronRight, RotateCcw, LayoutGrid } from 'lucide-vue-next'
  import { useWeekPlanner } from '@/composables/useWeekPlanner'
  import { useTravauxStore } from '@/stores/travaux'
  import type { Ref } from 'vue'
  import type { Devoir } from '@/types'
  import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

  const travauxStore = useTravauxStore()
  const devoirs = computed(() => travauxStore.devoirs) as Ref<Devoir[]>

  const { week, offset, totalEvents, nextWeek, prevWeek, resetWeek } = useWeekPlanner(devoirs)

  const TYPE_COLORS: Record<string, string> = {
    cctl:         'var(--color-cctl)',
    soutenance:   'var(--color-soutenance)',
    livrable:     'var(--color-livrable)',
    etude_de_cas: 'var(--color-etude-de-cas)',
    memoire:      'var(--color-memoire)',
    autre:        'var(--color-autre)',
  }

  function typeColor(type: string): string {
    return TYPE_COLORS[type] || 'var(--accent)'
  }
</script>

<template>
  <UiWidgetCard
    :icon="LayoutGrid"
    label="Semaine"
    aria-label="Planning de la semaine"
  >
    <template #header-extra>
      <span v-if="totalEvents > 0" class="wp-total">{{ totalEvents }} event{{ totalEvents > 1 ? 's' : '' }}</span>
      <div class="wp-nav">
        <button type="button" class="wp-nav-btn" aria-label="Semaine précédente" @click="prevWeek">
          <ChevronLeft :size="14" />
        </button>
        <button v-if="offset !== 0" type="button" class="wp-nav-btn" aria-label="Cette semaine" @click="resetWeek">
          <RotateCcw :size="12" />
        </button>
        <button type="button" class="wp-nav-btn" aria-label="Semaine suivante" @click="nextWeek">
          <ChevronRight :size="14" />
        </button>
      </div>
    </template>

    <div class="wp-grid">
      <div
        v-for="day in week"
        :key="day.date"
        class="wp-day"
        :class="{ 'wp-day--today': day.isToday, 'wp-day--has-events': day.events.length > 0 }"
      >
        <div class="wp-day-header">
          <span class="wp-day-name">{{ day.dayName }}</span>
          <span class="wp-day-num">{{ day.label.split('/')[0] }}</span>
        </div>
        <div class="wp-day-events">
          <div
            v-for="ev in day.events"
            :key="ev.id"
            class="wp-event"
            :class="{ 'wp-event--done': ev.isSubmitted }"
            :style="{ '--ec': typeColor(ev.type) }"
            :title="`${ev.title} — ${ev.hour}`"
          >
            <span class="wp-event-dot"></span>
            <span class="wp-event-title">{{ ev.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wp-total {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.wp-nav { display: flex; gap: 2px; }

.wp-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out);
}
.wp-nav-btn:hover { background: var(--bg-hover); }
.wp-nav-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.wp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.wp-day {
  display: flex;
  flex-direction: column;
  min-height: 64px;
  border-radius: var(--radius-sm);
  padding: var(--space-xs);
  background: var(--bg-hover);
  transition: background var(--motion-fast) var(--ease-out);
}

.wp-day--today {
  background: var(--accent-subtle);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.wp-day--has-events { background: rgba(var(--accent-rgb), 0.04); }

.wp-day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-xs);
}

.wp-day-name {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

.wp-day-num {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.wp-day--today .wp-day-num { color: var(--accent); }

.wp-day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.wp-event {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 3px;
  border-radius: var(--radius-xs);
  transition: background var(--motion-fast) var(--ease-out);
}

.wp-event:hover { background: var(--bg-hover); }

.wp-event--done {
  opacity: 0.5;
  text-decoration: line-through;
}

.wp-event-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--ec, var(--accent));
  flex-shrink: 0;
}

.wp-event-title {
  font-size: 9px;
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .wp-grid { gap: 2px; }
  .wp-day { min-height: 48px; padding: 2px; }
  .wp-event-title { display: none; }
}
</style>
