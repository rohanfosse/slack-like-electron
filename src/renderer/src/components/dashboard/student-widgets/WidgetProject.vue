<script setup lang="ts">
import { FolderOpen, ChevronRight, Clock } from 'lucide-vue-next'
import { deadlineLabel } from '@/utils/date'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'
import MicroRing from '@/components/ui/MicroRing.vue'
import CountdownArc from '@/components/ui/CountdownArc.vue'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

const props = defineProps<{
  project: StudentProjectCard | null
}>()

const emit = defineEmits<{
  goToProject: [key: string]
}>()
</script>

<template>
  <UiWidgetCard
    v-if="project"
    :icon="project.icon ?? FolderOpen"
    label="Projet en cours"
    interactive
    aria-label="Voir le projet en cours"
    @click="emit('goToProject', project.key)"
  >
    <template #header-extra>
      <ChevronRight :size="13" class="wp-chevron" />
    </template>

    <h3 class="wp-name">{{ project.label }}</h3>
    <div class="wp-meta">
      <MicroRing :value="project.submitted" :total="project.total" :size="22" />
      <span class="wp-mono">{{ project.submitted }}/{{ project.total }} rendus</span>
      <span v-if="project.overdue" class="wp-badge wp-badge--danger">{{ project.overdue }} en retard</span>
    </div>
    <div v-if="project.nextDeadline" class="wp-deadline">
      <CountdownArc :deadline="project.nextDeadline" :size="20" />
      <Clock :size="12" />
      <span>Prochaine échéance : <strong class="wp-mono">{{ deadlineLabel(project.nextDeadline) }}</strong></span>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wp-mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
.wp-chevron { color: var(--text-muted); }

.wp-name {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
  line-height: 1.2;
}
.wp-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.wp-deadline {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.wp-badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 700;
  padding: 2px var(--space-xs);
  border-radius: var(--radius-xs);
}
.wp-badge--danger {
  background: rgba(var(--color-danger-rgb), .12);
  color: var(--color-danger);
}
</style>
