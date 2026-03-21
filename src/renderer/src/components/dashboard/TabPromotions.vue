/**
 * TabPromotions.vue
 * ---------------------------------------------------------------------------
 * Promotions tab: promotion cards with rename, delete, stats, and actions.
 */
<script setup lang="ts">
import {
  Users, BookOpen, TrendingUp, Edit3,
  GraduationCap, FileText, PlusCircle,
} from 'lucide-vue-next'
import type { Promotion } from '@/types'
import type { GanttRow } from '@/composables/useDashboardTeacher'

defineProps<{
  promos: Promotion[]
  activePromoId: number | null
  savingPromo: boolean
  deletingPromoId: number | null
  renamingPromoId: number | null
  renamingPromoValue: string
  allStudents: { id: number; promo_id: number; name?: string }[]
  ganttAll: GanttRow[]
}>()

const emit = defineEmits<{
  'update:activePromoId': [id: number]
  'update:renamingPromoId': [id: number | null]
  'update:renamingPromoValue': [val: string]
  confirmRenamePromo: [promo: Promotion]
  deletePromo: [id: number, name: string]
  openClasse: []
  openImportStudents: [promoId: number]
  openCreatePromo: []
}>()
</script>

<template>
  <div class="db-tab-content">
    <div class="promo-list">
      <div
        v-for="p in promos"
        :key="p.id"
        class="promo-list-card"
        :class="{ 'promo-active': activePromoId === p.id }"
        :style="{ borderColor: activePromoId === p.id ? p.color : undefined }"
      >
        <div class="promo-list-header">
          <span class="promo-list-dot" :style="{ background: p.color }" />
          <template v-if="renamingPromoId === p.id">
            <input
              :value="renamingPromoValue"
              class="promo-rename-input"
              aria-label="Nom de la promotion"
              :disabled="savingPromo"
              @input="emit('update:renamingPromoValue', ($event.target as HTMLInputElement).value)"
              @keydown.enter="emit('confirmRenamePromo', p)"
              @keydown.escape="emit('update:renamingPromoId', null)"
            />
            <button class="gestion-btn-sm gestion-btn-accent" :disabled="savingPromo" @click="emit('confirmRenamePromo', p)">
              {{ savingPromo ? '…' : 'OK' }}
            </button>
            <button class="gestion-btn-sm" :disabled="savingPromo" @click="emit('update:renamingPromoId', null)">Annuler</button>
          </template>
          <template v-else>
            <span class="promo-list-name">{{ p.name }}</span>
            <span v-if="activePromoId === p.id" class="promo-list-active-tag">Active</span>
            <button v-else class="gestion-btn-sm" @click="emit('update:activePromoId', p.id)">Sélectionner</button>
          </template>
        </div>

        <!-- Stats enrichies -->
        <div class="promo-list-stats">
          <span><Users :size="11" /> {{ allStudents.filter(s => s.promo_id === p.id).length }} étudiants</span>
          <span>
            <BookOpen :size="11" />
            {{ ganttAll.filter(t => t.promo_name === p.name && t.published).length }} publiés
            <template v-if="ganttAll.filter(t => t.promo_name === p.name && !t.published).length">
              · {{ ganttAll.filter(t => t.promo_name === p.name && !t.published).length }} brouillons
            </template>
          </span>
          <span v-if="ganttAll.filter(t => t.promo_name === p.name && t.published && t.students_total > 0).length">
            <TrendingUp :size="11" />
            {{ Math.round(ganttAll.filter(t => t.promo_name === p.name && t.published && t.students_total > 0).reduce((s, t) => s + t.depots_count / t.students_total, 0) / Math.max(1, ganttAll.filter(t => t.promo_name === p.name && t.published && t.students_total > 0).length) * 100) }}% soumission moy.
          </span>
        </div>

        <!-- Actions -->
        <div class="promo-list-actions">
          <button class="gestion-btn" @click="emit('update:renamingPromoId', p.id); emit('update:renamingPromoValue', p.name)">
            <Edit3 :size="11" /> Renommer
          </button>
          <button class="gestion-btn" @click="emit('update:activePromoId', p.id); emit('openClasse')">
            <GraduationCap :size="11" /> Classe
          </button>
          <button class="gestion-btn" @click="emit('openImportStudents', p.id)">
            <FileText :size="11" /> Importer CSV
          </button>
          <button
            class="gestion-btn"
            style="color:var(--color-danger)"
            :disabled="deletingPromoId === p.id"
            @click="emit('deletePromo', p.id, p.name)"
          >
            {{ deletingPromoId === p.id ? 'Suppression…' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
    <button class="dc-add-btn" style="margin:12px 0" @click="emit('openCreatePromo')">
      <PlusCircle :size="13" /> Nouvelle promotion
    </button>
  </div>
</template>

<style scoped>
.db-tab-content { display: flex; flex-direction: column; gap: 0; }

/* ── Onglet Promotions ── */
.promo-list { display: flex; flex-direction: column; gap: 8px; }
.promo-list-card {
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px; transition: border-color var(--t-fast);
}
.promo-list-card.promo-active { border-color: var(--accent); background: rgba(74,144,217,.04); }
.promo-list-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.promo-list-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.promo-list-name { font-size: 15px; font-weight: 700; color: var(--text-primary); flex: 1; }
.promo-list-active-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  padding: 2px 8px; border-radius: 10px;
  background: rgba(74,144,217,.15); color: var(--accent);
}
.promo-list-stats { font-size: 12px; color: var(--text-muted); display: flex; gap: 12px; margin-bottom: 8px; }
.promo-list-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.promo-rename-input {
  flex: 1; font-size: 14px; font-weight: 600; padding: 3px 8px;
  background: var(--bg-input); border: 1px solid var(--accent); border-radius: 6px;
  color: var(--text-primary); font-family: var(--font); outline: none;
}

.gestion-btn {
  font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px;
  background: rgba(255,255,255,.06); color: var(--text-secondary);
  border: 1px solid var(--border-input); cursor: pointer; font-family: var(--font);
  transition: all var(--t-fast);
}
.gestion-btn:hover { background: rgba(255,255,255,.1); color: var(--text-primary); }
.gestion-btn-sm {
  font-size: 10px; padding: 2px 7px; border-radius: 4px;
  background: rgba(255,255,255,.06); color: var(--text-muted);
  border: 1px solid var(--border-input); cursor: pointer; font-family: var(--font);
}
.gestion-btn-accent { background: var(--accent); color: #fff; border-color: var(--accent); }

.dc-add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; padding: 5px 12px; flex-shrink: 0;
  color: var(--text-muted);
  border: 1.5px dashed var(--border-input); border-radius: 20px;
  background: none; cursor: pointer; font-family: var(--font);
  transition: all .15s ease;
}
.dc-add-btn:hover { color: var(--accent); border-color: var(--accent); background: rgba(74,144,217,.07); }
</style>
