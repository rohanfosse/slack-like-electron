/**
 * StudentBento.vue - Dashboard etudiant en grille bento compacte.
 */
<script setup lang="ts">
import { computed, ref, watch, nextTick, type Component } from 'vue'
import { Settings, CheckCircle2, Clock, AlertTriangle, Award, BookOpen, Percent, FileText, Wifi } from 'lucide-vue-next'
import { useBentoPrefs } from '@/composables/useBentoPrefs'
import { useAppStore } from '@/stores/app'
import { nextUpcoming } from '@/utils/devoirFilters'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'

import WidgetLive from './student-widgets/WidgetLive.vue'
import WidgetProject from './student-widgets/WidgetProject.vue'
import WidgetExams from './student-widgets/WidgetExams.vue'
import WidgetLivrables from './student-widgets/WidgetLivrables.vue'
import WidgetSoutenances from './student-widgets/WidgetSoutenances.vue'
import WidgetLastFeedback from './student-widgets/WidgetLastFeedback.vue'
import WidgetRecentDoc from './student-widgets/WidgetRecentDoc.vue'
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

const appStore = useAppStore()
const showCustomizer = ref(false)
const gearBtnRef = ref<HTMLButtonElement | null>(null)
const customizerRef = ref<InstanceType<typeof BentoCustomizer> | null>(null)
const { visibleWidgets, allWidgets, isVisible, toggleWidget, moveWidget, reorderWidgets, resetDefaults } = useBentoPrefs()

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

// Widgets sans promoActivity (integre directement comme stat)
const widgetComponents: Record<string, Component> = {
  live: WidgetLive,
  project: WidgetProject,
  exams: WidgetExams,
  livrables: WidgetLivrables,
  soutenances: WidgetSoutenances,
  feedback: WidgetLastFeedback,
  recentDoc: WidgetRecentDoc,
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
const pendingIsAlert = computed(() => overdueCount.value > 0)
const onlineCount = computed(() => appStore.onlineUsers?.length ?? 0)
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
        @reorder="reorderWidgets"
        @reset="resetDefaults"
        @close="showCustomizer = false"
      />
    </Transition>

    <!-- Live alert -->
    <WidgetLive v-if="isVisible('live')" />

    <!-- ═══ BENTO GRID ═══ -->
    <div class="bento-grid">

      <!-- Focus (2 cols) -->
      <div class="dashboard-card bento-tile bento-focus" :class="focusBgClass">
        <div class="focus-row">
          <div class="focus-icon">
            <AlertTriangle v-if="focusState.type === 'overdue'" :size="20" />
            <Clock v-else-if="focusState.type === 'pending'" :size="20" />
            <CheckCircle2 v-else :size="20" />
          </div>
          <div class="focus-text">
            <h2 class="focus-title">{{ focusState.title }}</h2>
            <p class="focus-subtitle">{{ focusState.subtitle }}</p>
          </div>
        </div>
      </div>

      <!-- Stat: Soumission % -->
      <div class="dashboard-card bento-tile bento-stat bento-stat--accent">
        <div class="stat-ring">
          <svg viewBox="0 0 36 36" class="stat-ring-svg">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bg-active)" stroke-width="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"
              :stroke-dasharray="`${submissionRate * 0.942} 94.2`" transform="rotate(-90 18 18)" style="transition: stroke-dasharray .6s ease" />
          </svg>
        </div>
        <span class="stat-number">{{ submissionRate }}%</span>
        <span class="stat-label">soumis</span>
      </div>

      <!-- Stat: A rendre (ou check si 0) -->
      <div v-if="studentStats.pending > 0" class="dashboard-card bento-tile bento-stat" :class="{ 'bento-stat--danger': pendingIsAlert, 'bento-stat--warning': !pendingIsAlert }">
        <span class="stat-number">{{ studentStats.pending }}</span>
        <span class="stat-label">à rendre</span>
      </div>
      <div v-else class="dashboard-card bento-tile bento-stat bento-stat--success">
        <CheckCircle2 :size="18" class="stat-check-icon" />
        <span class="stat-label">rien à rendre</span>
      </div>

      <!-- Stat: Moyenne -->
      <div class="dashboard-card bento-tile bento-stat">
        <span class="stat-number">{{ studentStats.modeGrade ?? '--' }}</span>
        <span class="stat-label">moyenne</span>
      </div>

      <!-- Stat: Notes -->
      <div class="dashboard-card bento-tile bento-stat">
        <span class="stat-number">{{ studentStats.graded }}</span>
        <span class="stat-label">notes</span>
      </div>

      <!-- Stat: En ligne (integre, remplace WidgetPromoActivity) -->
      <div class="dashboard-card bento-tile bento-stat bento-stat--online">
        <span class="stat-online-dot" />
        <span class="stat-number">{{ onlineCount }}</span>
        <span class="stat-label">en ligne</span>
      </div>

      <!-- Widgets dynamiques -->
      <template v-for="w in visibleWidgets.filter(w => w.id !== 'live' && w.id !== 'promoActivity')" :key="w.id">
        <div class="bento-tile bento-widget" :style="{ animationDelay: '0.' + (visibleWidgets.indexOf(w) * 5) + 's' }">
          <component
            :is="widgetComponents[w.id]"
            v-bind="widgetProps[w.id]"
            v-on="widgetEvents[w.id] ?? {}"
          />
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.sb-bento {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
}

