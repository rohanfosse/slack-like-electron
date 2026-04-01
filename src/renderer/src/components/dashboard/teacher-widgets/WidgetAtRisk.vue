<script setup lang="ts">
  import { onMounted, toRef } from 'vue'
  import { AlertTriangle, Clock } from 'lucide-vue-next'
  import { useAtRiskStudents } from '@/composables/useAtRiskStudents'
  import { useAppStore } from '@/stores/app'
  import { avatarColor, initials } from '@/utils/format'

  const appStore = useAppStore()
  const { atRiskStudents, atRiskCount, loading, daysSinceActivity, load } =
    useAtRiskStudents(toRef(appStore, 'activePromoId'))

  const emit = defineEmits<{ openStudent: [studentId: number] }>()

  onMounted(() => load())
</script>

<template>
  <div class="war-widget">
    <div class="war-header">
      <AlertTriangle :size="14" class="war-icon" />
      <span class="war-title">Etudiants a risque</span>
      <span v-if="atRiskCount > 0" class="war-count">{{ atRiskCount }}</span>
    </div>

    <div v-if="loading" class="war-loading">Chargement...</div>

    <div v-else-if="atRiskStudents.length === 0" class="war-empty">
      Aucun etudiant a risque
    </div>

    <div v-else class="war-list">
      <button
        v-for="s in atRiskStudents.slice(0, 5)"
        :key="s.studentId"
        class="war-student"
        @click="emit('openStudent', s.studentId)"
      >
        <div class="avatar" :style="{ background: avatarColor(s.name), width: '28px', height: '28px', fontSize: '10px', borderRadius: '50%' }">
          {{ initials(s.name) }}
        </div>
        <div class="war-student-info">
          <span class="war-student-name">{{ s.name }}</span>
          <span class="war-student-meta">
            {{ s.missing }} manquant{{ s.missing > 1 ? 's' : '' }}
            <template v-if="s.lastActivity">
              · <Clock :size="9" /> {{ daysSinceActivity(s.lastActivity) ?? '?' }}j
            </template>
            <template v-else> · inactif</template>
          </span>
        </div>
        <span class="war-score" :class="s.score < 30 ? 'war-score--critical' : 'war-score--warn'">
          {{ s.score }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.war-widget { display: flex; flex-direction: column; gap: 10px; }

.war-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.war-icon { color: var(--color-danger); }

.war-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.war-count {
  margin-left: auto;
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
}

.war-loading, .war-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 12px 0;
}

.war-list { display: flex; flex-direction: column; gap: 2px; }

.war-student {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--t-fast);
}

.war-student:hover { background: var(--bg-hover); }

.war-student-info { flex: 1; min-width: 0; }

.war-student-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.war-student-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 3px;
}

.war-score {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.war-score--critical { background: rgba(231, 76, 60, .12); color: var(--color-danger); }
.war-score--warn { background: rgba(232, 137, 26, .12); color: var(--color-warning); }
</style>
