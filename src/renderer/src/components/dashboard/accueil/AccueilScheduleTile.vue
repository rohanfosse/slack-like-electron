<script setup lang="ts">
/**
 * AccueilScheduleTile : tuile "Aujourd'hui" avec la liste des evenements
 * du jour (soutenances, deadlines, RDV) colorees et marquees "passe"/
 * "actuel" pour faciliter le reperage en un coup d'oeil.
 */
import { Clock, X, Mic, CheckCircle2 } from 'lucide-vue-next'
import type { AgendaItem } from '@/composables/useDashboardWidgets'

interface Props {
  events: AgendaItem[]
  editMode: boolean
  isPastEvent: (time: string) => boolean
  isCurrentEvent: (time: string, index: number) => boolean
}
defineProps<Props>()
defineEmits<{ (e: 'remove'): void }>()
</script>

<template>
  <div class="dashboard-card bento-tile bento-schedule" :class="{ 'bento-tile--editing': editMode }">
    <button v-if="editMode" class="bento-tile-remove" @click="$emit('remove')">
      <X :size="12" />
    </button>
    <h3 class="tile-title"><Clock :size="14" /> Aujourd'hui</h3>
    <div v-if="!events.length" class="schedule-empty">
      Aucun evenement prevu aujourd'hui
    </div>
    <div v-else class="schedule-list">
      <div
        v-for="(ev, idx) in events"
        :key="ev.id"
        class="schedule-item"
        :class="{
          'schedule-past': isPastEvent(ev.time),
          'schedule-current': isCurrentEvent(ev.time, idx),
        }"
      >
        <span class="schedule-time">
          {{ new Date(ev.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <span class="schedule-badge" :class="'schedule-type-' + ev.type">
          <Mic v-if="ev.type === 'soutenance'" :size="10" />
          <Clock v-else-if="ev.type === 'deadline'" :size="10" />
          <CheckCircle2 v-else :size="10" />
        </span>
        <span class="schedule-title">{{ ev.title }}</span>
      </div>
    </div>
  </div>
</template>
