/**
 * StudentBento.vue - Dashboard etudiant en grille bento (style prof).
 * Affiche les widgets dans une grille 4 colonnes avec tuile focus.
 */
<script setup lang="ts">
import { computed, ref, watch, nextTick, type Component } from 'vue'
import { Settings, CheckCircle2, Clock, AlertTriangle, ChevronRight, Award, BookOpen, Percent, FileText } from 'lucide-vue-next'
import { useBentoPrefs } from '@/composables/useBentoPrefs'
import { nextUpcoming } from '@/utils/devoirFilters'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'

import WidgetLive from './student-widgets/WidgetLive.vue'
import WidgetProject from './student-widgets/WidgetProject.vue'
import WidgetExams from './student-widgets/WidgetExams.vue'
import WidgetLivrables from './student-widgets/WidgetLivrables.vue'
import WidgetSoutenances from './student-widgets/WidgetSoutenances.vue'
import WidgetLastFeedback from './student-widgets/WidgetLastFeedback.vue'
import WidgetRecentDoc from './student-widgets/WidgetRecentDoc.vue'
import WidgetPromoActivity from './student-widgets/WidgetPromoActivity.vue'
import BentoCustomizer from './student-widgets/BentoCustomizer.vue'

const props = defineProps<{
  studentStats: { pending: number; submitted: number; graded: number; modeGrade: string | null }
  urgentActions: { id: number; title: string; isOverdue: boolean; urgency: string; category?: string | null; deadline?: string; type?: string }[]
  recentGrades: { title: string; note: string; category?: string | null }[]
  recentFeedback?: { title: string; feedback: string; note: string | null; category: string | null }[]
  studentProjectCards: StudentProjectCard[]
  hasDevoirsLoaded: boolean
}>()

const emit = defineEmits<{
  goToProject: [key: string]
}>()

const showCustomizer = ref(false)
const gearBtnRef = ref<HTMLButtonElement | null>(null)
const customizerRef = ref<InstanceType<typeof BentoCustomizer> | null>(null)
const { visibleWidgets, allWidgets, isVisible, toggleWidget, moveWidget, resetDefaults } = useBentoPrefs()

watch(showCustomizer, (visible) => {
  nextTick(() => {
    if (visible) {
      const el = customizerRef.value?.$el as HTMLElement | undefined
      el?.focus()
    } else {
      gearBtnRef.value?.focus()
    }
  })
})

// ── Computed data for widgets ──────────────────────────────────────────────
const activeProject = computed(() => {
  if (!props.studentProjectCards.length) return null
  const withDeadline = props.studentProjectCards
    .filter(p => p.nextDeadline && new Date(p.nextDeadline).getTime() > Date.now())
    .sort((a, b) => new Date(a.nextDeadline!).getTime() - new Date(b.nextDeadline!).getTime())
  return withDeadline[0] ?? props.studentProjectCards[0]
})

const nextExams = computed(() =>
  nextUpcoming(props.urgentActions, ['cctl', 'etude_de_cas'], Date.now(), 4),
)
const nextLivrables = computed(() =>
  nextUpcoming(props.urgentActions, ['livrable', 'memoire'], Date.now(), 2),
)
const nextSoutenances = computed(() =>
  nextUpcoming(props.urgentActions, ['soutenance'], Date.now(), 2),
)

const widgetComponents: Record<string, Component> = {
  live: WidgetLive,
  project: WidgetProject,
  exams: WidgetExams,
  livrables: WidgetLivrables,
  soutenances: WidgetSoutenances,
  feedback: WidgetLastFeedback,
  recentDoc: WidgetRecentDoc,
  promoActivity: WidgetPromoActivity,
}

const latestFeedback = computed(() => {
  if (!props.recentFeedback?.length) return null
  return props.recentFeedback[0]
})

const widgetProps = computed<Record<string, Record<string, unknown>>>(() => ({
  live: {},
  project: { project: activeProject.value },
  exams: { exams: nextExams.value },
  livrables: { livrables: nextLivrables.value },
  soutenances: { soutenances: nextSoutenances.value },
  feedback: { feedback: latestFeedback.value },
  recentDoc: {},
  promoActivity: {},
}))

