import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'
import type { Message, User } from '@/types'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const sendMessageMock = vi.fn()
const togglePinMessageMock = vi.fn()
const getChannelMessagesPageMock = vi.fn()
const getDmMessagesPageMock = vi.fn()
const searchMessagesMock = vi.fn()
const searchDmMessagesMock = vi.fn()
const getPinnedMessagesMock = vi.fn()

function makeUser(): User {
  return {
    id: 1,
    name: 'Jean Dupont',
    avatar_initials: 'JD',
    photo_data: null,
    type: 'student',
    promo_id: 7,
    promo_name: 'Promo Test',
    must_change_password: 0,
  }
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    channel_id: 42,
    dm_student_id: null,
    author_id: 1,
    author_name: 'Jean Dupont',
    author_type: 'student',
    author_initials: 'JD',
    author_photo: null,
    content: 'Bonjour',
    created_at: '2026-03-21T10:00:00.000Z',
    reactions: null,
    is_pinned: 0,
    edited: 0,
    ...overrides,
  }
}

describe('messages store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sendMessageMock.mockReset()
    togglePinMessageMock.mockReset()
    getChannelMessagesPageMock.mockReset()
    getDmMessagesPageMock.mockReset()
    searchMessagesMock.mockReset()
    searchDmMessagesMock.mockReset()
    getPinnedMessagesMock.mockReset()

    ;(window as unknown as { api: Record<string, unknown> }).api = {
      sendMessage: sendMessageMock,
      togglePinMessage: togglePinMessageMock,
      getChannelMessagesPage: getChannelMessagesPageMock,
      getDmMessagesPage: getDmMessagesPageMock,
      searchMessages: searchMessagesMock,
      searchDmMessages: searchDmMessagesMock,
      getPinnedMessages: getPinnedMessagesMock,
    }

    const appStore = useAppStore()
    appStore.currentUser = makeUser()
    appStore.activeChannelId = 42
    appStore.activeChannelName = 'general'
    appStore.activePromoId = 7
  })

  it('appends the inserted message after send without reloading the page', async () => {
    const store = useMessagesStore()
    const inserted = makeMessage({ id: 99, content: 'Message local' })

    sendMessageMock.mockResolvedValue({ ok: true, data: inserted })

    const ok = await store.sendMessage('Message local')

    expect(ok).toBe(true)
    expect(store.messages).toEqual([inserted])
    expect(getChannelMessagesPageMock).not.toHaveBeenCalled()
    expect(localStorage.getItem('lastRead:ch:42')).toBe('99')
  })

  it('updates pin state locally without refetching messages or pinned items', async () => {
    const store = useMessagesStore()
    const message = makeMessage({ id: 10, created_at: '2026-03-21T11:00:00.000Z' })
    const olderPinned = makeMessage({
      id: 3,
      content: 'Ancien pin',
      created_at: '2026-03-21T09:00:00.000Z',
      is_pinned: 1,
    })

    store.messages = [message]
    store.pinned = [olderPinned]

    togglePinMessageMock.mockResolvedValue({ ok: true, data: 1 })

    await store.togglePin(10, true)

    expect(store.messages[0].is_pinned).toBe(1)
    expect(store.pinned.map((item) => item.id)).toEqual([10, 3])
    expect(getChannelMessagesPageMock).not.toHaveBeenCalled()
    expect(getPinnedMessagesMock).not.toHaveBeenCalled()
  })
})
