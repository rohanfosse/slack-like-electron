/**
 * StudentProjectsTab.vue
 * Dedicated "Mes projets" tab for the student dashboard.
 * Grid of project cards with MicroRing progress, deadline, overdue badge.
 */
<script setup lang="ts">
import { FolderOpen, Clock, AlertTriangle, Copy, ExternalLink, CalendarDays } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { deadlineClass, deadlineLabel } from '@/utils/date'
import MicroRing from '@/components/ui/MicroRing.vue'
import { useContextMenu, type ContextMenuItem } from '@/composables/useContextMenu'
import { useToast } from '@/composables/useToast'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'

defineProps<{
  studentProjectCards: StudentProjectCard[]
}>()

const emit = defineEmits<{
  goToProject: [key: string]
  navigateDevoirs: []
}>()

const router = useRouter()
const { showToast } = useToast()
const { state: ctxMenu, open: openCtxMenu, close: closeCtxMenu } = useContextMenu()

function openProjectCtx(ev: MouseEvent, p: StudentProjectCard) {
  const items: ContextMenuItem[] = [
    { label: 'Ouvrir le projet', icon: ExternalLink, action: () => emit('goToProject', p.key) },
    { label: 'Copier le nom',    icon: Copy,         action: async () => {
      await navigator.clipboard.writeText(p.label)
      showToast('Nom copie', 'success')
    } },
  ]
  if (p.nextDeadline) {
    items.push({ separator: true, label: '' })
    items.push({ label: 'Voir sur le calendrier', icon: CalendarDays, action: () => {
      router.push({ name: 'agenda', query: { date: p.nextDeadline!.slice(0, 10) } })
    } })
  }
  openCtxMenu(ev, items)
}
</script>

<template>
  <div class="spt">
    <div v-if="!studentProjectCards.length" class="spt-empty">
      <FolderOpen :size="36" style="opacity:.2;margin-bottom:10px" />
      <p>Aucun projet pour l'instant.</p>
      <button class="btn-ghost" style="margin-top:8px;font-size:13px" @click="emit('navigateDevoirs')">
        Voir mes devoirs
      </button>
    </div>

    <div v-else class="spt-grid">
      <div
        v-for="p in studentProjectCards" :key="p.key"
        class="spt-card"
        @click="emit('goToProject', p.key)"
        @contextmenu="openProjectCtx($event, p)"
      >
        <div class="spt-card-head">
          <div class="spt-card-icon">
            <component :is="p.icon" v-if="p.icon" :size="18" />
            <FolderOpen v-else :size="18" />
          </div>
          <MicroRing :value="p.submitted" :total="p.total" :size="28" />
        </div>

        <span class="spt-card-name">{{ p.label }}</span>

        <span class="spt-card-rendus">
          {{ p.submitted }}/{{ p.total }} rendus
        </span>

        <div class="spt-card-footer">
          <span
            v-if="p.nextDeadline"
            class="spt-card-deadline"
            :class="deadlineClass(p.nextDeadline)"
          >
            <Clock :size="10" /> {{ deadlineLabel(p.nextDeadline) }}
          </span>
          <span v-else class="spt-card-deadline spt-card-deadline--none">Aucune échéance</span>

          <span v-if="p.overdue > 0" class="spt-card-overdue">
            <AlertTriangle :size="10" /> {{ p.overdue }} en retard
          </span>
        </div>
      </div>
    </div>

    <ContextMenu v-if="ctxMenu" :x="ctxMenu.x" :y="ctxMenu.y" :items="ctxMenu.items" @close="closeCtxMenu" />
  </div>
</template>

<style scoped>
.spt { padding-top: 10px; }

/* ── Empty ── */
.spt-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; color: var(--text-muted); font-size: 13px; text-align: center;
}

/* ── Grid ── */
.spt-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* ── Card ── */
.spt-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 16px; border: 1px solid var(--border);
  border-radius: var(--radius-lg); background: var(--bg-elevated);
  cursor: pointer;
  transition: background .15s cubic-bezier(.4, 0, .2, 1),
              border-color .15s cubic-bezier(.4, 0, .2, 1),
              box-shadow .15s cubic-bezier(.4, 0, .2, 1);
}
.spt-card:hover {
  background: rgba(var(--accent-rgb),.07); border-color: rgba(var(--accent-rgb),.3);
  box-shadow: 0 2px 12px rgba(0,0,0,.15);
}

.spt-card-head {
  display: flex; align-items: center; justify-content: space-between;
}
.spt-card-icon {
  width: 36px; height: 36px; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  background: rgba(var(--accent-rgb),.1); color: var(--accent);
  flex-shrink: 0;
}

.spt-card-name {
  font-size: 14px; font-weight: 700; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.spt-card-rendus {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 11px; color: var(--text-muted);
}

.spt-card-footer {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.spt-card-deadline {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 600;
}
.spt-card-deadline.deadline-ok       { color: var(--color-success); }
.spt-card-deadline.deadline-warning  { color: #F39C12; }
.spt-card-deadline.deadline-soon     { color: var(--color-warning); }
.spt-card-deadline.deadline-critical,
.spt-card-deadline.deadline-passed   { color: var(--color-danger); }
.spt-card-deadline--none { color: var(--text-muted); font-style: italic; font-weight: 400; }

.spt-card-overdue {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .3px; padding: 2px 7px; border-radius: var(--radius-xs);
  background: rgba(231,76,60,.12); color: var(--color-danger);
}

@media (max-width: 600px) {
  .spt-grid { grid-template-columns: 1fr; }
}
</style>
