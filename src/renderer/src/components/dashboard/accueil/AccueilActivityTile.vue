<script setup lang="ts">
/**
 * AccueilActivityTile : tuile 2x1 listant les derniers groupes de rendus
 * (top 5) avec compteur et temps relatif.
 */
import { Clock, X, Edit3 } from 'lucide-vue-next'
import type { ActivityGroup } from '@/composables/useAccueilActivityFeed'

interface Props {
  items: ActivityGroup[]
  editMode: boolean
}
defineProps<Props>()
defineEmits<{ (e: 'remove'): void }>()
</script>

<template>
  <div class="dashboard-card bento-tile bento-activity" :class="{ 'bento-tile--editing': editMode }">
    <button v-if="editMode" class="bento-tile-remove" @click="$emit('remove')">
      <X :size="12" />
    </button>
    <h3 class="tile-title"><Clock :size="14" /> Derniers rendus</h3>
    <div v-if="!items.length" class="activity-empty">
      Aucune activite recente
    </div>
    <div v-else class="activity-list">
      <div v-for="item in items" :key="item.id" class="activity-item">
        <span class="activity-icon">
          <Edit3 :size="12" />
        </span>
        <span class="activity-label">{{ item.label }}</span>
        <span class="activity-time">{{ item.timeAgo }}</span>
      </div>
    </div>
  </div>
</template>
