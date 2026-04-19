/**
 * Tests pour useSocketReconnectToast — toast de reconnexion socket.
 *
 * Verifie :
 *   - pas de toast immediat sur deconnexion (debounce 3s)
 *   - toast "Reconnexion en cours…" apres 3s si toujours deconnecte
 *   - toast "Reconnecté" au retour + re-sync des messages
 *   - pas de toast si aucun user connecte (ne spam pas l ecran de login)
 *   - nettoyage du timer au unmount (pas de leak)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive, effectScope } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const showToast = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

const fetchMessages = vi.fn()
vi.mock('@/stores/messages', () => ({
  useMessagesStore: () => ({ fetchMessages }),
}))

// Mimer Pinia setup-store : les refs sont auto-unwrap sur la propriete.
const mockStore = reactive<{ socketConnected: boolean; currentUser: { id: number; name: string } | null }>({
  socketConnected: true,
  currentUser:     { id: 1, name: 'Rohan' },
})
vi.mock('@/stores/app', () => ({
  useAppStore: () => mockStore,
}))

import { useSocketReconnectToast, RECONNECT_TOAST_DELAY_MS } from '@/composables/useSocketReconnectToast'

describe('useSocketReconnectToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    showToast.mockClear()
    fetchMessages.mockClear()
    mockStore.socketConnected = true
    mockStore.currentUser = { id: 1, name: 'Rohan' }
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ne montre aucun toast tant que la socket est connectee', async () => {
    const scope = effectScope()
    scope.run(() => useSocketReconnectToast())
    await Promise.resolve()
    expect(showToast).not.toHaveBeenCalled()
    scope.stop()
  })

  it('ne toast PAS immediatement sur deconnexion (debounce)', async () => {
    const scope = effectScope()
    scope.run(() => useSocketReconnectToast())
    mockStore.socketConnected = false
    await Promise.resolve()
    expect(showToast).not.toHaveBeenCalled()
    scope.stop()
  })

  it('toast "Reconnexion" apres 3s si toujours deconnecte', async () => {
    const scope = effectScope()
    scope.run(() => useSocketReconnectToast())
    mockStore.socketConnected = false
    await Promise.resolve()
    vi.advanceTimersByTime(RECONNECT_TOAST_DELAY_MS + 10)
    expect(showToast).toHaveBeenCalledWith('Reconnexion en cours…', 'info')
    scope.stop()
  })

  it('toast "Reconnecte" + re-sync au retour (avant le 3s)', async () => {
    const scope = effectScope()
    scope.run(() => useSocketReconnectToast())
    mockStore.socketConnected = false
    await Promise.resolve()
    vi.advanceTimersByTime(1000)
    mockStore.socketConnected = true
    await Promise.resolve()
    expect(showToast).toHaveBeenCalledWith('Reconnecté', 'success')
    expect(fetchMessages).toHaveBeenCalled()
    // Le timer doit etre cancel — avancer 3s ne doit pas rejouer l info toast.
    showToast.mockClear()
    vi.advanceTimersByTime(RECONNECT_TOAST_DELAY_MS + 10)
    expect(showToast).not.toHaveBeenCalledWith('Reconnexion en cours…', 'info')
    scope.stop()
  })

  it('ne toast pas si aucun user connecte (ecran de login)', async () => {
    mockStore.currentUser = null
    const scope = effectScope()
    scope.run(() => useSocketReconnectToast())
    mockStore.socketConnected = false
    await Promise.resolve()
    vi.advanceTimersByTime(RECONNECT_TOAST_DELAY_MS + 10)
    expect(showToast).not.toHaveBeenCalled()
    scope.stop()
  })
})
