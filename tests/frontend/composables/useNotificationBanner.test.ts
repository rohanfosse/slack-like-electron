/**
 * Tests pour useNotificationBanner — bandeau de demande de permission
 * Notifications, affiche apres 15s si la permission est 'default'.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, createApp } from 'vue'

/** Monte le composable dans un composant minimal pour que onMounted/onBeforeUnmount s executent. */
function mountComposable<T>(fn: () => T): { result: T; unmount: () => void } {
  let result!: T
  const Comp = defineComponent({
    setup() { result = fn(); return () => h('div') },
  })
  const app = createApp(Comp)
  const root = document.createElement('div')
  app.mount(root)
  return { result, unmount: () => app.unmount() }
}

function mockNotificationPermission(val: 'default' | 'granted' | 'denied' | null) {
  if (val === null) {
    // Pas de Notification API
    // @ts-expect-error — delete on globalThis
    delete (globalThis as { Notification?: unknown }).Notification
    return
  }
  (globalThis as { Notification: unknown }).Notification = {
    permission: val,
    requestPermission: vi.fn().mockResolvedValue(val),
  }
}

import { useNotificationBanner, NOTIF_BANNER_DELAY_MS } from '@/composables/useNotificationBanner'

describe('useNotificationBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ne s affiche pas si Notification API absente', () => {
    mockNotificationPermission(null)
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 1000)
    expect(result.visible.value).toBe(false)
    unmount()
  })

  it('ne s affiche pas si permission = granted', () => {
    mockNotificationPermission('granted')
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 1000)
    expect(result.visible.value).toBe(false)
    unmount()
  })

  it('ne s affiche pas si permission = denied', () => {
    mockNotificationPermission('denied')
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 1000)
    expect(result.visible.value).toBe(false)
    unmount()
  })

  it('s affiche apres 15s si permission = default', () => {
    mockNotificationPermission('default')
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    expect(result.visible.value).toBe(false)
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 10)
    expect(result.visible.value).toBe(true)
    unmount()
  })

  it('accept() cache le bandeau et appelle requestPermission', () => {
    mockNotificationPermission('default')
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 10)
    result.accept()
    expect(result.visible.value).toBe(false)
    expect((globalThis as { Notification: { requestPermission: ReturnType<typeof vi.fn> } }).Notification.requestPermission).toHaveBeenCalled()
    unmount()
  })

  it('dismiss() cache le bandeau', () => {
    mockNotificationPermission('default')
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 10)
    result.dismiss()
    expect(result.visible.value).toBe(false)
    unmount()
  })

  it('nettoie le timer au unmount (pas de leak)', () => {
    mockNotificationPermission('default')
    const { result, unmount } = mountComposable(() => useNotificationBanner())
    unmount() // declenche onBeforeUnmount
    vi.advanceTimersByTime(NOTIF_BANNER_DELAY_MS + 10)
    expect(result.visible.value).toBe(false)
  })
})
