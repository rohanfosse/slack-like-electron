import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { STORAGE_KEYS } from '@/constants'

export interface BookmarkItem {
  bookmark_id: number
  bookmark_note: string | null
  bookmarked_at: string
  id: number
  channel_id: number | null
  dm_student_id: number | null
  author_id: number
  author_name: string
  author_type: 'student' | 'teacher'
  author_initials: string
  author_photo: string | null
  content: string
  created_at: string
  edited: number
  is_pinned: number
  reply_to_author: string | null
  reply_to_preview: string | null
  channel_name: string | null
  dm_peer_name: string | null
}

/**
 * Store des signets de messages.
 *
 * Le Set `ids` est charge une fois au login (initIds) et mis a jour de
 * maniere optimiste lors des toggle. Cela evite un appel API pour chaque
 * bulle de message affichee (utiliser store.has(msgId) dans le composable).
 *
 * La liste complete (avec contenu hydrate) est chargee a la demande depuis
 * la vue dediee et le widget dashboard.
 */
export const useBookmarksStore = defineStore('bookmarks', () => {
  const { api } = useApi()

  const ids       = ref<Set<number>>(new Set())
  const items     = ref<BookmarkItem[]>([])
  const loaded    = ref<boolean>(false)
  const loadedIds = ref<boolean>(false)

  const count = computed(() => ids.value.size)

  function has(messageId: number): boolean {
    return ids.value.has(messageId)
  }

  async function initIds(): Promise<void> {
    if (loadedIds.value) return
    const res = await api(() => window.api.listBookmarkIds(), { silent: true })
    if (res) {
      ids.value = new Set(res.ids)
      loadedIds.value = true
    }
    await maybeMigrateLegacy()
  }

  async function loadItems(): Promise<void> {
    const res = await api(() => window.api.listBookmarks(null, 100), { context: 'search' })
    if (res) {
      items.value = res
      const merged = new Set(ids.value)
      for (const b of res) merged.add(b.id)
      ids.value = merged
      loaded.value = true
    }
  }

  async function add(messageId: number, note: string | null = null): Promise<boolean> {
    const alreadyBookmarked = ids.value.has(messageId)
    ids.value.add(messageId)
    const res = await api(() => window.api.addBookmark(messageId, note), { silent: true })
    if (!res) {
      if (!alreadyBookmarked) ids.value.delete(messageId)
      return false
    }
    return true
  }

  async function remove(messageId: number): Promise<boolean> {
    const wasBookmarked = ids.value.has(messageId)
    ids.value.delete(messageId)
    items.value = items.value.filter(b => b.id !== messageId)
    const res = await api(() => window.api.removeBookmark(messageId), { silent: true })
    if (!res) {
      if (wasBookmarked) ids.value.add(messageId)
      return false
    }
    return true
  }

  async function toggle(messageId: number): Promise<boolean> {
    if (ids.value.has(messageId)) {
      await remove(messageId)
      return false
    }
    await add(messageId)
    return true
  }

  /**
   * Migration one-shot du localStorage vers le serveur. Appelee apres initIds.
   * Les IDs non accessibles (autre promo, message supprime) sont silencieusement
   * ignores par le serveur via INSERT OR IGNORE.
   */
  async function maybeMigrateLegacy(): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed) || !parsed.length) {
        localStorage.removeItem(STORAGE_KEYS.BOOKMARKS)
        return
      }
      const legacyIds: number[] = parsed
        .map((b: unknown) => {
          if (typeof b === 'number') return b
          if (b && typeof b === 'object' && 'id' in b) return Number((b as { id: unknown }).id)
          return NaN
        })
        .filter((n: number) => Number.isInteger(n) && n > 0)
      if (!legacyIds.length) {
        localStorage.removeItem(STORAGE_KEYS.BOOKMARKS)
        return
      }
      const res = await api(() => window.api.importBookmarks(legacyIds), { silent: true })
      if (res) {
        localStorage.removeItem(STORAGE_KEYS.BOOKMARKS)
        const fresh = await api(() => window.api.listBookmarkIds(), { silent: true })
        if (fresh) ids.value = new Set(fresh.ids)
      }
    } catch (err) {
      console.warn('[bookmarks] legacy migration failed', err)
    }
  }

  function reset(): void {
    ids.value = new Set()
    items.value = []
    loaded.value = false
    loadedIds.value = false
  }

  return {
    ids, items, loaded, loadedIds, count,
    has, initIds, loadItems, add, remove, toggle, reset,
  }
})
