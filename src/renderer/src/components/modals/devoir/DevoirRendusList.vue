<script setup lang="ts">
  import { computed } from 'vue'
  import { CheckCircle2, Clock, XCircle, Star } from 'lucide-vue-next'
  import { avatarColor, initials, formatGrade, gradeClass } from '@/utils/format'
  import ProgressBar from '@/components/ui/ProgressBar.vue'
  import type { Depot } from '@/types'

  interface Props {
    depots: Depot[]
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ 'open-depots': [] }>()

  const submittedDepots = computed(() => props.depots.filter(d => d.submitted_at))
  const notedDepots     = computed(() => props.depots.filter(d => d.note != null))
  const pendingDepots   = computed(() => props.depots.filter(d => !d.submitted_at))
  const totalCount      = computed(() => props.depots.length)
  const submitPct       = computed(() =>
    totalCount.value ? Math.round((submittedDepots.value.length / totalCount.value) * 100) : 0,
  )

  // Grade distribution
  const GRADE_ORDER = ['A', 'B', 'C', 'D', 'NA']
  const gradeDistribution = computed(() => {
    const counts: Record<string, number> = {}
    for (const d of props.depots) {
      if (d.note) counts[d.note] = (counts[d.note] ?? 0) + 1
    }
    return GRADE_ORDER.filter(g => counts[g]).map(g => ({ grade: g, count: counts[g] }))
  })

  // Unified list: submitted first, then pending
  const unifiedList = computed(() => {
    const submitted = submittedDepots.value.map(d => ({ ...d, status: 'submitted' as const }))
    const pending = pendingDepots.value.map(d => ({ ...d, status: 'pending' as const }))
    return [...submitted, ...pending]
  })

  // Show max 8 students, then "voir tous"
  const visibleStudents = computed(() => unifiedList.value.slice(0, 8))
  const hasMore = computed(() => unifiedList.value.length > 8)
</script>

<template>
  <section v-if="totalCount" class="gd-rendus">
    <div class="gd-rendus-header">
      <span class="gd-section-label">Rendus</span>
      <span class="gd-rendus-counts">
        {{ submittedDepots.length }}/{{ totalCount }}
        <template v-if="notedDepots.length"> &middot; {{ notedDepots.length }} note{{ notedDepots.length > 1 ? 's' : '' }}</template>
      </span>
    </div>

    <!-- Compact progress -->
    <div class="gd-rendus-progress">
      <ProgressBar :value="submitPct" />
    </div>

    <!-- Grade distribution -->
    <div v-if="gradeDistribution.length" class="gd-grade-dist">
      <span
        v-for="g in gradeDistribution" :key="g.grade"
        class="grade-dist-pill" :class="gradeClass(g.grade)"
      >{{ g.grade }} <strong>{{ g.count }}</strong></span>
    </div>

    <!-- Unified student list -->
    <div class="gd-student-list">
      <div
        v-for="d in visibleStudents" :key="d.id"
        class="gd-student-row"
        :class="{ 'gd-student-row--pending': d.status === 'pending' }"
      >
        <div
          class="avatar"
          :style="{
            background: avatarColor(d.student_name),
            width: '24px', height: '24px', fontSize: '9px', borderRadius: '5px',
            opacity: d.status === 'pending' ? '.45' : '1',
          }"
        >{{ initials(d.student_name) }}</div>

        <span class="gd-student-name" :class="{ 'text-muted': d.status === 'pending' }">
          {{ d.student_name }}
        </span>

        <!-- Status icon -->
        <template v-if="d.status === 'submitted'">
          <CheckCircle2 :size="13" class="gd-status-icon gd-status-icon--ok" />
        </template>
        <template v-else>
          <Clock :size="13" class="gd-status-icon gd-status-icon--wait" />
        </template>

        <!-- Grade -->
        <span v-if="d.note" class="gd-grade" :class="gradeClass(d.note)">{{ formatGrade(d.note) }}</span>
        <span v-else-if="d.status === 'submitted'" class="gd-no-grade">-</span>

        <!-- Feedback snippet -->
        <span v-if="d.feedback" class="gd-feedback-snippet" :title="d.feedback">{{ d.feedback }}</span>
      </div>
    </div>

    <!-- More button -->
    <button v-if="hasMore" class="gd-link-btn gd-see-all" @click="emit('open-depots')">
      Voir les {{ totalCount }} etudiants &rarr;
    </button>
    <button v-else class="gd-link-btn gd-see-all" @click="emit('open-depots')">
      Gerer les depots &rarr;
    </button>
  </section>

  <!-- Empty state -->
  <section v-else class="gd-rendus gd-rendus--empty">
    <span class="gd-section-label">Rendus</span>
    <p class="gd-empty-text">Aucun etudiant assigne.</p>
  </section>
