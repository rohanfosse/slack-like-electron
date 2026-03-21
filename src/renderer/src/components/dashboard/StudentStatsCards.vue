/**
 * StudentStatsCards.vue
 * Displays recent grades row and 4 stat cards: pending, submitted,
 * graded, and most frequent grade.
 */
<script setup lang="ts">
import { Clock, CheckCircle2, Award, TrendingUp } from 'lucide-vue-next'

defineProps<{
  studentStats: { pending: number; submitted: number; graded: number; modeGrade: string | null }
  recentGrades: { title: string; note: string }[]
}>()
</script>

<template>
  <!-- Dernières notes reçues -->
  <div v-if="recentGrades.length" class="db-recent-grades">
    <h4 class="db-urgent-title"><Award :size="14" /> Dernières notes</h4>
    <div class="db-recent-grades-list">
      <div v-for="g in recentGrades" :key="g.title" class="db-recent-grade-item">
        <span class="db-grade-badge" :class="'grade-' + g.note.toLowerCase()">{{ g.note }}</span>
        <span class="db-recent-grade-title">{{ g.title }}</span>
      </div>
    </div>
  </div>

  <!-- Stats étudiant -->
  <div class="db-stats">
    <div class="db-stat-card db-stat-warning">
      <span class="db-stat-value">{{ studentStats.pending }}</span>
      <span class="db-stat-label">À rendre</span>
      <Clock :size="18" class="db-stat-icon" />
    </div>
    <div class="db-stat-card db-stat-accent">
      <span class="db-stat-value">{{ studentStats.submitted }}</span>
      <span class="db-stat-label">Rendus déposés</span>
      <CheckCircle2 :size="18" class="db-stat-icon" />
    </div>
    <div class="db-stat-card db-stat-success">
      <span class="db-stat-value">{{ studentStats.graded }}</span>
      <span class="db-stat-label">Devoirs notés</span>
      <Award :size="18" class="db-stat-icon" />
    </div>
    <div class="db-stat-card db-stat-neutral">
      <span class="db-stat-value">{{ studentStats.modeGrade ?? '-' }}</span>
      <span class="db-stat-label">Note fréquente</span>
      <TrendingUp :size="18" class="db-stat-icon" />
    </div>
  </div>
</template>

<style scoped>
.db-urgent-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px;
}
.db-recent-grades { margin-bottom: 16px; }
.db-recent-grades-list { display: flex; gap: 8px; flex-wrap: wrap; }
.db-recent-grade-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(255,255,255,.03); font-size: 13px;
}
.db-recent-grade-title { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
.db-grade-badge { font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
.db-grade-badge.grade-a { background: rgba(39,174,96,.15); color: #27ae60; }
.db-grade-badge.grade-b { background: rgba(39,174,96,.08); color: #2ecc71; }
.db-grade-badge.grade-c { background: rgba(243,156,18,.12); color: #e67e22; }
.db-grade-badge.grade-d { background: rgba(231,76,60,.12); color: var(--color-danger); }

/* ── Stats grid ── */
.db-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 900px) { .db-stats { grid-template-columns: repeat(2, 1fr); } }
.db-stat-card {
  position: relative; border-radius: 10px; padding: 16px 18px;
  border: 1px solid var(--border); background: var(--bg-sidebar);
  display: flex; flex-direction: column; gap: 4px; overflow: hidden;
}
.db-stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
.db-stat-label { font-size: 11.5px; color: var(--text-secondary); }
.db-stat-icon  { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); opacity: .18; }
.db-stat-warning { border-color: rgba(243,156,18,.2); }
.db-stat-warning .db-stat-value { color: var(--color-warning); }
.db-stat-warning .db-stat-icon  { color: var(--color-warning); opacity: .3; }
.db-stat-accent  { border-color: rgba(74,144,217,.2); }
.db-stat-accent  .db-stat-value { color: var(--accent-light); }
.db-stat-accent  .db-stat-icon  { color: var(--accent); opacity: .3; }
.db-stat-success { border-color: rgba(39,174,96,.2); }
.db-stat-success .db-stat-value { color: var(--color-success); }
.db-stat-success .db-stat-icon  { color: var(--color-success); opacity: .3; }
.db-stat-neutral .db-stat-value { color: var(--text-primary); }
</style>