const widgetEvents: Record<string, Record<string, (...args: unknown[]) => void>> = {
  project: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  exams: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  livrables: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  soutenances: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  feedback: { goToProject: (key: unknown) => emit('goToProject', key as string) },
}

// ── Focus tile logic ──────────────────────────────────────────────────────
const totalDevoirs = computed(() => props.studentStats.pending + props.studentStats.submitted + props.studentStats.graded)
const overdueCount = computed(() => props.urgentActions.filter(a => a.isOverdue).length)

type FocusState = {
  type: 'overdue' | 'pending' | 'clear'
  urgency: 'critical' | 'warning' | 'clear'
  title: string
  subtitle: string
}

const focusState = computed((): FocusState => {
  if (overdueCount.value > 0) {
    return {
      type: 'overdue',
      urgency: 'critical',
      title: `${overdueCount.value} devoir${overdueCount.value > 1 ? 's' : ''} en retard`,
      subtitle: 'Des travaux dépassent la date limite',
    }
  }
  if (props.studentStats.pending > 0) {
    return {
      type: 'pending',
      urgency: 'warning',
      title: `${props.studentStats.pending} devoir${props.studentStats.pending > 1 ? 's' : ''} à rendre`,
      subtitle: 'Des travaux attendent votre soumission',
    }
  }
  return {
    type: 'clear',
    urgency: 'clear',
    title: 'Tout est à jour',
    subtitle: 'Aucune action urgente requise',
  }
})

const focusBgClass = computed(() => {
  switch (focusState.value.urgency) {
    case 'critical': return 'focus--critical'
    case 'warning':  return 'focus--warning'
    case 'clear':    return 'focus--clear'
    default:         return 'focus--clear'
  }
})

// ── Stats ──────────────────────────────────────────────────────────────────
const submissionRate = computed(() =>
  totalDevoirs.value > 0
    ? Math.round(((props.studentStats.submitted + props.studentStats.graded) / totalDevoirs.value) * 100)
    : 0,
)
</script>

<template>
  <div class="sb-bento">

    <!-- Customizer -->
    <div class="sb-header">
      <button
        ref="gearBtnRef"
        class="sa-customize-btn"
        :class="{ 'sa-customize-btn--active': showCustomizer }"
        title="Personnaliser"
        aria-label="Personnaliser le tableau de bord"
        @click="showCustomizer = !showCustomizer"
      >
        <Settings :size="14" />
      </button>
    </div>

    <Transition name="sa-customizer">
      <BentoCustomizer
        ref="customizerRef"
        v-if="showCustomizer"
        :all-widgets="allWidgets"
        :is-visible="isVisible"
        @toggle="toggleWidget"
        @move="moveWidget"
        @reset="resetDefaults"
        @close="showCustomizer = false"
      />
    </Transition>

    <!-- Live alert (full-width above grid) -->
    <WidgetLive v-if="isVisible('live')" />

    <!-- ═══ BENTO GRID ═══ -->
    <div class="bento-grid">

      <!-- FOCUS TILE (2x2) -->
      <div class="dashboard-card bento-tile bento-focus" :class="focusBgClass">
        <div class="focus-icon">
          <AlertTriangle v-if="focusState.type === 'overdue'" :size="28" />
          <Clock v-else-if="focusState.type === 'pending'" :size="28" />
          <CheckCircle2 v-else :size="28" />
        </div>
        <h2 class="focus-title">{{ focusState.title }}</h2>
        <p class="focus-subtitle">{{ focusState.subtitle }}</p>
      </div>

      <!-- STAT: Soumission % -->
      <div class="dashboard-card bento-tile bento-stat">
        <div class="stat-ring">
          <svg viewBox="0 0 36 36" class="stat-ring-svg">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bg-active)" stroke-width="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke="var(--accent)" stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="`${submissionRate * 0.942} 94.2`"
              transform="rotate(-90 18 18)"
              style="transition: stroke-dasharray .6s ease"
            />
          </svg>
        </div>
        <span class="stat-number">{{ submissionRate }}%</span>
        <span class="stat-label">soumis</span>
        <Percent :size="14" class="stat-icon" />
      </div>

      <!-- STAT: En attente -->
      <div class="dashboard-card bento-tile bento-stat" :class="{ 'stat--alert': studentStats.pending > 0 }">
        <span class="stat-number">{{ studentStats.pending }}</span>
        <span class="stat-label">a rendre</span>
        <FileText :size="14" class="stat-icon" />
      </div>

      <!-- STAT: Moyenne -->
      <div class="dashboard-card bento-tile bento-stat">
        <span class="stat-number">{{ studentStats.modeGrade ?? '--' }}</span>
        <span class="stat-label">moyenne</span>
        <Award :size="14" class="stat-icon" />
      </div>

      <!-- STAT: Notes obtenues -->
      <div class="dashboard-card bento-tile bento-stat">
        <span class="stat-number">{{ studentStats.graded }}</span>
        <span class="stat-label">notes</span>
        <BookOpen :size="14" class="stat-icon" />
      </div>

      <!-- WIDGET AREA: remaining widgets in 2-col spans -->
      <template v-for="w in visibleWidgets.filter(w => w.id !== 'live')" :key="w.id">
        <div class="bento-tile bento-widget">
          <component
            :is="widgetComponents[w.id]"
            v-bind="widgetProps[w.id]"
            v-on="widgetEvents[w.id] ?? {}"
          />
        </div>
      </template>

    </div><!-- /.bento-grid -->
  </div>