</template>

<style scoped>
.gd-rendus {
  padding: 0 20px 10px;
}
.gd-rendus-header {
  display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;
}
.gd-section-label {
  font-size: 10px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .4px;
}
.gd-rendus-counts {
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
}
.gd-rendus-progress { margin-bottom: 8px; }

/* Grade distribution */
.gd-grade-dist { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
.grade-dist-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: var(--radius); font-size: 11px; font-weight: 600;
}
.grade-dist-pill.grade-a  { background: rgba(var(--color-success-rgb),.12); color: var(--color-success); }
.grade-dist-pill.grade-b  { background: rgba(var(--color-success-rgb),.07); color: #27ae60; }
.grade-dist-pill.grade-c  { background: rgba(var(--color-warning-rgb),.12); color: var(--color-warning); }
.grade-dist-pill.grade-d  { background: rgba(var(--color-danger-rgb),.12); color: var(--color-danger); }
.grade-dist-pill.grade-na { background: var(--bg-hover); color: var(--text-muted); }
.grade-dist-pill strong { font-weight: 800; }

/* Student list */
.gd-student-list {
  display: flex; flex-direction: column; gap: 2px;
  max-height: 280px; overflow-y: auto;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 4px;
}
.gd-student-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px; border-radius: var(--radius-sm);
  transition: background var(--t-fast);
}
.gd-student-row:hover { background: var(--bg-hover); }
.gd-student-row--pending { opacity: .7; }

.gd-student-name {
  font-size: 12px; font-weight: 500; color: var(--text-primary);
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gd-student-name.text-muted { color: var(--text-muted); }

.gd-status-icon { flex-shrink: 0; }
.gd-status-icon--ok   { color: var(--color-success); }
.gd-status-icon--wait { color: var(--text-muted); }

.gd-grade {
  font-size: 11px; font-weight: 800; min-width: 28px; text-align: center;
  padding: 1px 4px; border-radius: var(--radius-xs);
}
.gd-grade.grade-a { color: var(--color-success); background: rgba(var(--color-success-rgb),.08); }
.gd-grade.grade-b { color: #27ae60; background: rgba(var(--color-success-rgb),.05); }
.gd-grade.grade-c { color: var(--color-warning); background: rgba(var(--color-warning-rgb),.08); }
.gd-grade.grade-d { color: var(--color-danger); background: rgba(var(--color-danger-rgb),.08); }
.gd-no-grade { font-size: 11px; color: var(--text-muted); min-width: 28px; text-align: center; }

.gd-feedback-snippet {
  font-size: 10px; color: var(--text-muted); font-style: italic;
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Footer */
.gd-see-all { margin-top: 8px; }
.gd-link-btn {
  font-size: 12px; color: var(--accent); background: none; border: none;
  cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
  font-family: var(--font);
}
.gd-link-btn:hover { text-decoration: underline; }

/* Empty */
.gd-rendus--empty { text-align: center; padding: 16px 20px; }
.gd-empty-text { font-size: 12px; color: var(--text-muted); font-style: italic; margin: 4px 0 0; }
</style>
