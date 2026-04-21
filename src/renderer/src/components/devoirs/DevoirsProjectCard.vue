/**
 * Carte projet partagee entre les vues d'accueil prof et etudiant.
 * Affiche : nom de projet, pills de types, barre de progression, prochaine echeance.
 *
 * Migre vers UiCard en v2.56.0 (cf. design-system/cursus/MASTER.md §7).
 */
<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Clock, FolderOpen, Award } from 'lucide-vue-next'
import { deadlineClass, deadlineLabel } from '@/utils/date'
import { typeLabel } from '@/utils/devoir'
import { parseCategoryIcon } from '@/utils/categoryIcon'
import UiCard from '@/components/ui/UiCard.vue'

const props = defineProps<{
  name: string
  typeCounts: { type: string; count: number }[]
  submitted: number
  total: number
  pct: number
  toGrade?: number
  drafts?: number
  devoirCount: number
  nextDeadline?: string | null
  gradedCount?: number
  bestGrade?: string | null
}>()

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const parsed = computed(() => parseCategoryIcon(props.name))
</script>

<template>
  <UiCard interactive padding="sm" @click="(ev) => emit('click', ev)">
    <div class="dpc-header">
      <component :is="parsed.icon" v-if="parsed.icon" :size="15" class="dpc-icon" />
      <FolderOpen v-else :size="15" class="dpc-icon" />
      <span class="dpc-name" :title="parsed.label">{{ parsed.label }}</span>
      <ChevronRight :size="13" class="dpc-chevron" />
    </div>

    <!-- Types de devoirs dans ce projet -->
    <div class="dpc-types">
      <span v-for="tl in typeCounts" :key="tl.type" class="devoir-type-badge" :class="`type-${tl.type}`">
        {{ tl.count }} {{ typeLabel(tl.type) }}
      </span>
    </div>

    <!-- Stats compactes : "N/M soumis · K à noter" + barre progression sur une ligne -->
    <div v-if="total > 0" class="dpc-stats-row">
      <span class="dpc-submitted">{{ submitted }}/{{ total }}</span>
      <div class="dv-progress dpc-progress">
        <div class="dv-progress-fill" :style="{ width: pct + '%' }" />
      </div>
      <span v-if="toGrade && toGrade > 0" class="dpc-stat-warn">{{ toGrade }} à noter</span>
    </div>
    <div v-else class="dpc-stats-row dpc-stats-row--empty">
      <span class="dpc-stat-info">Aucun dépôt attendu</span>
    </div>

    <!-- Footer compact -->
    <div class="dpc-footer">
      <span class="dpc-total">{{ devoirCount }} devoir{{ devoirCount > 1 ? 's' : '' }}</span>
      <span v-if="drafts && drafts > 0" class="dpc-drafts">{{ drafts }} brouillon{{ drafts > 1 ? 's' : '' }}</span>
      <span v-if="nextDeadline" class="dpc-next deadline-badge" :class="deadlineClass(nextDeadline)">
        <Clock :size="10" /> {{ deadlineLabel(nextDeadline) }}
      </span>
    </div>
  </UiCard>
</template>

<style scoped>
.dpc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}
.dpc-icon { color: var(--text-muted); flex-shrink: 0; }
.dpc-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dpc-chevron {
  color: var(--text-muted);
  opacity: .4;
  transition: opacity var(--motion-fast) var(--ease-out),
              color var(--motion-fast) var(--ease-out);
}
:deep(.ui-card--interactive:hover) .dpc-chevron {
  opacity: 1;
  color: var(--accent);
}

.dpc-types {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

/* Stats sur UNE ligne : N/M + barre de progression + "K a noter" */
.dpc-stats-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}
.dpc-stats-row--empty { color: var(--text-muted); }
.dpc-submitted { font-weight: 600; color: var(--text-secondary); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.dpc-progress { flex: 1; margin: 0; min-width: 40px; }
.dpc-stat-warn { color: var(--color-warning); font-weight: 600; flex-shrink: 0; font-size: 11px; }
.dpc-stat-info { color: var(--text-muted); font-style: italic; font-size: 11px; }

.dpc-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-muted);
}
.dpc-total { font-weight: 600; }
.dpc-drafts { color: var(--text-muted); font-style: italic; }
.dpc-next { font-size: 10px; margin-left: auto; }
</style>
