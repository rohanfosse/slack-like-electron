<script setup lang="ts">
/**
 * AccueilMessagesTile : tuile 1x1 avec les 3 premiers DM non lus et un
 * click sur chaque ligne ouvre la conversation.
 */
import { MessageSquare, X } from 'lucide-vue-next'
import { avatarColor } from '@/utils/format'

interface Props {
  entries: { name: string; count: number }[]
  totalUnread: number
  editMode: boolean
}
defineProps<Props>()
defineEmits<{
  (e: 'open-dm', name: string): void
  (e: 'remove'): void
}>()
</script>

<template>
  <div class="dashboard-card bento-tile bento-messages" :class="{ 'bento-tile--editing': editMode }">
    <button v-if="editMode" class="bento-tile-remove" @click="$emit('remove')">
      <X :size="12" />
    </button>
    <h3 class="tile-title"><MessageSquare :size="14" /> Messages</h3>
    <div v-if="!entries.length" class="messages-empty">
      Aucun message non lu
    </div>
    <template v-else>
      <span class="messages-count">{{ totalUnread }} non lu{{ totalUnread > 1 ? 's' : '' }}</span>
      <div class="messages-list">
        <button
          v-for="entry in entries.slice(0, 3)"
          :key="entry.name"
          class="messages-item"
          @click="$emit('open-dm', entry.name)"
        >
          <div class="messages-avatar" :style="{ background: avatarColor(entry.name) }">
            {{ entry.name.slice(0, 2).toUpperCase() }}
          </div>
          <span class="messages-name">{{ entry.name }}</span>
          <span class="messages-badge">{{ entry.count }}</span>
        </button>
      </div>
    </template>
  </div>
</template>
