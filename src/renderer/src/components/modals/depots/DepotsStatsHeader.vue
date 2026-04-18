<script setup lang="ts">
/**
 * DepotsStatsHeader : bloc en tete de la modale DepotsModal avec :
 *  - sous-titre (type devoir + echeance)
 *  - barre de progression + compteur note/total
 *  - distribution des notes (pills par grade)
 *  - stats rapides (total, notes, en attente, soumis, note frequente)
 *  - barre de recherche + bouton tri
 *  - toggle mode "notation rapide" (batch)
 */
import { ArrowUpDown, Search, Zap } from 'lucide-vue-next'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { gradeClass } from '@/utils/format'
import { formatDate } from '@/utils/date'
import type { DepotSortMode } from '@/composables/useDepotFilterSort'

interface GradeCount { grade: string; count: number }

interface Props {
  travailType: string
  deadline: string
  totalStudents: number
  notedCount: number
  progressPct: number
  submittedCount: number
  ungradedCount: number
  gradeDistribution: GradeCount[]
  modeGrade: string | null
  searchQuery: string
  sortMode: DepotSortMode
  batchActive: boolean
}
interface Emits {
  (e: 'update:searchQuery', v: string): void
  (e: 'update:sortMode', v: DepotSortMode): void
  (e: 'toggle-batch'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function toggleSort() {
  emit('update:sortMode', props.sortMode === 'name' ? 'date' : 'name')
}
</script>

<template>
  <div class="depots-subheader">
    <div class="depots-meta-row">
      <span class="travail-type-badge" :class="`type-${travailType}`">
        {{ travailType }}
      </span>
      <span class="depots-deadline">
        Echeance : {{ formatDate(deadline) }}
      </span>
    </div>

    <div class="depots-progress-row">
      <span class="depots-progress-label">
        <strong>{{ notedCount }}</strong> / {{ totalStudents }} note{{ notedCount > 1 ? 's' : '' }}
      </span>
      <ProgressBar :value="progressPct" show-pct style="flex:1" />
    </div>

    <div v-if="gradeDistribution.length" class="depots-grade-dist">
      <span
        v-for="g in gradeDistribution"
        :key="g.grade"
        class="grade-dist-pill"
        :class="gradeClass(g.grade)"
        :title="`${g.count} etudiant${g.count > 1 ? 's' : ''} - ${g.grade}`"
      >
        {{ g.grade }} <strong>{{ g.count }}</strong>
      </span>
    </div>

    <div class="depots-quick-stats">
      <span class="stat-badge stat-total">{{ totalStudents }} rendus</span>
      <span class="stat-badge stat-noted">{{ notedCount }} notes</span>
      <span class="stat-badge stat-waiting">{{ totalStudents - notedCount }} en attente</span>
      <span class="stat-badge stat-submitted">{{ submittedCount }} soumis</span>
      <span v-if="modeGrade" class="stat-badge stat-mode">Frequente : <strong>{{ modeGrade }}</strong></span>
    </div>

    <div class="depots-search-row">
      <div class="depots-search-input-wrap">
        <Search :size="13" class="depots-search-icon" />
        <input
          :value="searchQuery"
          class="form-input depots-search-input"
          placeholder="Rechercher un etudiant..."
          aria-label="Rechercher un etudiant"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <button
        class="btn-ghost depots-sort-btn"
        :title="`Trier par ${sortMode === 'name' ? 'date' : 'nom'}`"
        @click="toggleSort"
      >
        <ArrowUpDown :size="12" />
        {{ sortMode === 'name' ? 'Nom' : 'Date' }}
      </button>
    </div>

    <div class="depots-batch-row">
      <button
        class="btn-batch-toggle"
        :class="{ active: batchActive }"
        @click="emit('toggle-batch')"
      >
        <Zap :size="13" />
        {{ batchActive ? 'Mode normal' : 'Notation rapide' }}
      </button>
      <div v-if="!batchActive && ungradedCount > 1" class="depots-bulk-hint">
        {{ ungradedCount }} rendus en attente
      </div>
    </div>
  </div>
</template>
