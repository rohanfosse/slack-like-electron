/**
 * WidgetBookmarks.vue - Messages sauvegardés depuis localStorage.
 */
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bookmark } from 'lucide-vue-next'
import { STORAGE_KEYS } from '@/constants'

interface BookmarkEntry {
  id: string | number
  content: string
  authorName: string
  channelName: string
  date: string
}

const router = useRouter()
const bookmarks = ref<BookmarkEntry[]>([])

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS)
    if (raw) bookmarks.value = JSON.parse(raw) as BookmarkEntry[]
  } catch (err) {
    console.warn('[WidgetBookmarks] Erreur lecture localStorage', err)
  }
})

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function goToMessages() {
  router.push('/messages')
}
</script>

<template>
  <div class="dashboard-card sa-card sa-bookmarks">
    <div class="sa-card-header">
      <Bookmark :size="14" class="sa-card-icon sa-icon--bookmarks" />
      <span class="sa-section-label">Messages sauvegardés</span>
    </div>
    <div v-if="bookmarks.length" class="sa-bookmarks-list">
      <div
        v-for="b in bookmarks.slice(0, 3)"
        :key="b.id"
        class="sa-bookmark-item"
        role="button"
        tabindex="0"
        @click="goToMessages"
        @keydown.enter="goToMessages" @keydown.space.prevent="goToMessages"
      >
        <span class="sa-bookmark-author">{{ b.authorName }}</span>
        <span class="sa-bookmark-content">{{ truncate(b.content, 40) }}</span>
        <span class="sa-bookmark-channel">#{{ b.channelName }}</span>
      </div>
    </div>
    <p v-else class="sa-empty">Aucun message sauvegardé</p>
  </div>
</template>

<style scoped>
.sa-bookmarks { border-left: 3px solid var(--color-bookmark, #8b5cf6); }
.sa-icon--bookmarks { color: var(--color-bookmark, #8b5cf6); }

.sa-bookmarks-list { display: flex; flex-direction: column; gap: 6px; }

.sa-bookmark-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.sa-bookmark-item:hover { background: var(--bg-hover, rgba(255,255,255,.04)); }

.sa-bookmark-author {
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.sa-bookmark-content {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-muted);
}

.sa-bookmark-channel {
  font-size: 11px;
  color: var(--text-muted);
  opacity: .7;
  flex-shrink: 0;
}

/* .sa-empty in devoirs-shared.css */
</style>
