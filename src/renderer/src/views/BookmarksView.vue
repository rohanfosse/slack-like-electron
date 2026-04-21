<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bookmark, BookmarkX, Hash, User, Menu, Search } from 'lucide-vue-next'
import UiPageHeader from '@/components/ui/UiPageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { useBookmarksStore, type BookmarkItem } from '@/stores/bookmarks'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import { renderMessageContent } from '@/utils/html'
import { formatDate, formatTime } from '@/utils/date'
import { avatarColor } from '@/utils/format'

defineProps<{ toggleSidebar?: () => void }>()

const store = useBookmarksStore()
const appStore = useAppStore()
const router = useRouter()
const { showToast } = useToast()

const bookmarks = computed<BookmarkItem[]>(() => store.items)

onMounted(() => {
  store.loadItems()
})

function previewHtml(b: BookmarkItem): string {
  return renderMessageContent(b.content ?? '', '', appStore.currentUser?.name ?? '')
}

function contextLabel(b: BookmarkItem): string {
  if (b.channel_name) return `#${b.channel_name}`
  if (b.dm_peer_name) return `@${b.dm_peer_name}`
  return 'Message privé'
}

async function removeBookmark(b: BookmarkItem) {
  const ok = await store.remove(b.id)
  if (ok) showToast('Signet retiré.', 'info')
}

function goToMessage(b: BookmarkItem) {
  if (b.dm_student_id) {
    appStore.openDm(b.dm_student_id, appStore.activePromoId ?? 0, b.author_name)
    router.push('/messages')
    return
  }
  if (b.channel_id) {
    appStore.openChannel(b.channel_id, appStore.activePromoId ?? 0, b.channel_name ?? '')
    router.push('/messages')
  }
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return `aujourd'hui ${formatTime(iso)}`
    return `${formatDate(iso)} ${formatTime(iso)}`
  } catch { return iso }
}
</script>

<template>
  <div class="bookmarks-view">
    <UiPageHeader title="Signets" :subtitle="`${store.count} message(s) sauvegardé(s)`">
      <template #leading>
        <button
          v-if="toggleSidebar"
          class="bm-menu-btn"
          aria-label="Ouvrir le menu"
          @click="toggleSidebar"
        ><Menu :size="18" /></button>
      </template>
    </UiPageHeader>

    <div v-if="!bookmarks.length" class="bm-empty">
      <EmptyState
        :icon="Bookmark"
        title="Aucun signet pour l'instant"
        subtitle="Dans un message, clique sur l'icone signet pour le retrouver ici."
        size="lg"
        tone="accent"
      />
    </div>

    <ul v-else class="bm-list">
      <li
        v-for="b in bookmarks"
        :key="b.bookmark_id"
        class="bm-item"
      >
        <div class="bm-avatar">
          <Avatar
            :initials="b.author_initials"
            :photo-data="b.author_photo"
            :color="avatarColor(b.author_name)"
            :size="36"
          />
        </div>

        <div class="bm-main" @click="goToMessage(b)" @keydown.enter="goToMessage(b)" role="button" tabindex="0">
          <div class="bm-head">
            <span class="bm-author">{{ b.author_name }}</span>
            <span class="bm-ctx">
              <Hash v-if="b.channel_id" :size="12" />
              <User v-else :size="12" />
              {{ contextLabel(b) }}
            </span>
            <span class="bm-when">· sauvegardé {{ formatWhen(b.bookmarked_at) }}</span>
          </div>

          <div class="bm-content" v-html="previewHtml(b)" />

          <div class="bm-meta">
            <Search :size="11" />
            <span>posté le {{ formatWhen(b.created_at) }}</span>
          </div>
        </div>

        <button
          class="bm-remove"
          :title="'Retirer le signet'"
          :aria-label="'Retirer le signet'"
          @click="removeBookmark(b)"
        >
          <BookmarkX :size="16" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.bookmarks-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.bm-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bm-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: var(--space-md) var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bm-item {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  transition: background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out);
}
.bm-item:hover { background: var(--bg-hover); border-color: var(--accent); }

.bm-avatar { flex-shrink: 0; }

.bm-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.bm-main:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-sm); }

.bm-head {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
  font-size: var(--text-sm);
}
.bm-author { font-weight: 600; color: var(--text-primary); }
.bm-ctx {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent);
  font-weight: 500;
}
.bm-when { font-size: var(--text-xs); color: var(--text-muted); }

.bm-content {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
}
.bm-content :deep(p) { margin: 0; }

.bm-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.bm-remove {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: background var(--motion-fast), color var(--motion-fast);
}
.bm-remove:hover { background: var(--bg-danger-subtle, rgba(231,76,60,.1)); color: var(--color-danger); }

.bm-menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
}
.bm-menu-btn:hover { background: var(--bg-hover); }
</style>
