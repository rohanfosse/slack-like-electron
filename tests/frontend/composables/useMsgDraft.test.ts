/**
 * Tests pour useMsgDraft — brouillons par canal/DM, sauvegarde/restauration localStorage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/utils/html', () => ({
  renderMessageContent: vi.fn((s: string) => `<p>${s}</p>`),
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: {
    SESSION: 's', NAV_STATE: 'n', PREFS: 'p', MUTED_DMS: 'm',
    draftChannel: (id: number) => `draft_ch_${id}`,
    draftDm:      (id: number) => `draft_dm_${id}`,
  },
  NOTIFICATION_HISTORY_LIMIT: 50,
  MAX_MESSAGE_LENGTH: 5000,
  MESSAGE_PAGE_SIZE: 50,
  GROUP_THRESHOLD_MS: 300000,
  TYPING_TIMEOUT_MS: 3000,
}))

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { localStorageMock.store[key] = val }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key] }),
  clear: vi.fn(() => { localStorageMock.store = {} }),
  length: 0,
  key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

;(window as unknown as { api: Record<string, unknown> }).api = {
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useMsgDraft } from '@/composables/useMsgDraft'
import { useAppStore } from '@/stores/app'

describe('useMsgDraft', () => {
  let appStore: ReturnType<typeof useAppStore>

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'student', promo_id: 1, promo_name: 'P' }
    localStorageMock.store = {}
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createDraft(initial = '') {
    const content = ref(initial)
    const inputEl = ref(null as HTMLTextAreaElement | null)
    const autoResize = vi.fn()
    const result = useMsgDraft(content, inputEl, autoResize)
    return { content, inputEl, autoResize, ...result }
  }

  // ── Sauvegarde brouillon ─────────────────────────────────────────────────
  describe('scheduleDraftSave', () => {
    it('saves draft to localStorage after debounce', () => {
      appStore.activeChannelId = 42
      const { content, scheduleDraftSave } = createDraft('hello world')

      scheduleDraftSave()
      // Not saved yet (debounce 500ms)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('draft_ch_42', 'hello world')
    })

    it('removes draft from localStorage when content is empty', () => {
      appStore.activeChannelId = 42
      localStorageMock.store['draft_ch_42'] = 'old draft'
      const { scheduleDraftSave } = createDraft('   ')

      scheduleDraftSave()
      vi.advanceTimersByTime(500)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('draft_ch_42')
    })

    it('debounces multiple calls', () => {
      appStore.activeChannelId = 1
      const { content, scheduleDraftSave } = createDraft('a')

      scheduleDraftSave()
      vi.advanceTimersByTime(300)
      content.value = 'ab'
      scheduleDraftSave()
      vi.advanceTimersByTime(300)
      content.value = 'abc'
      scheduleDraftSave()
      vi.advanceTimersByTime(500)

      // Only the last value should be saved
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('draft_ch_1', 'abc')
    })

    it('does nothing when no active channel or DM', () => {
      appStore.activeChannelId = null as unknown as number
      appStore.activeDmStudentId = null as unknown as number
      const { scheduleDraftSave } = createDraft('text')

      scheduleDraftSave()
      vi.advanceTimersByTime(500)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  // ── Brouillon DM ────────────────────────────────────────────────────────
  describe('DM drafts', () => {
    it('uses dm key for DM drafts', () => {
      appStore.activeChannelId = null as unknown as number
      appStore.activeDmStudentId = 99
      const { scheduleDraftSave } = createDraft('dm draft')

      scheduleDraftSave()
      vi.advanceTimersByTime(500)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('draft_dm_99', 'dm draft')
    })
  })

  // ── Restauration au changement de canal ──────────────────────────────────
  describe('channel switch restore', () => {
    it('restores draft when switching channels', async () => {
      appStore.activeChannelId = 1
      localStorageMock.store['draft_ch_5'] = 'saved draft for 5'
      const { content, autoResize } = createDraft('')

      appStore.activeChannelId = 5
      await nextTick()
      await nextTick()

      expect(content.value).toBe('saved draft for 5')
      expect(autoResize).toHaveBeenCalled()
    })

    it('clears content when switching to channel with no draft', async () => {
      appStore.activeChannelId = 1
      const { content } = createDraft('some text')

      appStore.activeChannelId = 99
      await nextTick()

      expect(content.value).toBe('')
    })
  })

  // ── Multiple channels don't interfere ────────────────────────────────────
  describe('channel isolation', () => {
    it('saves and restores different drafts per channel', async () => {
      localStorageMock.store['draft_ch_1'] = 'draft for channel 1'
      localStorageMock.store['draft_ch_2'] = 'draft for channel 2'

      appStore.activeChannelId = 1
      const { content } = createDraft('')

      // Switch to channel 1
      appStore.activeChannelId = 1
      await nextTick()
      await nextTick()
      // The watcher fires; since we started with channel 1, let's switch to 2
      appStore.activeChannelId = 2
      await nextTick()
      await nextTick()
      expect(content.value).toBe('draft for channel 2')

      // Switch back to channel 1
      appStore.activeChannelId = 1
      await nextTick()
      await nextTick()
      expect(content.value).toBe('draft for channel 1')
    })

    it('DM and channel drafts use separate keys', () => {
      localStorageMock.store['draft_ch_5'] = 'channel draft'
      localStorageMock.store['draft_dm_5'] = 'dm draft'

      appStore.activeChannelId = 5
      appStore.activeDmStudentId = null as unknown as number
      const { scheduleDraftSave, content } = createDraft('new channel text')
      scheduleDraftSave()
      vi.advanceTimersByTime(500)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('draft_ch_5', 'new channel text')
      // DM draft untouched
      expect(localStorageMock.store['draft_dm_5']).toBe('dm draft')
    })
  })

  // ── clearDraft ───────────────────────────────────────────────────────────
  describe('clearDraft', () => {
    it('removes draft from localStorage', () => {
      appStore.activeChannelId = 10
      localStorageMock.store['draft_ch_10'] = 'to be cleared'
      const { clearDraft } = createDraft('text')

      clearDraft()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('draft_ch_10')
    })

    it('cancels pending draft save timer', () => {
      appStore.activeChannelId = 10
      const { scheduleDraftSave, clearDraft } = createDraft('text')

      scheduleDraftSave()
      clearDraft()
      vi.advanceTimersByTime(500)
      // setItem should not be called because clearDraft cancelled the timer
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  // ── Preview markdown ────────────────────────────────────────────────────
  describe('preview', () => {
    it('previewHtml is empty when showPreview is false', () => {
      appStore.activeChannelId = 1
      const { previewHtml, showPreview } = createDraft('**bold**')
      expect(showPreview.value).toBe(false)
      expect(previewHtml.value).toBe('')
    })

    it('previewHtml renders content when showPreview is true', () => {
      appStore.activeChannelId = 1
      const { previewHtml, showPreview } = createDraft('**bold**')
      showPreview.value = true
      expect(previewHtml.value).toBe('<p>**bold**</p>')
    })
  })
})
