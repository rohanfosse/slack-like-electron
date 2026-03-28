/**
 * StudentBento.vue - Dashboard etudiant compact.
 */
<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { AlertTriangle } from 'lucide-vue-next'
import { useBentoPrefs } from '@/composables/useBentoPrefs'
import { useAppStore } from '@/stores/app'
import { nextUpcoming } from '@/utils/devoirFilters'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'

import BentoCustomizer from './student-widgets/BentoCustomizer.vue'

import WidgetLive from './student-widgets/WidgetLive.vue'
import WidgetProject from './student-widgets/WidgetProject.vue'
import WidgetExams from './student-widgets/WidgetExams.vue'
import WidgetLivrables from './student-widgets/WidgetLivrables.vue'
import WidgetSoutenances from './student-widgets/WidgetSoutenances.vue'
import WidgetLastFeedback from './student-widgets/WidgetLastFeedback.vue'
import WidgetRecentDoc from './student-widgets/WidgetRecentDoc.vue'
import WidgetPromoActivity from './student-widgets/WidgetPromoActivity.vue'
import WidgetClock from './student-widgets/WidgetClock.vue'
import WidgetQuote from './student-widgets/WidgetQuote.vue'
import WidgetCalendar from './student-widgets/WidgetCalendar.vue'
import WidgetProgress from './student-widgets/WidgetProgress.vue'
import WidgetQuickLinks from './student-widgets/WidgetQuickLinks.vue'
import WidgetPomodoro from './student-widgets/WidgetPomodoro.vue'
import WidgetGrades from './student-widgets/WidgetGrades.vue'
import WidgetBookmarks from './student-widgets/WidgetBookmarks.vue'
import WidgetCountdown from './student-widgets/WidgetCountdown.vue'
import WidgetGroupMembers from './student-widgets/WidgetGroupMembers.vue'

const props = defineProps<{
  studentStats: { pending: number; submitted: number; graded: number; modeGrade: string | null }
  urgentActions: { id: number; title: string; isOverdue: boolean; urgency: string; category?: string | null; deadline?: string; type?: string }[]
  recentGrades: { title: string; note: string; category?: string | null }[]
  recentFeedback?: { title: string; feedback: string; note: string | null; category: string | null }[]
  studentProjectCards: StudentProjectCard[]
  hasDevoirsLoaded: boolean
}>()

const emit = defineEmits<{ goToProject: [key: string] }>()

const appStore = useAppStore()
const showCustomizer = ref(false)

function toggleCustomizer() {
  showCustomizer.value = !showCustomizer.value
}
defineExpose({ toggleCustomizer })

const { visibleWidgets, allWidgets, isVisible, toggleWidget, reorderWidgets, resetDefaults } = useBentoPrefs()

// ── Widget data ──────────────────────────────────────────────────────────
const activeProject = computed(() => {
  if (!props.studentProjectCards.length) return null
  const withDeadline = props.studentProjectCards
    .filter(p => p.nextDeadline && new Date(p.nextDeadline).getTime() > Date.now())
    .sort((a, b) => new Date(a.nextDeadline!).getTime() - new Date(b.nextDeadline!).getTime())
  return withDeadline[0] ?? props.studentProjectCards[0]
})

const nextExams = computed(() => nextUpcoming(props.urgentActions, ['cctl', 'etude_de_cas'], Date.now(), 4))
const nextLivrables = computed(() => nextUpcoming(props.urgentActions, ['livrable', 'memoire'], Date.now(), 2))
const nextSoutenances = computed(() => nextUpcoming(props.urgentActions, ['soutenance'], Date.now(), 2))

const widgetComponents: Record<string, Component> = {
  live: WidgetLive, project: WidgetProject, exams: WidgetExams,
  livrables: WidgetLivrables, soutenances: WidgetSoutenances,
  feedback: WidgetLastFeedback, recentDoc: WidgetRecentDoc, promoActivity: WidgetPromoActivity,
  clock: WidgetClock, quote: WidgetQuote, calendar: WidgetCalendar,
  progress: WidgetProgress, quicklinks: WidgetQuickLinks, pomodoro: WidgetPomodoro,
  grades: WidgetGrades, bookmarks: WidgetBookmarks, countdown: WidgetCountdown, group: WidgetGroupMembers,
}

const latestFeedback = computed(() => props.recentFeedback?.[0] ?? null)

const calendarDeadlines = computed(() =>
  props.urgentActions.filter(a => a.deadline).map(a => ({ date: a.deadline!, title: a.title })),
)

