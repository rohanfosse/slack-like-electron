<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bookmark } from 'lucide-vue-next'
import { useBookmarksStore } from '@/stores/bookmarks'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
const store = useBookmarksStore()

const bookmarks = computed(() => store.items.slice(0, 3))

onMounted(() => {
  if (!store.loaded) store.loadItems()
})

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function goToBookmarks() {
  router.push('/signets')
}
</script>

<template>
  <UiWidgetCard
    :icon="Bookmark"
    label="Messages sauvegardés"
    accent-color="var(--color-bookmark)"
  >
    <div v-if="bookmarks.length" class="wb-list">
      <div
        v-for="b in bookmarks"
        :key="b.bookmark_id"
        class="wb-item"
        role="button"
        tabindex="0"
        @click="goToBookmarks"
        @keydown.enter="goToBookmarks"
        @keydown.space.prevent="goToBookmarks"
      >
        <span class="wb-author">{{ b.author_name }}</span>
        <span class="wb-content">{{ truncate(b.content, 40) }}</span>
        <span class="wb-channel">{{ b.channel_name ? '#' + b.channel_name : '@' + (b.dm_peer_name ?? 'DM') }}</span>
      </div>
    </div>
    <EmptyState v-else size="sm" tone="muted" title="Aucun message sauvegardé" />
  </UiWidgetCard>
</template>

<style scoped>
.wb-list { display: flex; flex-direction: column; gap: var(--space-xs); }

.wb-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-xs) var(--space-xs);
  border-radius: var(--radius-sm);
  transition: background var(--motion-fast) var(--ease-out);
}

.wb-item:hover { background: var(--bg-hover); }
.wb-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.wb-author {
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.wb-content {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-muted);
}

.wb-channel {
  font-size: var(--text-xs);
  color: var(--text-muted);
  opacity: .7;
  flex-shrink: 0;
}
</style>
