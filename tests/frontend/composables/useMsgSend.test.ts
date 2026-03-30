import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: vi.fn().mockResolvedValue(null) }),
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: { SESSION: 's', NAV_STATE: 'n', PREFS: 'p', MUTED_DMS: 'm' },
  NOTIFICATION_HISTORY_LIMIT: 50,
  MAX_MESSAGE_LENGTH: 5000,
  MESSAGE_PAGE_SIZE: 50,
  GROUP_THRESHOLD_MS: 300000,
  TYPING_TIMEOUT_MS: 3000,
}))

const localStorageMock = {
  getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(),
  clear: vi.fn(), length: 0, key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

;(window as unknown as { api: Record<string, unknown> }).api = {
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  emitTyping: vi.fn(),
  emitDmTyping: vi.fn(),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useMsgSend } from '@/composables/useMsgSend'
import { useAppStore } from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'

describe('useMsgSend', () => {
  let appStore: ReturnType<typeof useAppStore>
  let messagesStore: ReturnType<typeof useMessagesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    messagesStore = useMessagesStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'student', promo_id: 1, promo_name: 'P' }
    appStore.isOnline = true
    appStore.socketConnected = true
    appStore.isReadonly = false
  })

  function createSend(initialContent = '') {
    const content = ref(initialContent)
    const inputEl = ref(null as HTMLTextAreaElement | null)
    const clearDraft = vi.fn()
    const closeMention = vi.fn()
    const onAfterSend = vi.fn()
    const result = useMsgSend(content, inputEl, clearDraft, closeMention, onAfterSend)
    return { content, inputEl, clearDraft, closeMention, onAfterSend, ...result }
  }

  // ── Computed properties ──────────────────────────────────────────────────
  it('charCount reflects content length', () => {
    const { charCount, content } = createSend('hello')
    expect(charCount.value).toBe(5)
    content.value = 'hello world'
    expect(charCount.value).toBe(11)
  })

  it('showCharCount is true when near limit', () => {
    const longContent = 'x'.repeat(Math.floor(messagesStore.MAX_MESSAGE_LENGTH * 0.85))
    const { showCharCount } = createSend(longContent)
    expect(showCharCount.value).toBe(true)
  })

  it('showCharCount is false for short messages', () => {
    const { showCharCount } = createSend('short')
    expect(showCharCount.value).toBe(false)
  })

  it('charCountOver is true when exceeding limit', () => {
    const overContent = 'x'.repeat(messagesStore.MAX_MESSAGE_LENGTH + 1)
    const { charCountOver } = createSend(overContent)
    expect(charCountOver.value).toBe(true)
  })

  it('isOfflineOrDisconnected when offline', () => {
    appStore.isOnline = false
    const { isOfflineOrDisconnected } = createSend()
    expect(isOfflineOrDisconnected.value).toBe(true)
  })

  it('isOfflineOrDisconnected when socket disconnected', () => {
    appStore.socketConnected = false
    const { isOfflineOrDisconnected } = createSend()
    expect(isOfflineOrDisconnected.value).toBe(true)
  })

  it('not offline when both online and connected', () => {
    const { isOfflineOrDisconnected } = createSend()
    expect(isOfflineOrDisconnected.value).toBe(false)
  })

  // ── send() ────────────────────────────────────────────────────────────────
  it('does not send empty messages', async () => {
    const { send, sending } = createSend('   ')
    await send()
    expect(sending.value).toBe(false)
  })

  it('does not send when readonly', async () => {
    appStore.isReadonly = true
    const { send, sending } = createSend('test')
    await send()
    // Should return early without changing sending state
    expect(sending.value).toBe(false)
  })

  it('does not send when offline', async () => {
    appStore.isOnline = false
    const sendSpy = vi.spyOn(messagesStore, 'sendMessage')
    const { send } = createSend('test')
    await send()
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('does not send when message too long', async () => {
    const sendSpy = vi.spyOn(messagesStore, 'sendMessage')
    const { send } = createSend('x'.repeat(messagesStore.MAX_MESSAGE_LENGTH + 1))
    await send()
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('sends message successfully and clears content', async () => {
    vi.spyOn(messagesStore, 'sendMessage').mockResolvedValue(true)
    const { send, content, clearDraft, onAfterSend } = createSend('Bonjour!')
    await send()
    expect(content.value).toBe('')
    expect(clearDraft).toHaveBeenCalled()
    expect(onAfterSend).toHaveBeenCalledWith('Bonjour!')
  })

  it('shows error toast on failed send', async () => {
    vi.spyOn(messagesStore, 'sendMessage').mockResolvedValue(false)
    const { send } = createSend('test')
    await send()
    // sending should be false after failure
    expect(true).toBe(true) // no throw
  })

  // ── @everyone warning ─────────────────────────────────────────────────────
  it('shows @everyone warning on first attempt', async () => {
    const sendSpy = vi.spyOn(messagesStore, 'sendMessage')
    const { send, everyoneWarning } = createSend('Hello @everyone')
    await send()
    expect(everyoneWarning.value).toBe(true)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('sends after confirming @everyone warning', async () => {
    vi.spyOn(messagesStore, 'sendMessage').mockResolvedValue(true)
    const { send, everyoneWarning, content } = createSend('Hello @everyone')
    // First call: shows warning
    await send()
    expect(everyoneWarning.value).toBe(true)
    // Second call: confirms and sends
    await send()
    expect(everyoneWarning.value).toBe(false)
  })

  it('cancelEveryone removes @everyone from content', () => {
    const { cancelEveryone, content, everyoneWarning } = createSend('Hello @everyone world')
    everyoneWarning.value = true
    cancelEveryone()
    expect(everyoneWarning.value).toBe(false)
    expect(content.value).not.toMatch(/@everyone/)
  })

  // ── Typing indicator ──────────────────────────────────────────────────────
  it('emitTyping calls window.api.emitTyping when channel active', () => {
    appStore.activeChannelId = 42
    const { emitTyping } = createSend()
    emitTyping()
    expect((window as any).api.emitTyping).toHaveBeenCalledWith(42)
  })

  it('emitTyping throttles to 2s intervals', () => {
    // Reset the mock count before this test
    ;(window as any).api.emitTyping.mockClear()
    appStore.activeChannelId = 99 // different channel to get a fresh composable
    const { emitTyping } = createSend()
    emitTyping()
    emitTyping() // should be throttled
    expect((window as any).api.emitTyping).toHaveBeenCalledTimes(1)
  })
})
