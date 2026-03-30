/**
 * Popup dropdown pour un groupe de milestones sur la meme date.
 * Affiche la liste des devoirs avec couleur projet, type, titre.
 */
<script setup lang="ts">
import { formatDate } from '@/utils/date'
import { typeLabel } from '@/utils/devoir'
import type { EnrichedMilestone, DayGroup } from '@/composables/useFrise'

defineProps<{
  group: DayGroup
  above?: boolean
}>()

const emit = defineEmits<{
  select: [ms: EnrichedMilestone]
}>()
</script>

<template>
  <div class="fdp" :class="{ 'fdp--above': above }" @click.stop>
    <div class="fdp-date">{{ formatDate(group.deadline) }}</div>
    <button
      v-for="ms in group.items" :key="ms.id"
      class="fdp-item"
      @click.stop="emit('select', ms)"
    >
      <span class="fdp-item-dot" :style="{ background: ms.color }" />
      <span class="fdp-item-type">{{ typeLabel(ms.type) }}</span>
      <span class="fdp-item-title">{{ ms.title }}</span>
    </button>
  </div>
</template>

<style scoped>
.fdp {
  position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  background: var(--bg-modal); border: 1px solid var(--border);
  border-radius: 10px; padding: 8px; min-width: 200px; max-width: 280px;
  box-shadow: var(--shadow-lg); z-index: 20;
  display: flex; flex-direction: column; gap: 4px;
  pointer-events: auto; cursor: default;
}
.fdp--above { top: auto; bottom: calc(100% + 8px); }
.fdp-date {
  font-size: 10px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .4px;
  padding: 2px 6px 6px; border-bottom: 1px solid var(--border);
}
.fdp-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 6px; cursor: pointer;
  background: transparent; border: none; font-family: var(--font);
  color: var(--text-primary); text-align: left; transition: background .12s;
}
.fdp-item:hover { background: var(--bg-hover); }
.fdp-item-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.fdp-item-type {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  color: var(--text-muted); min-width: 60px;
}
.fdp-item-title {
  font-size: 12px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
