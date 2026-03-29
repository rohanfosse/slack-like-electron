/**
 * TabPromotions.vue
 * ---------------------------------------------------------------------------
 * Promotions tab: shows the active promo card with ring chart, stat pills,
 * rename, class, import, color picker, and delete actions.
 */
<script setup lang="ts">
import {
  Users, BookOpen, TrendingUp, Edit3,
  GraduationCap, FileText, PlusCircle,
  Trash2, Palette,
} from 'lucide-vue-next'
import type { Promotion } from '@/types'
import type { GanttRow } from '@/composables/useDashboardTeacher'

import { computed, ref } from 'vue'

const props = defineProps<{
  promos: Promotion[]
  activePromoId: number | null
  savingPromo: boolean
  deletingPromoId: number | null
  renamingPromoId: number | null
  renamingPromoValue: string
  allStudents: { id: number; promo_id: number; name?: string }[]
  ganttAll: GanttRow[]
}>()

/* ── Color picker state ── */
const colorPickerOpenId = ref<number | null>(null)
const COLOR_OPTIONS = [
  '#4A90D9', '#2ECC71', '#9B87F5', '#F39C12', '#E74C3C',
  '#1ABC9C', '#E67E22', '#8E44AD', '#27AE60', '#3498DB',
]

function toggleColorPicker(promoId: number) {
  colorPickerOpenId.value = colorPickerOpenId.value === promoId ? null : promoId
}

async function selectColor(promoId: number, color: string) {
  colorPickerOpenId.value = null
  emit('changePromoColor', promoId, color)
}

/* ── Stats per promo ── */
const promoStats = computed(() => {
  const map = new Map<number, {
    students: number; published: number; drafts: number; avgSubmission: number
  }>()
  for (const p of props.promos) {
    const studs = props.allStudents.filter(s => s.promo_id === p.id)
    const students = studs.length
    const promoRows = props.ganttAll.filter(t => t.promo_name === p.name)
    const published = promoRows.filter(t => t.published).length
    const drafts = promoRows.filter(t => !t.published).length
    const withStudents = promoRows.filter(t => t.published && t.students_total > 0)
    const avgSubmission = withStudents.length
      ? Math.round(withStudents.reduce((s, t) => s + t.depots_count / t.students_total, 0) / withStudents.length * 100)
      : 0

    map.set(p.id, { students, published, drafts, avgSubmission })
  }
  return map
})

/* ── Filtered promos: only the active one ── */
const filteredPromos = computed(() => {
  if (props.activePromoId == null) return props.promos
  const filtered = props.promos.filter(p => p.id === props.activePromoId)
  return filtered.length ? filtered : props.promos
})

/* ── Ring chart helpers ── */
function ringDash(pct: number): string {
  const circ = 2 * Math.PI * 18
  const filled = circ * pct / 100
  return `${filled} ${circ - filled}`
}
const ringCirc = 2 * Math.PI * 18

const emit = defineEmits<{
  'update:activePromoId': [id: number]
  'update:renamingPromoId': [id: number | null]
  'update:renamingPromoValue': [val: string]
  confirmRenamePromo: [promo: Promotion]
  deletePromo: [id: number, name: string]
  changePromoColor: [id: number, color: string]
  openClasse: []
  openImportStudents: [promoId: number]
  openCreatePromo: []
}>()
</script>

