/**
 * Signet (favoris) d'un message - synchronisation serveur via store Pinia.
 * Used by MessageBubble.vue
 */
import { computed } from 'vue'
import { useBookmarksStore } from '@/stores/bookmarks'
import type { Message } from '@/types'

export function useBubbleBookmarks(msg: () => Message) {
  const store = useBookmarksStore()

  const isBookmarked = computed(() => store.has(msg().id))

  function toggleBookmark(): void {
    store.toggle(msg().id)
  }

  return { isBookmarked, toggleBookmark }
}