/* ── Header ── */
.sb-header { display: flex; justify-content: flex-end; }
.sa-customize-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px;
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
  grid-auto-rows: minmax(auto, auto);
  gap: 10px;
}

/* ── Tile base ── */
.bento-tile {
  border-radius: 12px;
  transition: transform .2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .2s;
}
.bento-tile:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
}

/* ── Focus tile ── */
.bento-focus {
  grid-column: span 2;
  padding: 16px 18px;
}
.focus-row { display: flex; align-items: center; gap: 12px; }
.focus-icon { flex-shrink: 0; }
.focus-text { min-width: 0; }
.focus-title {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  margin: 0; line-height: 1.3;
}
.focus-subtitle { font-size: 12px; color: var(--text-muted); margin: 2px 0 0; }

.focus--critical {
  background: linear-gradient(135deg, rgba(231,76,60,.08), rgba(231,76,60,.03));
  border-color: rgba(231,76,60,.18);
}
.focus--critical .focus-icon { color: #e74c3c; }
.focus--warning {
  background: linear-gradient(135deg, rgba(243,156,18,.08), rgba(243,156,18,.03));
  border-color: rgba(243,156,18,.18);
}
.focus--warning .focus-icon { color: #f39c12; }
.focus--clear {
  background: linear-gradient(135deg, rgba(46,204,113,.06), rgba(46,204,113,.02));
  border-color: rgba(46,204,113,.15);
}
.focus--clear .focus-icon { color: var(--color-success); }

/* ── Stat tiles ── */
.bento-stat {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px; text-align: center;
  padding: 14px 10px;
  position: relative;
  border-top: 2px solid var(--border);
}
.bento-stat--accent  { border-top-color: var(--accent); }
.bento-stat--danger  { border-top-color: #e74c3c; }
.bento-stat--warning { border-top-color: #f39c12; }
.bento-stat--success { border-top-color: var(--color-success); }
.bento-stat--online  { border-top-color: #4ade80; }

.stat-number {
  font-size: 22px; font-weight: 700;
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
  color: var(--text-primary); line-height: 1;
}
.stat-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .04em;
  color: var(--text-muted);
}
.stat-ring { position: relative; width: 32px; height: 32px; }
.stat-ring-svg { width: 100%; height: 100%; }

.stat--danger .stat-number { color: #e74c3c; }
.stat-check-icon { color: var(--color-success); margin-bottom: 2px; }
.stat-online-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, .4);
}

/* ── Widget tiles ── */
.bento-widget {
  grid-column: span 2;
  animation: bento-fade-in .4s ease both;
}

@keyframes bento-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Transitions ── */
.sa-customizer-enter-active,
.sa-customizer-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.sa-customizer-enter-from,
.sa-customizer-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .bento-focus { grid-column: span 2; }
}
@media (max-width: 480px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-focus, .bento-widget { grid-column: span 1; }
}
</style>
