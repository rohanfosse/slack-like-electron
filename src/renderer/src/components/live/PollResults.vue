<!-- PollResults.vue - Liste des réponses textuelles groupées par fréquence -->
<script setup lang="ts">
  import type { LiveResults } from '@/types'

  defineProps<{ results: LiveResults }>()
</script>

<template>
  <div class="poll-results">
    <div class="poll-total">{{ results.totalResponses }} réponse{{ results.totalResponses > 1 ? 's' : '' }}</div>
    <TransitionGroup name="poll-item" tag="div" class="poll-list">
      <div v-for="(row, i) in results.data" :key="row.text ?? row.option ?? i" class="poll-row">
        <span class="poll-text">{{ row.text ?? row.option ?? '-' }}</span>
        <span class="poll-badge">{{ row.count }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.poll-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.poll-total {
  font-size: 15px;
  color: var(--text-muted, #888);
  font-weight: 600;
  text-align: center;
}
.poll-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.poll-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border-radius: 10px;
  border: 1px solid var(--border);
}
.poll-text {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-primary, #fff);
}
.poll-badge {
  font-size: 14px;
  font-weight: 800;
  color: var(--accent, #4a90d9);
  background: rgba(74,144,217,.12);
  padding: 4px 12px;
  border-radius: 20px;
  min-width: 32px;
  text-align: center;
}
/* Transition for new answers sliding in */
.poll-item-enter-active {
  transition: all .4s cubic-bezier(.34,1.56,.64,1);
}
.poll-item-leave-active {
  transition: all var(--motion-base) var(--ease-out);
}
.poll-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.poll-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