const widgetProps = computed<Record<string, Record<string, unknown>>>(() => ({
  live: {}, project: { project: activeProject.value },
  exams: { exams: nextExams.value }, livrables: { livrables: nextLivrables.value },
  soutenances: { soutenances: nextSoutenances.value },
  feedback: { feedback: latestFeedback.value }, recentDoc: {}, promoActivity: {},
  clock: {}, quote: {},
  calendar: { deadlines: calendarDeadlines.value },
  progress: { submitted: props.studentStats.submitted, total: totalDevoirs.value, graded: props.studentStats.graded },
  quicklinks: {}, pomodoro: {},
  grades: { grades: props.recentGrades },
  bookmarks: {},
  countdown: { nextDeadline: props.urgentActions.filter(a => a.deadline && !a.isOverdue).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0] ?? null },
  group: {},
}))

const widgetEvents: Record<string, Record<string, (...args: unknown[]) => void>> = {
  project: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  exams: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  livrables: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  soutenances: { goToProject: (key: unknown) => emit('goToProject', key as string) },
  feedback: { goToProject: (key: unknown) => emit('goToProject', key as string) },
}

// ── Stats ──────────────────────────────────────────────────────────────────
const totalDevoirs = computed(() => props.studentStats.pending + props.studentStats.submitted + props.studentStats.graded)
const overdueCount = computed(() => props.urgentActions.filter(a => a.isOverdue).length)

// Focus : only show if overdue (critical)
const showFocusAlert = computed(() => overdueCount.value > 0)

// Drag-and-drop : liste reordonnee des widgets visibles (hors live/promoActivity)
const draggableWidgets = ref(visibleWidgets.value.filter(w => w.id !== 'live' && w.id !== 'promoActivity'))
watch(visibleWidgets, (v) => { draggableWidgets.value = v.filter(w => w.id !== 'live' && w.id !== 'promoActivity') })
function onDragEnd() { reorderWidgets(draggableWidgets.value) }

function onToggle(id: string) {
  toggleWidget(id)
}

function onReset() {
  resetDefaults()
}
</script>

<template>
  <div class="sb-bento">

    <WidgetLive v-if="isVisible('live')" />

    <!-- Alert banner (only if overdue) -->
    <div v-if="showFocusAlert" class="sb-alert">
      <AlertTriangle :size="16" />
      <span>{{ overdueCount }} devoir{{ overdueCount > 1 ? 's' : '' }} en retard</span>
    </div>

    <!-- Widgets grid (2 colonnes, drag-and-drop quand customizer ouvert) -->
    <VueDraggable
      v-model="draggableWidgets"
      :disabled="!showCustomizer"
      ghost-class="sb-widget--ghost"
      :animation="200"
      class="sb-grid"
      :class="{ 'sb-grid--editing': showCustomizer }"
      @end="onDragEnd"
    >
      <div v-for="w in draggableWidgets" :key="w.id" class="sb-widget" :class="{ 'sb-widget--editing': showCustomizer }">
        <component
          :is="widgetComponents[w.id]"
          v-bind="widgetProps[w.id]"
          v-on="widgetEvents[w.id] ?? {}"
        />
      </div>
    </VueDraggable>

    <!-- Widget customizer panel -->
    <Transition name="sb-customizer">
      <BentoCustomizer
        v-if="showCustomizer"
        :all-widgets="allWidgets"
        :is-visible="isVisible"
        @toggle="onToggle"
        @reorder="reorderWidgets"
        @reset="onReset"
        @close="showCustomizer = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.sb-bento {
  display: flex; flex-direction: column; gap: 10px;
}

/* ── Alert (overdue only) ── */
.sb-alert {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(231, 76, 60, 0.08);
  border: 1px solid rgba(231, 76, 60, 0.2);
  color: #e74c3c; font-size: 13px; font-weight: 600;
}

/* ── Widgets grid ── */
.sb-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.sb-grid--editing {
  gap: 12px;
}
.sb-widget {
  animation: sb-fade .3s ease both;
  position: relative;
}
.sb-widget--editing {
  border: 2px dashed transparent;
  border-radius: 14px;
  cursor: grab;
}
.sb-widget--editing:hover {
  border-color: rgba(74,144,217,.3);
}
.sb-widget--ghost {
  opacity: 0.3;
  border: 2px dashed var(--accent) !important;
  border-radius: 14px;
}

@keyframes sb-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Customizer transition ── */
.sb-customizer-enter-active { transition: all .25s cubic-bezier(.4,0,.2,1); }
.sb-customizer-leave-active { transition: all .15s ease; }
.sb-customizer-enter-from { opacity: 0; transform: translateY(12px); }
.sb-customizer-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Responsive ── */
@media (max-width: 600px) {
  .sb-grid { grid-template-columns: 1fr; }
}
</style>
