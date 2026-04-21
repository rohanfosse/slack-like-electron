/**
 * Tests pour useBubbleBookmarks — delegue au store Pinia bookmarksStore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Message } from '@/types'

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: vi.fn().mockResolvedValue({ ok: true, data: { ids: [] } }) }),
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: { BOOKMARKS: 'cesia:bookmarks' },
}))

import { useBubbleBookmarks } from '@/composables/useBubbleBookmarks'
import { useBookmarksStore } from '@/stores/bookmarks'

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    channel_id: 10,
    dm_student_id: null,
    author_id: 2,
    author_name: 'Bob',
    author_type: 'student',
    author_initials: 'BO',
    author_photo: null,
    content: 'Hello world',
    created_at: '2026-01-01T00:00:00Z',
    reactions: null,
    is_pinned: false,
    edited: 0,
    reply_to_id: null,
    reply_to_author: null,
    reply_to_preview: null,
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('isBookmarked', () => {
  it('est false quand le store est vide', () => {
    const { isBookmarked } = useBubbleBookmarks(() => makeMsg({ id: 1 }))
    expect(isBookmarked.value).toBe(false)
  })

  it('est true quand le message figure dans le store', () => {
    const store = useBookmarksStore()
    store.ids.add(42)
    const { isBookmarked } = useBubbleBookmarks(() => makeMsg({ id: 42 }))
    expect(isBookmarked.value).toBe(true)
  })

  it('est false pour un autre message que celui bookmarke', () => {
    const store = useBookmarksStore()
    store.ids.add(99)
    const { isBookmarked } = useBubbleBookmarks(() => makeMsg({ id: 1 }))
    expect(isBookmarked.value).toBe(false)
  })
})

describe('toggleBookmark', () => {
  it('ajoute le message au store quand il n est pas bookmarke', () => {
    const store = useBookmarksStore()
    const toggleSpy = vi.spyOn(store, 'toggle')
    const { toggleBookmark } = useBubbleBookmarks(() => makeMsg({ id: 5 }))
    toggleBookmark()
    expect(toggleSpy).toHaveBeenCalledWith(5)
  })

  it('retire le message quand il est deja bookmarke', () => {
    const store = useBookmarksStore()
    store.ids.add(5)
    const toggleSpy = vi.spyOn(store, 'toggle')
    const { toggleBookmark } = useBubbleBookmarks(() => makeMsg({ id: 5 }))
    toggleBookmark()
    expect(toggleSpy).toHaveBeenCalledWith(5)
  })

  it('la reactivite suit le store (add)', async () => {
    const store = useBookmarksStore()
    const { isBookmarked } = useBubbleBookmarks(() => makeMsg({ id: 7 }))
    expect(isBookmarked.value).toBe(false)
    store.ids.add(7)
    expect(isBookmarked.value).toBe(true)
  })

  it('la reactivite suit le store (remove)', () => {
    const store = useBookmarksStore()
    store.ids.add(8)
    const { isBookmarked } = useBubbleBookmarks(() => makeMsg({ id: 8 }))
    expect(isBookmarked.value).toBe(true)
    store.ids.delete(8)
    expect(isBookmarked.value).toBe(false)
  })
})
