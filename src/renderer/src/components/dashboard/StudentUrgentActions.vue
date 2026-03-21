/**
 * StudentUrgentActions.vue
 * Displays the top 3 upcoming devoirs or an "all done" state
 * when the student has no pending assignments.
 */
<script setup lang="ts">
import { Clock, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-vue-next'

defineProps<{
  urgentActions: { id: number; title: string; isOverdue: boolean; urgency: string; category?: string | null }[]
  hasDevoirsLoaded: boolean
}>()

const emit = defineEmits<{
  goToProject: [key: string]
}>()
</script>

<template>
  <div v-if="urgentActions.length" class="db-urgent-list">
    <h4 class="db-urgent-title"><Clock :size="14" /> À rendre prochainement</h4>
    <div v-for="ua in urgentActions" :key="ua.id" class="db-urgent-item" :class="{ 'db-urgent-item--overdue': ua.isOverdue }" @click="emit('goToProject', ua.category ?? '')">
      <AlertTriangle v-if="ua.isOverdue" :size="14" class="db-urgent-icon--danger" />
      <Clock v-else :size="14" style="opacity:.5" />
      <span class="db-urgent-item-title">{{ ua.title }}</span>
      <span class="db-urgent-item-urgency" :class="{ 'text-danger': ua.isOverdue }">{{ ua.urgency }}</span>
      <ChevronRight :size="12" style="opacity:.3" />
    </div>
  </div>
  <div v-else-if="hasDevoirsLoaded" class="db-all-done">
    <CheckCircle2 :size="18" style="color:var(--color-success)" />
    <span>Tout est à jour ! Aucun devoir en attente.</span>
  </div>
</template>

<style scoped>
.db-urgent-list { margin-bottom: 16px; }
.db-urgent-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px;
}
.db-urgent-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,.02); transition: background .15s;
  margin-bottom: 4px; font-size: 13px; color: var(--text-primary);
}
.db-urgent-item:hover { background: rgba(255,255,255,.06); }
.db-urgent-item--overdue { background: rgba(231,76,60,.06); }
.db-urgent-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-urgent-item-urgency { font-size: 11px; font-weight: 600; color: var(--text-muted); flex-shrink: 0; }
.db-urgent-icon--danger { color: var(--color-danger); }
.text-danger { color: var(--color-danger) !important; }

.db-all-done {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; background: rgba(46,204,113,.08);
  border: 1px solid rgba(46,204,113,.2); border-radius: var(--radius);
  margin-bottom: 16px; font-size: 14px; font-weight: 600; color: var(--text-secondary);
}
</style>
