/**
 * TabReglages.vue
 * ---------------------------------------------------------------------------
 * Administration/settings tab: intervenants management, navigation shortcuts,
 * and system info card.
 */
<script setup lang="ts">
import {
  Users, LayoutDashboard, Clock, BookOpen, Edit3, Settings,
} from 'lucide-vue-next'
import type { Promotion } from '@/types'
import type { GanttRow } from '@/composables/useDashboardTeacher'

defineProps<{
  promos: Promotion[]
  allStudents: { id: number; promo_id: number; name?: string }[]
  ganttAll: GanttRow[]
}>()

const emit = defineEmits<{
  openIntervenants: []
  openEcheancier: []
  navigateDevoirs: []
  navigateMessages: []
  openSettings: []
}>()
</script>

<template>
  <div class="db-tab-content">
    <div class="gestion-grid">
      <div class="gestion-card">
        <div class="gestion-card-header">
          <h4 class="gestion-card-title"><Users :size="13" /> Intervenants</h4>
          <button class="gestion-btn" @click="emit('openIntervenants')">Gérer</button>
        </div>
        <p class="gestion-hint">Gérez les comptes intervenants et leurs accès aux canaux par promotion.</p>
        <button class="gestion-btn" style="margin-top:8px" @click="emit('openIntervenants')">
          <Users :size="12" /> Ouvrir la gestion
        </button>
      </div>

      <div class="gestion-card">
        <h4 class="gestion-card-title"><LayoutDashboard :size="13" /> Navigation rapide</h4>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="gestion-btn" @click="emit('openEcheancier')"><Clock :size="12" /> Échéancier</button>
          <button class="gestion-btn" @click="emit('navigateDevoirs')"><BookOpen :size="12" /> Aller aux devoirs</button>
          <button class="gestion-btn" @click="emit('navigateMessages')"><Edit3 :size="12" /> Aller aux messages</button>
          <button class="gestion-btn" @click="emit('openSettings')"><Settings :size="12" /> Préférences</button>
        </div>
      </div>

      <div class="gestion-card">
        <h4 class="gestion-card-title"><Settings :size="13" /> Système</h4>
        <div class="gestion-promo-stats">
          <span>{{ promos.length }} promotion{{ promos.length > 1 ? 's' : '' }}</span>
          <span>{{ allStudents.length }} étudiants au total</span>
          <span>{{ ganttAll.length }} devoirs au total</span>
        </div>
        <p class="gestion-hint" style="margin-top:8px">Version Cursus v2.0.0</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.db-tab-content { display: flex; flex-direction: column; gap: 0; }

.gestion-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;
}
.gestion-card {
  background: var(--bg-elevated, rgba(255,255,255,.03));
  border: 1px solid var(--border); border-radius: 10px; padding: 16px;
}
.gestion-card-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.gestion-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.gestion-card-header .gestion-card-title { margin-bottom: 0; }
.gestion-btn {
  font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px;
  background: rgba(255,255,255,.06); color: var(--text-secondary);
  border: 1px solid var(--border-input); cursor: pointer; font-family: var(--font);
  transition: all var(--t-fast);
}
.gestion-btn:hover { background: rgba(255,255,255,.1); color: var(--text-primary); }
.gestion-promo-stats { font-size: 12px; color: var(--text-muted); display: flex; gap: 12px; }
.gestion-hint { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
</style>
