/**
 * WidgetGrades.vue - Liste compacte des dernières notes.
 */
<script setup lang="ts">
import { Award } from 'lucide-vue-next'
import { gradeBadgeClass } from '@/utils/grade'
import EmptyState from '@/components/ui/EmptyState.vue'

export interface GradeEntry {
  title: string
  note: string
  category?: string | null
}

defineProps<{ grades: GradeEntry[] }>()
</script>

<template>
  <div class="dashboard-card sa-card sa-grades">
    <div class="sa-card-header">
      <Award :size="14" class="sa-card-icon sa-icon--grades" />
      <span class="sa-section-label">Mes notes</span>
    </div>
    <div v-if="grades.length" class="sa-grades-list">
      <div v-for="(g, i) in grades.slice(0, 4)" :key="i" class="sa-grade-item">
        <span class="sa-grade-badge" :class="gradeBadgeClass(g.note)">{{ g.note }}</span>
        <span class="sa-grade-title">{{ g.title }}</span>
      </div>
    </div>
    <EmptyState v-else title="Aucune note pour l'instant" compact />
  </div>
</template>

<style scoped>
.sa-grades { border-left: 3px solid var(--color-grade, #f59e0b); }
.sa-icon--grades { color: var(--color-grade, #f59e0b); }

.sa-grades-list { display: flex; flex-direction: column; gap: 6px; }

.sa-grade-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.sa-grade-badge {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 11px;
  font-weight: 700;
  min-width: 28px;
  text-align: center;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.grade--green  { background: rgba(74, 222, 128, .15); color: #22c55e; }
.grade--blue   { background: rgba(59, 130, 246, .15); color: #3b82f6; }
.grade--orange { background: rgba(245, 158, 11, .15); color: #f59e0b; }
.grade--red    { background: rgba(239, 68, 68, .15);  color: #ef4444; }

.sa-grade-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* .sa-empty in devoirs-shared.css */
</style>
