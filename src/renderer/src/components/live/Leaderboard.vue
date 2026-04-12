/** Leaderboard.vue - Classement en direct style Kahoot (top 5) */
<script setup lang="ts">
  import { computed } from 'vue'
  import type { LeaderboardEntry } from '@/types'

  const props = defineProps<{
    entries: LeaderboardEntry[]
  }>()

  const top5 = computed(() => props.entries.slice(0, 5))

  function medal(rank: number): string {
    if (rank === 1) return '\u{1F947}'
    if (rank === 2) return '\u{1F948}'
    if (rank === 3) return '\u{1F949}'
    return String(rank)
  }
</script>

<template>
  <div class="leaderboard">
    <h3 class="lb-title">Classement</h3>
    <TransitionGroup name="lb-row" tag="div" class="lb-list">
      <div
        v-for="entry in top5"
        :key="entry.studentId"
        class="lb-row"
        :class="{ 'lb-first': entry.rank === 1 }"
      >
        <span class="lb-rank">{{ medal(entry.rank) }}</span>
        <span class="lb-name">{{ entry.name }}</span>
        <span class="lb-points">{{ entry.points.toLocaleString() }}</span>
        <span v-if="entry.pointsThisRound && entry.pointsThisRound > 0" class="lb-round-pts">
          +{{ entry.pointsThisRound }}
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.leaderboard {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lb-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary, #aaa);
  text-transform: uppercase;
  letter-spacing: .5px;
  text-align: center;
  margin-bottom: 4px;
}
.lb-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}
.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.4s cubic-bezier(.25,.8,.25,1);
}
.lb-row.lb-first {
  background: linear-gradient(135deg, rgba(234,179,8,.12), rgba(234,179,8,.04));
  border-color: rgba(234,179,8,.25);
}
.lb-rank {
  width: 36px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  flex-shrink: 0;
}
.lb-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb-points {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.lb-round-pts {
  font-size: 13px;
  font-weight: 700;
  color: #22c55e;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  min-width: 50px;
  text-align: right;
}

/* TransitionGroup animations */
.lb-row-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.lb-row-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.lb-row-move {
  transition: all 0.4s cubic-bezier(.25,.8,.25,1);
}
</style>
