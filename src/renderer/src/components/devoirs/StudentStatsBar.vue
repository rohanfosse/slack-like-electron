/**
 * Barre de statistiques étudiant : total, à rendre, urgent, rendus.
 * Chaque chip est cliquable et fait défiler la page jusqu'au groupe correspondant.
 */
<script setup lang="ts">
defineProps<{
  stats: { total: number; pending: number; urgent: number; submitted: number }
}>()

type Target = 'top' | 'urgent' | 'pending' | 'submitted'

const GROUP_CLASS: Record<Exclude<Target, 'top'>, string> = {
  urgent:    'group-header--warning',
  pending:   'group-header--accent',
  submitted: 'group-header--success',
}

function scrollTo(target: Target) {
  if (target === 'top') {
    const scrollArea = document.querySelector('.devoirs-scroll-area') as HTMLElement | null
    scrollArea?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const el = document.querySelector(`.${GROUP_CLASS[target]}`) as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.animate(
    [
      { boxShadow: '0 0 0 2px var(--accent)' },
      { boxShadow: '0 0 0 0 transparent' },
    ],
    { duration: 900, easing: 'ease-out' },
  )
}
</script>

<template>
  <div class="student-stats-bar">
    <button type="button" class="stat-chip stat-chip-neutral" :disabled="stats.total === 0" @click="scrollTo('top')">
      <span class="stat-dot dot-neutral" />
      <strong>{{ stats.total }}</strong>&nbsp;total
    </button>
    <button type="button" class="stat-chip stat-chip-blue" :disabled="stats.pending === 0" @click="scrollTo('pending')">
      <span class="stat-dot dot-blue" />
      <strong>{{ stats.pending }}</strong>&nbsp;à rendre
    </button>
    <button type="button" class="stat-chip stat-chip-red" :disabled="stats.urgent === 0" @click="scrollTo('urgent')">
      <span class="stat-dot dot-red" />
      <strong>{{ stats.urgent }}</strong>&nbsp;urgent
    </button>
    <button type="button" class="stat-chip stat-chip-green" :disabled="stats.submitted === 0" @click="scrollTo('submitted')">
      <span class="stat-dot dot-green" />
      <strong>{{ stats.submitted }}</strong>&nbsp;rendu{{ stats.submitted > 1 ? 's' : '' }}
    </button>
  </div>
</template>

<style scoped>
.student-stats-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: var(--font);
  transition: transform .12s ease, filter .12s ease;
}
.stat-chip:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.stat-chip:disabled { cursor: default; opacity: .7; }
.stat-chip strong { font-weight: 700; }

.stat-chip-neutral { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }
.stat-chip-blue    { background: rgba(var(--accent-rgb),0.12);  border-color: rgba(var(--accent-rgb),0.2);   color: var(--accent-light); }
.stat-chip-red     { background: rgba(231, 76, 60, 0.12);   border-color: rgba(231, 76, 60, 0.2);    color: var(--color-danger); }
.stat-chip-green   { background: rgba(39, 174, 96, 0.12);   border-color: rgba(39, 174, 96, 0.2);    color: var(--color-success); }

.stat-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-neutral { background: var(--text-muted); }
.dot-blue    { background: var(--accent); }
.dot-red     { background: var(--color-danger); }
.dot-green   { background: var(--color-success); }

@media (max-width: 400px) {
  .student-stats-bar { padding: 6px 10px; gap: 4px; }
  .stat-chip { padding: 3px 7px; font-size: 11px; gap: 4px; }
}
</style>
