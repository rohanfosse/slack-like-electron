<script setup lang="ts">
import { Award } from 'lucide-vue-next'
import { gradeBadgeClass } from '@/utils/grade'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

export interface GradeEntry {
  title: string
  note: string
  category?: string | null
}

defineProps<{ grades: GradeEntry[] }>()
</script>

<template>
  <UiWidgetCard
    :icon="Award"
    label="Mes notes"
    accent-color="var(--color-grade-warm)"
  >
    <div v-if="grades.length" class="wg-list">
      <div v-for="(g, i) in grades.slice(0, 4)" :key="i" class="wg-item">
        <span class="wg-badge" :class="gradeBadgeClass(g.note)">{{ g.note }}</span>
        <span class="wg-title">{{ g.title }}</span>
      </div>
    </div>
    <EmptyState v-else title="Aucune note pour l'instant" compact />
  </UiWidgetCard>
</template>

<style scoped>
.wg-list { display: flex; flex-direction: column; gap: var(--space-xs); }

.wg-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.wg-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  min-width: 28px;
  text-align: center;
  padding: 2px var(--space-xs);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}

.grade--green  { background: rgba(var(--color-success-rgb), .15); color: var(--color-success); }
.grade--blue   { background: rgba(var(--accent-rgb), .15);        color: var(--accent); }
.grade--orange { background: rgba(var(--color-warning-rgb), .15); color: var(--color-warning); }
.grade--red    { background: rgba(var(--color-danger-rgb), .15);  color: var(--color-danger); }

.wg-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
