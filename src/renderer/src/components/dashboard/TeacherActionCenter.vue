/**
 * TeacherActionCenter.vue
 * ---------------------------------------------------------------------------
 * Action items list, class health ring, and submission trend sparkline.
 */
<script setup lang="ts">
import {
  AlertTriangle, Edit3, Clock, FileText, ChevronRight, TrendingUp,
} from 'lucide-vue-next'

defineProps<{
  actionItems: { id: string; type: string; title: string; subtitle: string; urgency: string; action: () => void }[]
  classHealth: { score: number; color: string; label: string; avgSubmission: number } | null
  submissionTrend: { days: { label: string; count: number }[]; maxCount: number }
}>()
</script>

<template>
  <div v-if="actionItems.length || classHealth" class="db-action-row">

    <!-- Centre d'action -->
    <div v-if="actionItems.length" class="db-action-center">
      <h4 class="db-section-title"><AlertTriangle :size="14" /> Actions requises</h4>
      <div class="db-action-list">
        <button
          v-for="item in actionItems"
          :key="item.id"
          class="db-action-item"
          :class="'db-action-' + item.urgency"
          @click="item.action()"
        >
          <span class="db-action-badge" :class="'db-badge-' + item.type">
            <Edit3 v-if="item.type === 'grade'" :size="11" />
            <Clock v-else-if="item.type === 'deadline'" :size="11" />
            <FileText v-else-if="item.type === 'draft'" :size="11" />
            <AlertTriangle v-else :size="11" />
          </span>
          <div class="db-action-text">
            <span class="db-action-title">{{ item.title }}</span>
            <span class="db-action-sub">{{ item.subtitle }}</span>
          </div>
          <ChevronRight :size="12" class="db-action-arrow" />
        </button>
      </div>
    </div>

    <!-- Santé de la classe -->
    <div v-if="classHealth" class="db-class-health">
      <h4 class="db-section-title"><TrendingUp :size="14" /> Santé de la classe</h4>
      <div class="db-health-ring-wrap">
        <svg class="db-health-ring" viewBox="0 0 80 80" role="img" :aria-label="`Santé de la classe : ${classHealth.score}%`">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6" />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            :stroke="classHealth.color"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="`${classHealth.score * 2.136} 213.6`"
            transform="rotate(-90 40 40)"
            style="transition: stroke-dasharray .6s ease"
          />
        </svg>
        <div class="db-health-score">
          <span class="db-health-value" :style="{ color: classHealth.color }">{{ classHealth.score }}</span>
          <span class="db-health-unit">%</span>
        </div>
      </div>
      <span class="db-health-label" :style="{ color: classHealth.color }">{{ classHealth.label }}</span>
      <span class="db-health-detail">Taux de soumission moyen : {{ classHealth.avgSubmission }}%</span>

      <!-- Mini sparkline des soumissions des 7 derniers jours -->
      <div v-if="submissionTrend.days.some(d => d.count > 0)" class="db-trend">
        <span class="db-trend-title">Rendus cette semaine</span>
        <div class="db-trend-bars">
          <div v-for="d in submissionTrend.days" :key="d.label" class="db-trend-col">
            <div class="db-trend-bar-bg">
              <div
                class="db-trend-bar-fill"
                :style="{ height: (d.count / submissionTrend.maxCount * 100) + '%' }"
              />
            </div>
            <span class="db-trend-label">{{ d.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Section title ── */
.db-section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; color: var(--text-secondary); margin: 0 0 10px;
}

/* ── Centre d'action + Santé classe (row layout) ── */
.db-action-row {
  display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start;
}
@media (max-width: 768px) { .db-action-row { grid-template-columns: 1fr; } }

.db-action-center { min-width: 0; }
.db-action-list { display: flex; flex-direction: column; gap: 4px; }
.db-action-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: var(--bg-elevated, rgba(255,255,255,.04));
  border: 1px solid var(--border); border-radius: 10px;
  cursor: pointer; transition: all .15s ease; text-align: left; width: 100%;
}
.db-action-item:hover { background: rgba(255,255,255,.07); border-color: var(--accent); }
.db-action-critical { border-left: 3px solid #ef4444; }
.db-action-warning  { border-left: 3px solid #f59e0b; }
.db-action-info     { border-left: 3px solid var(--accent); }

.db-action-badge {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.db-badge-grade    { background: rgba(239,68,68,.15); color: #ef4444; }
.db-badge-deadline { background: rgba(245,158,11,.15); color: #f59e0b; }
.db-badge-draft    { background: rgba(74,144,217,.15); color: var(--accent); }
.db-badge-late     { background: rgba(239,68,68,.2); color: #ef4444; }

.db-action-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.db-action-title { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db-action-sub   { font-size: 11.5px; color: var(--text-muted); }
.db-action-arrow { color: var(--text-muted); flex-shrink: 0; opacity: 0; transition: opacity .15s; }
.db-action-item:hover .db-action-arrow { opacity: 1; }

/* ── Santé de la classe ── */
.db-class-health {
  background: var(--bg-elevated, rgba(255,255,255,.04));
  border: 1px solid var(--border); border-radius: 12px; padding: 16px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.db-health-ring-wrap { position: relative; width: 80px; height: 80px; margin: 4px 0; }
.db-health-ring { width: 100%; height: 100%; }
.db-health-score {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center; gap: 1px;
}
.db-health-value { font-size: 22px; font-weight: 800; }
.db-health-unit  { font-size: 11px; font-weight: 600; margin-top: 4px; }
.db-health-label  { font-size: 13px; font-weight: 700; margin-top: 2px; }
.db-health-detail { font-size: 11px; color: var(--text-muted); text-align: center; }

/* ── Tendance soumissions (sparkline) ── */
.db-trend { margin-top: 12px; width: 100%; }
.db-trend-title { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 6px; text-align: center; }
.db-trend-bars { display: flex; gap: 4px; justify-content: center; height: 40px; align-items: flex-end; }
.db-trend-col { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; min-width: 0; }
.db-trend-bar-bg {
  width: 100%; max-width: 22px; height: 32px;
  background: rgba(255,255,255,.05); border-radius: 3px;
  display: flex; align-items: flex-end; overflow: hidden;
}
.db-trend-bar-fill { width: 100%; background: var(--accent); border-radius: 3px; min-height: 2px; transition: height .3s ease; }
.db-trend-label { font-size: 9px; color: var(--text-muted); text-transform: capitalize; }
</style>
