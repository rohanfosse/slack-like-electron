<script setup lang="ts">
/** SidebarProjects — vue Devoirs, redesign style Lumen v2.114. */
import { ref, computed } from 'vue'
import { Layers, Plus, Check, Search, X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useModalsStore } from '@/stores/modals'
import { parseCategoryIcon } from '@/utils/categoryIcon'
import ProjectEditPanel from '@/components/sidebar/ProjectEditPanel.vue'
import NewProjectModal from '@/components/modals/NewProjectModal.vue'

import type { ProjectMeta } from '@/components/modals/NewProjectModal.vue'

const props = defineProps<{
  allProjects: string[]
  projectStats: Record<string, { depots: number; expected: number }>
  getProjectColor: (proj: string) => string
  editingProject: string | null
  getProjectMeta: (proj: string) => ProjectMeta | null
  projectTimePct: (proj: string) => number | null
  isProjectDone: (proj: string) => boolean
}>()

const emit = defineEmits<{
  selectProject: [key: string | null]
  openProjectCtx: [e: MouseEvent, proj: string]
  projectEditSave: [proj: string, data: ProjectMeta]
  cancelEdit: []
  projectCreated: [name: string]
}>()

const appStore = useAppStore()
const modals = useModalsStore()

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
</script>

<template>
  <div class="sb-proj">
    <div class="sb-proj-head">
      <span class="sb-proj-title">Projets</span>
      <span v-if="allProjects.length" class="sb-proj-count">{{ allProjects.length }}</span>
      <button
        v-if="appStore.isTeacher"
        type="button"
        class="sb-proj-add"
        title="Nouveau projet"
        @click.stop="modals.newProject = true"
      ><Plus :size="12" /></button>
    </div>

    <!-- Search -->
    <div v-if="allProjects.length >= 4" class="sb-proj-search">
      <Search :size="11" class="sb-proj-search-icon" />
      <input v-model="filter" type="text" class="sb-proj-search-input" placeholder="Rechercher..." />
      <button v-if="filter" type="button" class="sb-proj-search-clear" @click="filter = ''"><X :size="10" /></button>
    </div>

    <!-- All projects button -->
    <button
      type="button"
      class="sb-proj-item sb-proj-all"
      :class="{ 'is-active': appStore.activeProject === null }"
      @click="emit('selectProject', null)"
    >
      <Layers :size="12" />
      <span>Tout voir</span>
    </button>

    <!-- Project list -->
    <div class="sb-proj-list">
      <div v-for="proj in filteredProjects" :key="proj">
        <button
          type="button"
          class="sb-proj-item"
          :class="{ 'is-active': appStore.activeProject === proj, 'is-done': isProjectDone(proj) }"
          @click="emit('selectProject', proj)"
          @contextmenu.prevent="emit('openProjectCtx', $event, proj)"
        >
          <span class="sb-proj-dot" :style="{ background: getProjectColor(proj) }" />
          <span class="sb-proj-name">{{ parseCategoryIcon(proj).label }}</span>
          <Check v-if="isProjectDone(proj)" :size="11" class="sb-proj-check" />
          <span v-else class="sb-proj-pct">{{ projectPct(proj) }}%</span>
        </button>

        <!-- Progress bar (visible when active) -->
        <div v-if="appStore.activeProject === proj && projectStats[proj]" class="sb-proj-progress">
          <div class="sb-proj-progress-bar">
            <div class="sb-proj-progress-fill" :style="{ width: projectPct(proj) + '%', background: getProjectColor(proj) }" />
          </div>
          <span class="sb-proj-progress-label">{{ projectStats[proj].depots }}/{{ projectStats[proj].expected }}</span>
        </div>

        <ProjectEditPanel
          v-if="editingProject === proj"
          :project-key="proj"
          :meta="getProjectMeta(proj)"
          :color="getProjectColor(proj)"
          @save="emit('projectEditSave', proj, $event)"
          @cancel="emit('cancelEdit')"
        />
      </div>

      <div v-if="filteredProjects.length === 0 && filter" class="sb-proj-empty">Aucun projet pour "{{ filter }}"</div>
    </div>
  </div>

  <NewProjectModal v-if="appStore.isTeacher" v-model="modals.newProject" @created="(name: string) => emit('projectCreated', name)" />
</template>

<style scoped>
.sb-proj { padding: 6px 10px; display: flex; flex-direction: column; gap: 4px; }

.sb-proj-head { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
.sb-proj-title { font-size: 11px; font-weight: 700; color: var(--text-muted); flex: 1; }
.sb-proj-count {
  font-size: 9px; font-weight: 700; color: var(--accent);
  background: rgba(var(--accent-rgb), .14); padding: 1px 5px; border-radius: 8px;
}
.sb-proj-add {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 4px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.sb-proj-add:hover { background: var(--bg-hover); color: var(--accent); }

/* Search */
.sb-proj-search {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 7px; margin-bottom: 2px;
  background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px;
}
.sb-proj-search:focus-within { border-color: var(--accent); }
.sb-proj-search-icon { color: var(--text-muted); flex-shrink: 0; }
.sb-proj-search-input {
  flex: 1; background: transparent; border: none; color: var(--text-primary);
  font-size: 11px; font-family: inherit; outline: none;
}
.sb-proj-search-input::placeholder { color: var(--text-muted); }
.sb-proj-search-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 1px; }

/* Items */
.sb-proj-item {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 6px 8px; border-radius: 6px; border: none; border-left: 2px solid transparent;
  background: transparent; cursor: pointer; text-align: left; font-family: inherit; transition: all 0.1s;
}
.sb-proj-item:hover { background: var(--bg-hover); }
.sb-proj-item.is-active {
  background: var(--bg-active, rgba(var(--accent-rgb), .16));
  border-left-color: var(--accent);
}
.sb-proj-item.is-done { opacity: 0.5; }

.sb-proj-all { margin-bottom: 4px; font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.sb-proj-all.is-active { font-weight: 600; color: var(--text-primary); }

.sb-proj-dot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }
.sb-proj-name {
  flex: 1; font-size: 12px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sb-proj-item.is-active .sb-proj-name { font-weight: 600; }
.sb-proj-check { color: var(--success, #4caf50); flex-shrink: 0; }
.sb-proj-pct { font-size: 10px; color: var(--text-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }

/* Progress bar (active project) */
.sb-proj-progress {
  display: flex; align-items: center; gap: 6px; padding: 0 8px 4px 22px;
  animation: sb-expand 0.15s ease-out;
}
.sb-proj-progress-bar { flex: 1; height: 2px; background: var(--border); border-radius: 1px; overflow: hidden; }
.sb-proj-progress-fill { height: 100%; border-radius: 1px; transition: width 0.3s ease; }
.sb-proj-progress-label { font-size: 9px; color: var(--text-muted); font-variant-numeric: tabular-nums; }

.sb-proj-list { display: flex; flex-direction: column; gap: 1px; }
.sb-proj-empty { font-size: 11px; color: var(--text-muted); padding: 8px 4px; }

@keyframes sb-expand {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
