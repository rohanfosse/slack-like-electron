<script setup lang="ts">
  import { onMounted } from 'vue'
  import { Flame, Trophy } from 'lucide-vue-next'
  import { useStreak } from '@/composables/useStreak'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
  const { current, longest, isActiveToday, loading, load } = useStreak()

  onMounted(() => {
    if (appStore.currentUser?.id) load(appStore.currentUser.id)
  })
</script>

<template>
  <div class="streak-widget">
    <div class="streak-flame" :class="{ 'streak-flame--active': current > 0, 'streak-flame--today': isActiveToday }">
      <Flame :size="28" />
    </div>

    <div v-if="loading" class="streak-loading">...</div>
    <template v-else>
      <span class="streak-count">{{ current }}</span>
      <span class="streak-label">jour{{ current > 1 ? 's' : '' }} d'affilee</span>
      <div v-if="longest > 0" class="streak-best">
        <Trophy :size="10" /> Record : {{ longest }}j
      </div>
      <div v-if="!isActiveToday && current > 0" class="streak-nudge">
        Fait quelque chose aujourd'hui pour garder ton streak !
      </div>
    </template>
  </div>
</template>

<style scoped>
.streak-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  padding: 8px;
}

.streak-flame {
  color: var(--text-muted);
  transition: color var(--t-base), filter var(--t-base);
}

.streak-flame--active { color: #F59E0B; }

.streak-flame--today {
  color: #EF4444;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.4));
  animation: streakPulse 2s infinite;
}

@keyframes streakPulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.4)); }
  50% { filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.6)); }
}

.streak-count {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-family: 'Inter Variable', 'Inter', monospace;
  letter-spacing: -1px;
}

.streak-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.streak-best {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

.streak-best svg { color: #F59E0B; }

.streak-nudge {
  font-size: 10px;
  color: var(--color-warning);
  margin-top: 4px;
  max-width: 120px;
  line-height: 1.3;
}

.streak-loading { font-size: 11px; color: var(--text-muted); }

@media (prefers-reduced-motion: reduce) {
  .streak-flame--today { animation: none; }
}
</style>
