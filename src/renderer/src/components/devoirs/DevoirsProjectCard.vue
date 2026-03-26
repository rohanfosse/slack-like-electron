/**
 * Shared project card for both teacher and student accueil views.
 * Displays project name, type pills, progress bar, and next deadline.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Clock, FolderOpen } from 'lucide-vue-next'
import { deadlineClass, deadlineLabel } from '@/utils/date'
import { typeLabel } from '@/utils/devoir'
import { parseCategoryIcon } from '@/utils/categoryIcon'

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
}>()

const parsed = computed(() => parseCategoryIcon(props.name))
</script>

<template>
  <div class="dv-proj-card">
    <div class="dv-proj-card-header">
      <component :is="parsed.icon" v-if="parsed.icon" :size="16" class="dv-proj-card-icon" />
      <FolderOpen v-else :size="16" class="dv-proj-card-icon" />
      <span class="dv-proj-card-name">{{ parsed.label }}</span>
      <ChevronRight :size="14" class="dv-proj-card-chevron" />
    </div>

    <!-- Types de devoirs dans ce projet -->
    <div class="dv-proj-card-types">
      <span v-for="tl in typeCounts" :key="tl.type" class="devoir-type-badge" :class="`type-${tl.type}`">
        {{ tl.count }} {{ typeLabel(tl.type) }}
      </span>
    </div>

    <!-- Stats -->
    <div class="dv-proj-card-stats-row">
      <template v-if="total > 0">
        <span>{{ submitted }}/{{ total }} soumis</span>
        <span v-if="toGrade && toGrade > 0" class="dv-proj-stat-warn">{{ toGrade }} à noter</span>
      </template>
      <span v-else class="dv-proj-stat-info">Aucun dépôt attendu</span>
    </div>

    <!-- Barre de progression -->
    <div v-if="total > 0" class="dv-progress dv-proj-card-progress">
      <div class="dv-progress-fill" :style="{ width: pct + '%' }" />
    </div>

    <!-- Footer -->
    <div class="dv-proj-card-footer">
      <span class="dv-proj-card-total">{{ devoirCount }} devoir{{ devoirCount > 1 ? 's' : '' }}</span>
      <span v-if="drafts && drafts > 0" class="dv-proj-card-drafts">{{ drafts }} brouillon{{ drafts > 1 ? 's' : '' }}</span>
      <span v-if="nextDeadline" class="dv-proj-card-next deadline-badge" :class="deadlineClass(nextDeadline)">
        <Clock :size="10" /> {{ deadlineLabel(nextDeadline) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.dv-proj-card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.dv-proj-card-icon { color: var(--text-muted); flex-shrink: 0; }
.dv-proj-card-name { font-size: 15px; font-weight: 700; color: var(--text-primary); flex: 1; min-width: 0; }
.dv-proj-card-chevron { color: var(--text-muted); opacity: .4; transition: opacity .15s; }
.dv-proj-card:hover .dv-proj-card-chevron { opacity: 1; color: var(--accent); }

.dv-proj-card-types { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; }

.dv-proj-card-stats-row {
  display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; flex-wrap: wrap;
}
.dv-proj-stat-warn { color: var(--color-warning); font-weight: 600; }
.dv-proj-stat-info { color: var(--text-muted); font-style: italic; font-size: 11px; }

.dv-proj-card-progress { margin-bottom: 12px; }

.dv-proj-card-footer {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: 12px; color: var(--text-muted);
}
.dv-proj-card-total { font-weight: 600; }
.dv-proj-card-drafts { color: var(--text-muted); font-style: italic; }
.dv-proj-card-next { font-size: 10px; margin-left: auto; }
</style>