<template>
  <div class="db-tab-content">
    <!-- Promo cards -->
    <div class="tp-promo-list">
      <div
        v-for="p in filteredPromos"
        :key="p.id"
        class="tp-card"
        :class="{ 'tp-card--active': activePromoId === p.id }"
        :style="{ '--promo-color': p.color }"
      >
        <!-- Header -->
        <div class="tp-card-header">
          <div class="tp-card-identity">
            <span class="tp-card-dot" :style="{ background: p.color }" />
            <template v-if="renamingPromoId === p.id">
              <label :for="`rename-promo-${p.id}`" class="sr-only">Nom de la promotion</label>
              <input
                :id="`rename-promo-${p.id}`"
                :value="renamingPromoValue"
                class="tp-rename-input"
                aria-label="Nom de la promotion"
                :disabled="savingPromo"
                @input="emit('update:renamingPromoValue', ($event.target as HTMLInputElement).value)"
                @keydown.enter="emit('confirmRenamePromo', p)"
                @keydown.escape="emit('update:renamingPromoId', null)"
              />
              <button class="tp-btn tp-btn--accent" :disabled="savingPromo" @click="emit('confirmRenamePromo', p)">
                {{ savingPromo ? '...' : 'OK' }}
              </button>
              <button class="tp-btn" :disabled="savingPromo" @click="emit('update:renamingPromoId', null)">Annuler</button>
            </template>
            <template v-else>
              <span class="tp-card-name">{{ p.name }}</span>
              <span v-if="activePromoId === p.id" class="tp-badge-active">Active</span>
              <button v-else class="tp-btn tp-btn--sm" @click="emit('update:activePromoId', p.id)">Selectionner</button>
            </template>
          </div>

          <!-- Mini ring chart -->
          <div class="tp-ring-wrap" :title="`${promoStats.get(p.id)?.avgSubmission ?? 0}% soumission`">
            <svg viewBox="0 0 40 40" class="tp-ring-svg">
              <circle cx="20" cy="20" r="18" fill="none" stroke="var(--bg-hover)" stroke-width="3" />
              <circle
                cx="20" cy="20" r="18" fill="none"
                :stroke="p.color"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="ringDash(promoStats.get(p.id)?.avgSubmission ?? 0)"
                :stroke-dashoffset="ringCirc * 0.25"
                style="transition: stroke-dasharray .4s ease"
              />
            </svg>
            <span class="tp-ring-label">{{ promoStats.get(p.id)?.avgSubmission ?? 0 }}%</span>
          </div>
        </div>

        <!-- Stat pills -->
        <div class="tp-stat-pills">
          <span class="tp-pill"><Users :size="11" /> {{ promoStats.get(p.id)?.students ?? 0 }} Etudiants</span>
          <span class="tp-pill"><BookOpen :size="11" /> {{ promoStats.get(p.id)?.published ?? 0 }} Publies</span>
          <span class="tp-pill"><FileText :size="11" /> {{ promoStats.get(p.id)?.drafts ?? 0 }} Brouillons</span>
          <span class="tp-pill tp-pill--accent"><TrendingUp :size="11" /> {{ promoStats.get(p.id)?.avgSubmission ?? 0 }}%</span>
        </div>

        <!-- Actions row -->
        <div class="tp-actions">
          <button class="tp-btn" @click="emit('update:renamingPromoId', p.id); emit('update:renamingPromoValue', p.name)">
            <Edit3 :size="11" /> Renommer
          </button>
          <button class="tp-btn" @click="emit('update:activePromoId', p.id); emit('openClasse')">
            <GraduationCap :size="11" /> Classe
          </button>
          <button class="tp-btn" @click="emit('openImportStudents', p.id)">
            <FileText :size="11" /> Importer
          </button>
          <div class="tp-color-picker-wrap">
            <button class="tp-btn tp-btn--icon" title="Couleur" @click="toggleColorPicker(p.id)">
              <Palette :size="11" />
            </button>
            <div v-if="colorPickerOpenId === p.id" class="tp-color-dropdown">
              <button
                v-for="c in COLOR_OPTIONS"
                :key="c"
                class="tp-color-swatch"
                :class="{ 'tp-color-swatch--active': p.color === c }"
                :style="{ background: c }"
                :title="c"
                @click.stop="selectColor(p.id, c)"
              />
            </div>
          </div>
          <button
            class="tp-btn tp-btn--danger"
            :disabled="deletingPromoId === p.id"
            @click="emit('deletePromo', p.id, p.name)"
          >
            <Trash2 :size="11" /> {{ deletingPromoId === p.id ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>

      <p v-if="filteredPromos.length === 0" class="tp-empty">Aucune promotion active.</p>
    </div>

    <!-- New promo button -->
    <button class="tp-add-btn" @click="emit('openCreatePromo')">
      <PlusCircle :size="13" /> Nouvelle promotion
    </button>

    <!-- Click outside to close color picker -->
    <div v-if="colorPickerOpenId !== null" class="tp-backdrop" @click="colorPickerOpenId = null" />
  </div>
</template>

<style scoped>
.db-tab-content { display: flex; flex-direction: column; gap: 14px; }

/* ── Promo list ── */
.tp-promo-list { display: flex; flex-direction: column; gap: 10px; }

/* ── Card ── */
.tp-card {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px; transition: border-color var(--t-fast), box-shadow var(--t-fast);
  border-left: 3px solid var(--promo-color, var(--border));
}
.tp-card--active {
  border-color: var(--accent); background: rgba(74,144,217,.04);
  box-shadow: 0 0 0 1px rgba(74,144,217,.12);
}

/* ── Card header ── */
.tp-card-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 10px;
}
.tp-card-identity { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.tp-card-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.tp-card-name { font-size: 15px; font-weight: 700; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-badge-active {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  padding: 2px 8px; border-radius: 10px;
  background: rgba(74,144,217,.15); color: var(--accent);
}

/* ── Ring chart ── */
.tp-ring-wrap {
  position: relative; width: 44px; height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.tp-ring-svg { width: 44px; height: 44px; transform: rotate(-90deg); }
.tp-ring-label {
  position: absolute; font-size: 10px; font-weight: 700; color: var(--text-primary);
}

/* ── Stat pills ── */
.tp-stat-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tp-pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 3px 8px;
  border-radius: 12px; background: var(--bg-hover);
  color: var(--text-secondary); white-space: nowrap;
}
.tp-pill--accent { background: rgba(74,144,217,.1); color: var(--accent); }

/* ── Actions ── */
.tp-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

/* ── Color picker ── */
.tp-color-picker-wrap { position: relative; }
.tp-color-dropdown {
  position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  display: flex; gap: 4px; flex-wrap: wrap; padding: 8px;
  background: var(--bg-modal, var(--bg-elevated)); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: var(--shadow-lg, 0 4px 20px rgba(0,0,0,.25));
  z-index: 20; width: 140px;
}
.tp-color-swatch {
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent;
  cursor: pointer; transition: transform .12s, border-color .12s;
  flex-shrink: 0;
}
.tp-color-swatch:hover { transform: scale(1.2); }
.tp-color-swatch--active { border-color: var(--text-primary); }

/* ── Backdrop for closing color picker ── */
.tp-backdrop { position: fixed; inset: 0; z-index: 15; }

/* ── Buttons ── */
.tp-btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px;
  background: var(--bg-hover); color: var(--text-secondary);
  border: 1px solid var(--border-input); cursor: pointer; font-family: var(--font);
  transition: all var(--t-fast); white-space: nowrap;
}
.tp-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
.tp-btn--sm { font-size: 10px; padding: 2px 7px; border-radius: 4px; }
.tp-btn--accent { background: var(--accent); color: #fff; border-color: var(--accent); }
.tp-btn--accent:hover { opacity: .9; }
.tp-btn--danger { color: var(--color-danger, #f87171); }
.tp-btn--danger:hover { background: rgba(248,113,113,.1); }
.tp-btn--icon { padding: 4px 6px; }

/* ── Rename input ── */
.tp-rename-input {
  flex: 1; font-size: 14px; font-weight: 600; padding: 3px 8px;
  background: var(--bg-input); border: 1px solid var(--accent); border-radius: 6px;
  color: var(--text-primary); font-family: var(--font); outline: none;
}

/* ── Add button ── */
.tp-add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; padding: 6px 14px; flex-shrink: 0;
  color: var(--text-muted);
  border: 1.5px dashed var(--border-input); border-radius: 20px;
  background: none; cursor: pointer; font-family: var(--font);
  transition: all .15s ease; align-self: flex-start;
}
.tp-add-btn:hover { color: var(--accent); border-color: var(--accent); background: rgba(74,144,217,.07); }

/* ── Empty state ── */
.tp-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 24px 0; }

/* Screen reader only */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>
