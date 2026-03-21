/**
 * DashboardStudent.vue
 * Orchestrator for the student dashboard — composes header, urgent actions,
 * stats, projects grid, and frise sub-components.
 */
<script setup lang="ts">
import { FolderOpen, BarChart2 } from 'lucide-vue-next'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'
import type { FriseMilestone, FrisePromo } from '@/composables/useFrise'

import StudentHeader from './StudentHeader.vue'
import StudentUrgentActions from './StudentUrgentActions.vue'
import StudentStatsCards from './StudentStatsCards.vue'
import StudentProjects from './StudentProjects.vue'
import StudentFrise from './StudentFrise.vue'

// ── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{
  toggleSidebar?: () => void
  loadingStudent: boolean
  greetingName: string
  today: string
  showOnboarding: boolean
  hasDevoirsLoaded: boolean

  // Stats
  studentStats: { pending: number; submitted: number; graded: number; modeGrade: string | null }

  // Urgent actions
  urgentActions: { id: number; title: string; isOverdue: boolean; urgency: string; category?: string | null }[]

  // Recent grades
  recentGrades: { title: string; note: string }[]

  // Projects
  studentProjectCards: StudentProjectCard[]

  // Tabs
  dashTab: 'accueil' | 'promotions' | 'frise' | 'analytique' | 'reglages'

  // Frise
  friseDragging: boolean
  ganttDateRange: { start: Date; end: Date } | null
  frise: FrisePromo[]
  ganttMonths: { left: number; label: string }[]
  ganttTodayPct: number

  // Frise helpers (functions)
  milestoneLeft: (deadline: string) => string
  projectLineStyle: (milestones: FriseMilestone[]) => Record<string, string>
}>()

// ── Emits ────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  'update:dashTab': [tab: 'accueil' | 'frise']
  dismissOnboarding: []
  goToProject: [key: string]
  onFriseWheel: [e: WheelEvent]
  onFriseDragStart: [e: MouseEvent]
  onFriseDragMove: [e: MouseEvent]
  onFriseDragEnd: [e: MouseEvent]
  onMilestoneClick: [ms: FriseMilestone]
  openStudentTimeline: []
  navigateDevoirs: []
}>()
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="loadingStudent" class="db-loading">
    <div v-for="i in 4" :key="i" class="skel db-skel-card" />
    <div class="db-skel-content">
      <div v-for="i in 5" :key="i" class="skel skel-line" :style="{ width: (45 + (i % 3) * 18) + '%' }" />
    </div>
  </div>

  <template v-else>
    <StudentHeader
      :toggle-sidebar="props.toggleSidebar"
      :greeting-name="greetingName"
      :today="today"
      @open-student-timeline="emit('openStudentTimeline')"
      @navigate-devoirs="emit('navigateDevoirs')"
    />

    <!-- Bannière onboarding (première visite) -->
    <div v-if="showOnboarding" class="db-onboarding">
      <div class="db-onboarding-content">
        <strong>Bienvenue sur Cursus !</strong>
        <span>Consultez vos <b>devoirs</b> dans la section Devoirs, discutez dans les <b>canaux</b>, et suivez votre <b>progression</b> ici.</span>
      </div>
      <button class="btn-ghost db-onboarding-close" @click="emit('dismissOnboarding')">C'est compris</button>
    </div>

    <StudentUrgentActions
      :urgent-actions="urgentActions"
      :has-devoirs-loaded="hasDevoirsLoaded"
      @go-to-project="(k) => emit('goToProject', k)"
    />

    <StudentStatsCards
      :student-stats="studentStats"
      :recent-grades="recentGrades"
    />

    <!-- Tabs -->
    <div class="db-tabs">
      <button class="db-tab" :class="{ active: dashTab === 'accueil' }" @click="emit('update:dashTab', 'accueil')">
        <FolderOpen :size="13" /> Mes projets
      </button>
      <button class="db-tab" :class="{ active: dashTab === 'frise' }" @click="emit('update:dashTab', 'frise')">
        <BarChart2 :size="13" /> Frise
      </button>
    </div>

    <StudentProjects
      v-if="dashTab === 'accueil'"
      :student-project-cards="studentProjectCards"
      @go-to-project="(k) => emit('goToProject', k)"
      @navigate-devoirs="emit('navigateDevoirs')"
    />

    <StudentFrise
      v-else
      :frise-dragging="friseDragging"
      :gantt-date-range="ganttDateRange"
      :frise="frise"
      :gantt-months="ganttMonths"
      :gantt-today-pct="ganttTodayPct"
      :milestone-left="milestoneLeft"
      :project-line-style="projectLineStyle"
      @go-to-project="(k) => emit('goToProject', k)"
      @on-frise-wheel="(e) => emit('onFriseWheel', e)"
      @on-frise-drag-start="(e) => emit('onFriseDragStart', e)"
      @on-frise-drag-move="(e) => emit('onFriseDragMove', e)"
      @on-frise-drag-end="(e) => emit('onFriseDragEnd', e)"
      @on-milestone-click="(ms) => emit('onMilestoneClick', ms)"
    />
  </template>
</template>

<style scoped>
/* ── Chargement ── */
.db-loading { display: flex; flex-direction: column; gap: 14px; padding: 32px 0; }
.db-skel-card { height: 76px; border-radius: 10px; flex-shrink: 0; }
.db-skel-content { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }

/* ── Onboarding ── */
.db-onboarding {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 20px; background: rgba(74,144,217,.1);
  border: 1px solid rgba(74,144,217,.25);
  border-radius: var(--radius); margin-bottom: 16px;
}
.db-onboarding-content { flex: 1; font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; }
.db-onboarding-content strong { color: var(--text-primary); display: block; margin-bottom: 2px; }
.db-onboarding-close { flex-shrink: 0; white-space: nowrap; }

/* ── Tabs ── */
.db-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
.db-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: none; background: transparent;
  color: var(--text-secondary); font-family: var(--font);
  font-size: 13px; font-weight: 600; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: 0;
  transition: color var(--t-fast), border-color var(--t-fast);
}
.db-tab:hover { color: var(--text-primary); }
.db-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
</style>
