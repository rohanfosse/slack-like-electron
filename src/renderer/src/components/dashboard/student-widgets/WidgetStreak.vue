<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { Flame, Trophy } from 'lucide-vue-next'
  import { useStreak } from '@/composables/useStreak'
  import { useAppStore } from '@/stores/app'
  import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

  const appStore = useAppStore()
  const { current, longest, isActiveToday, loading, load } = useStreak()

  const tone = computed<'none' | 'warning' | 'danger'>(() => {
    if (isActiveToday.value) return 'danger'
    if (current.value > 0) return 'warning'
    return 'none'
  })

  onMounted(() => {
    if (appStore.currentUser?.id) load(appStore.currentUser.id)
  })
</script>

<template>
  <UiWidgetCard
    :icon="Flame"
    label="Streak"
    :tone="tone"
    aria-label="Streak d'activite consecutive"
  >
    <div class="ws-body">
      <div class="ws-flame" :class="{ 'ws-flame--active': current > 0, 'ws-flame--today': isActiveToday }">
        <Flame :size="28" />
      </div>

      <div v-if="loading" class="ws-loading">...</div>
      <template v-else>
        <span class="ws-count">{{ current }}</span>
        <span class="ws-label">jour{{ current > 1 ? 's' : '' }} d'affilée</span>
        <div v-if="longest > 0" class="ws-best">
          <Trophy :size="10" /> Record : {{ longest }}j
        </div>
        <div v-if="!isActiveToday && current > 0" class="ws-nudge">
          Fais quelque chose aujourd'hui pour garder ton streak !
        </div>
      </template>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.ws-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  text-align: center;
  padding: var(--space-sm) 0;
}

.ws-flame {
  color: var(--text-muted);
  transition: color var(--motion-base) var(--ease-out), filter var(--motion-base) var(--ease-out);
}

.ws-flame--active { color: var(--color-warning); }

.ws-flame--today {
  color: var(--color-danger);
  filter: drop-shadow(0 0 8px rgba(var(--color-danger-rgb), 0.4));
  animation: ws-pulse 2s infinite;
}

@keyframes ws-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(var(--color-danger-rgb), 0.4)); }
  50%      { filter: drop-shadow(0 0 16px rgba(var(--color-danger-rgb), 0.6)); }
}

.ws-count {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-family: var(--font);
  letter-spacing: -1px;
}

.ws-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ws-best {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

.ws-best svg { color: var(--color-warning); }

.ws-nudge {
  font-size: var(--text-2xs);
  color: var(--color-warning);
  margin-top: var(--space-xs);
  max-width: 120px;
  line-height: 1.3;
}

.ws-loading { font-size: var(--text-xs); color: var(--text-muted); }

@media (prefers-reduced-motion: reduce) {
  .ws-flame--today { animation: none; }
}
</style>
