/** SidebarDashboard — redesign style Lumen v2.114. */
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Search, X, FolderOpen, BarChart2, ChevronRight, Check } from 'lucide-vue-next'
import { useAppStore }     from '@/stores/app'
import { useModalsStore }  from '@/stores/modals'
import { useModules }      from '@/composables/useModules'
import { parseCategoryIcon } from '@/utils/categoryIcon'
import NewProjectModal from '@/components/modals/NewProjectModal.vue'

const props = defineProps<{
  allProjects: string[]
  projectStats: Record<string, { depots: number; expected: number }>
  getProjectColor: (key: string) => string
  activePromoObj: { name: string; color: string } | null
  recentActivity: { id: number | string; text: string; time: string }[]
}>()

const emit = defineEmits<{
  selectProject: [key: string | null]
  projectCreated: [key: string]
}>()

const appStore  = useAppStore()
const modals    = useModalsStore()
const route     = useRoute()
const router    = useRouter()
const { isEnabled } = useModules()

const filter = ref('')

const filteredProjects = computed(() => {
  const q = filter.value.toLowerCase().trim()
  if (!q) return props.allProjects
  return props.allProjects.filter((p) => parseCategoryIcon(p).label.toLowerCase().includes(q))
})

function projectPct(proj: string): number {
  const s = props.projectStats[proj]
  if (!s || s.expected === 0) return 0
  return Math.round((s.depots / s.expected) * 100)
}

function isProjectDone(proj: string): boolean {
  const s = props.projectStats[proj]
  return !!s && s.expected > 0 && s.depots >= s.expected
}
</script>

<template>
  <!-- Promo card (prof) -->
  <div v-if="appStore.isTeacher && activePromoObj" class="sb-dash-promo">
    <span class="sb-dash-promo-dot" :style="{ background: activePromoObj.color }" />
    <span class="sb-dash-promo-name">{{ activePromoObj.name }}</span>
  </div>

  <!-- Tabs -->
  <div class="sb-dash-tabs">
    <button
      class="sb-dash-tab"
      :class="{ active: !route.query.tab || route.query.tab === 'projets' }"
      @click="router.push('/dashboard')"
    >
      <FolderOpen :size="12" /> Accueil
    </button>
    <button
      v-if="isEnabled('frise')"
      class="sb-dash-tab"
      :class="{ active: route.query.tab === 'frise' }"
      @click="router.push({ path: '/dashboard', query: { tab: 'frise' } })"
    >
      <BarChart2 :size="12" /> Frise
    </button>
  </div>

  <!-- Projets -->
  <div class="sb-dash-section">
    <div class="sb-dash-section-head">
      <span class="sb-dash-section-title">Projets</span>
      <span v-if="allProjects.length" class="sb-dash-section-count">{{ allProjects.length }}</span>
      <button v-if="appStore.isTeacher" type="button" class="sb-dash-add" title="Nouveau projet" @click="modals.newProject = true">
        <Plus :size="12" />
      </button>
    </div>

    <!-- Search -->
    <div v-if="allProjects.length >= 4" class="sb-dash-search">
      <Search :size="11" class="sb-dash-search-icon" />
      <input v-model="filter" type="text" class="sb-dash-search-input" placeholder="Rechercher un projet..." />
      <button v-if="filter" type="button" class="sb-dash-search-clear" @click="filter = ''"><X :size="10" /></button>
    </div>

    <div class="sb-dash-projects">
      <button
        v-for="proj in filteredProjects"
        :key="proj"
        type="button"
        class="sb-dash-project"
        :class="{ 'is-active': appStore.activeProject === proj, 'is-done': isProjectDone(proj) }"
        @click="emit('selectProject', proj)"
      >
        <span class="sb-dash-project-dot" :style="{ background: getProjectColor(proj) }" />
        <span class="sb-dash-project-name">{{ parseCategoryIcon(proj).label }}</span>
        <Check v-if="isProjectDone(proj)" :size="11" class="sb-dash-project-check" />
        <span v-else-if="projectStats[proj]" class="sb-dash-project-pct">{{ projectPct(proj) }}%</span>
      </button>
      <div v-if="filteredProjects.length === 0" class="sb-dash-empty">Aucun projet</div>
    </div>
  </div>

  <NewProjectModal v-model="modals.newProject" @created="(k: string) => emit('projectCreated', k)" />
</template>

<style scoped>
/* Promo card */
.sb-dash-promo {
  display: flex; align-items: center; gap: 6px;
  margin: 6px 10px 2px; padding: 8px 10px;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
.sb-dash-promo-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sb-dash-promo-name { font-size: 12px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Tabs */
.sb-dash-tabs {
  display: flex; gap: 2px; margin: 6px 10px 4px;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 2px;
}
.sb-dash-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 5px 8px; border-radius: var(--radius-xs); border: none; background: transparent;
  color: var(--text-muted); font-size: 11px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: all 0.12s;
}
.sb-dash-tab:hover { color: var(--text-primary); }
.sb-dash-tab.active { background: var(--accent); color: white; }

/* Section */
.sb-dash-section { padding: 4px 10px; }
.sb-dash-section-head {
  display: flex; align-items: center; gap: 4px; margin-bottom: 4px;
}
.sb-dash-section-title { font-size: 11px; font-weight: 700; color: var(--text-muted); flex: 1; }
.sb-dash-section-count {
  font-size: 9px; font-weight: 700; color: var(--accent);
  background: rgba(var(--accent-rgb), .14); padding: 1px 5px; border-radius: var(--radius-sm);
}
.sb-dash-add {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: var(--radius-xs); border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.sb-dash-add:hover { background: var(--bg-hover); color: var(--accent); }

/* Search */
.sb-dash-search {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 7px; margin-bottom: 4px;
  background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px;
}
.sb-dash-search:focus-within { border-color: var(--accent); }
.sb-dash-search-icon { color: var(--text-muted); flex-shrink: 0; }
.sb-dash-search-input {
  flex: 1; background: transparent; border: none; color: var(--text-primary);
  font-size: 11px; font-family: inherit; outline: none;
}
.sb-dash-search-input::placeholder { color: var(--text-muted); }
.sb-dash-search-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 1px; }

/* Project items */
.sb-dash-projects { display: flex; flex-direction: column; gap: 1px; }
.sb-dash-project {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 6px 8px; border-radius: var(--radius-sm); border: none; border-left: 2px solid transparent;
  background: transparent; cursor: pointer; text-align: left; transition: all 0.1s;
}
.sb-dash-project:hover { background: var(--bg-hover); }
.sb-dash-project.is-active {
  background: var(--bg-active, rgba(var(--accent-rgb), .16));
  border-left-color: var(--accent);
}
.sb-dash-project.is-done { opacity: 0.5; }
.sb-dash-project-dot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }
.sb-dash-project-name {
  flex: 1; font-size: 12px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sb-dash-project.is-active .sb-dash-project-name { font-weight: 600; }
.sb-dash-project-check { color: var(--success, #4caf50); flex-shrink: 0; }
.sb-dash-project-pct { font-size: 10px; color: var(--text-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }

.sb-dash-empty { font-size: 11px; color: var(--text-muted); padding: 8px 4px; }
</style>
