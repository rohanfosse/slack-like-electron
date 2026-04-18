<script setup lang="ts">
/**
 * AccueilFocusTile : tuile "focus" du dashboard Accueil prof.
 * Grande tuile 2x2 qui propose la prochaine action principale avec icone
 * contextuelle + bouton. Couleur de fond selon urgence.
 */
import { Edit3, Clock, FileText, CheckCircle2, ChevronRight } from 'lucide-vue-next'
import type { FocusState } from '@/composables/useAccueilFocusTile'

defineProps<{
  state: FocusState
  bgClass: string
}>()
</script>

<template>
  <div class="dashboard-card bento-tile bento-focus" :class="bgClass">
    <div class="focus-icon">
      <Edit3 v-if="state.type === 'grade'" :size="28" />
      <Clock v-else-if="state.type === 'deadline'" :size="28" />
      <FileText v-else-if="state.type === 'draft'" :size="28" />
      <CheckCircle2 v-else :size="28" />
    </div>
    <h2 class="focus-title">{{ state.title }}</h2>
    <p class="focus-subtitle">{{ state.subtitle }}</p>
    <button
      v-if="state.action"
      class="focus-action"
      @click="state.action?.()"
    >
      {{ state.actionLabel }} <ChevronRight :size="14" />
    </button>
  </div>
</template>