</template>

<style scoped>
.sb-bento {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 14px;
}

/* ── Header ── */
.sb-header {
  display: flex;
  justify-content: flex-end;
}
.sa-customize-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sa-customize-btn:hover,
.sa-customize-btn--active {
  background: rgba(74,144,217,.08);
  border-color: rgba(74,144,217,.25);
  color: var(--accent);
}

/* ── Bento Grid ── */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: 12px;
}

/* ── Focus tile (2x2) ── */
.bento-focus {
  grid-column: span 2;
  grid-row: span 2;
  display: flex; flex-direction: column;
  align-items: flex-start; justify-content: center;
  gap: 8px; padding: 28px 24px;
  border-radius: 14px;
  transition: all .3s;
}
.focus--critical {
  background: rgba(231, 76, 60, 0.08);
  border-color: rgba(231, 76, 60, 0.2);
}
.focus--critical .focus-icon { color: #e74c3c; }
.focus--warning {
  background: rgba(243, 156, 18, 0.08);
  border-color: rgba(243, 156, 18, 0.2);
}
.focus--warning .focus-icon { color: #f39c12; }
.focus--clear {
  background: rgba(46, 204, 113, 0.06);
  border-color: rgba(46, 204, 113, 0.2);
}
.focus--clear .focus-icon { color: var(--color-success); }
.focus-icon { margin-bottom: 4px; }
.focus-title {
  font-size: 20px; font-weight: 700; color: var(--text-primary);
  margin: 0; line-height: 1.2;
}
.focus-subtitle {
  font-size: 13px; color: var(--text-muted); margin: 0;
}

/* ── Stat tiles (1x1) ── */
.bento-stat {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px; text-align: center;
  min-height: 100px; position: relative;
  border-radius: 14px;
}
.stat-number {
  font-size: 28px; font-weight: 700;
  color: var(--text-primary); line-height: 1;
}
.stat-label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em;
  color: var(--text-muted);
}
.stat-icon {
  position: absolute; top: 10px; right: 10px;
  color: var(--text-muted); opacity: .4;
}
.stat-ring { position: relative; width: 40px; height: 40px; }
.stat-ring-svg { width: 100%; height: 100%; }

.stat--alert {
  background: rgba(231, 76, 60, 0.06);
  border-color: rgba(231, 76, 60, 0.2);
}
.stat--alert .stat-number { color: #e74c3c; }
.stat-online-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--color-success);
}

/* ── Widget tiles (span 2 cols) ── */
.bento-widget {
  grid-column: span 2;
}

/* ── Transitions ── */
.sa-customizer-enter-active,
.sa-customizer-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.sa-customizer-enter-from,
.sa-customizer-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .bento-focus { grid-column: span 2; grid-row: span 1; }
}
@media (max-width: 480px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-focus, .bento-widget { grid-column: span 1; }
}
</style>
