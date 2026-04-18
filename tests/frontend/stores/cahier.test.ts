import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const apiMock = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: apiMock, ERROR_CONTEXT: {} }),
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: {
    SESSION: 'cc_session', NAV_STATE: 'cc_nav_state', PREFS: 'cc_prefs',
    MUTED_DMS: 'cc_muted_dms',
  },
  NOTIFICATION_HISTORY_LIMIT: 50,
}))

vi.mock('@/utils/permissions', () => ({ hasRole: () => false }))

const localStorageMock = {
  getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
  length: 0, key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

const apiStub = {
  getCahiers: vi.fn(),
  createCahier: vi.fn(),
  renameCahier: vi.fn(),
  deleteCahier: vi.fn(),
}
;(window as unknown as { api: Record<string, unknown> }).api = apiStub

// Import after mocks
import { useCahierStore } from '@/stores/cahier'
import { useAppStore } from '@/stores/app'

describe('cahier store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
    Object.values(apiStub).forEach(fn => fn.mockReset())
  })

  it('renameCahier returns true and updates state immutably on success', async () => {
    const store = useCahierStore()
    store.cahiers = [
      { id: 1, promo_id: 1, group_id: null, project: null, title: 'Old', created_by: 1, created_at: '', updated_at: 'old' },
      { id: 2, promo_id: 1, group_id: null, project: null, title: 'Other', created_by: 1, created_at: '', updated_at: 'x' },
    ]
    apiMock.mockResolvedValueOnce({ id: 1, title: 'New' })

    const original = store.cahiers
    const ok = await store.renameCahier(1, 'New')
    expect(ok).toBe(true)
    // Immutable : un nouveau tableau doit etre cree
    expect(store.cahiers).not.toBe(original)
    expect(store.cahiers.find(c => c.id === 1)?.title).toBe('New')
    expect(store.cahiers.find(c => c.id === 2)?.title).toBe('Other')
  })

  it('renameCahier returns false and preserves state on API failure', async () => {
    const store = useCahierStore()
    store.cahiers = [
      { id: 1, promo_id: 1, group_id: null, project: null, title: 'Old', created_by: 1, created_at: '', updated_at: '' },
    ]
    apiMock.mockResolvedValueOnce(null) // api() returns null on error

    const ok = await store.renameCahier(1, 'New')
    expect(ok).toBe(false)
    expect(store.cahiers[0].title).toBe('Old')
  })

  it('renameCahier rejects empty/whitespace title without API call', async () => {
    const store = useCahierStore()
    store.cahiers = [
      { id: 1, promo_id: 1, group_id: null, project: null, title: 'Kept', created_by: 1, created_at: '', updated_at: '' },
    ]
    const ok = await store.renameCahier(1, '   ')
    expect(ok).toBe(false)
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('deleteCahier removes from state only on success', async () => {
    const store = useCahierStore()
    store.cahiers = [
      { id: 1, promo_id: 1, group_id: null, project: null, title: 'A', created_by: 1, created_at: '', updated_at: '' },
      { id: 2, promo_id: 1, group_id: null, project: null, title: 'B', created_by: 1, created_at: '', updated_at: '' },
    ]
    apiMock.mockResolvedValueOnce({ id: 1 })
    const ok = await store.deleteCahier(1)
    expect(ok).toBe(true)
    expect(store.cahiers.map(c => c.id)).toEqual([2])
  })

  it('deleteCahier preserves state on API failure', async () => {
    const store = useCahierStore()
    store.cahiers = [
      { id: 1, promo_id: 1, group_id: null, project: null, title: 'A', created_by: 1, created_at: '', updated_at: '' },
    ]
    apiMock.mockResolvedValueOnce(null)
    const ok = await store.deleteCahier(1)
    expect(ok).toBe(false)
    expect(store.cahiers.map(c => c.id)).toEqual([1])
  })

  it('deleteCahier clears activeCahierId when deleting the active one', async () => {
    const store = useCahierStore()
    store.cahiers = [
      { id: 1, promo_id: 1, group_id: null, project: null, title: 'A', created_by: 1, created_at: '', updated_at: '' },
    ]
    store.activeCahierId = 1
    apiMock.mockResolvedValueOnce({ id: 1 })
    await store.deleteCahier(1)
    expect(store.activeCahierId).toBeNull()
  })

  it('fetchCahiers empties array when no promo context', async () => {
    const appStore = useAppStore()
    appStore.activePromoId = null
    if (appStore.currentUser) appStore.currentUser = null as never

    const store = useCahierStore()
    store.cahiers = [
      { id: 9, promo_id: 9, group_id: null, project: null, title: 'stale', created_by: 1, created_at: '', updated_at: '' },
    ]
    await store.fetchCahiers()
    expect(store.cahiers).toEqual([])
    expect(apiMock).not.toHaveBeenCalled()
  })
})
