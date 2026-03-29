import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const apiMock = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: apiMock }),
}))

vi.mock('@/composables/useOfflineCache', () => ({
  cacheData: vi.fn(),
  loadCached: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/utils/permissions', () => ({
  hasRole: () => false,
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: {
    SESSION: 'cc_session',
    NAV_STATE: 'cc_nav_state',
    PREFS: 'cc_prefs',
    MUTED_DMS: 'cc_muted_dms',
  },
  NOTIFICATION_HISTORY_LIMIT: 50,
}))

const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

;(window as unknown as { api: Record<string, unknown> }).api = {
  getProjectDocuments: vi.fn(),
  addProjectDocument: vi.fn(),
  updateProjectDocument: vi.fn(),
  deleteChannelDocument: vi.fn(),
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useDocumentsStore } from '@/stores/documents'
import { useAppStore } from '@/stores/app'
import type { AppDocument } from '@/types'

function makeDoc(overrides: Partial<AppDocument> = {}): AppDocument {
  return {
    id: 1,
    title: 'Doc 1',
    file_name: 'doc1.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    category: 'cours',
    uploaded_by: 1,
    uploader_name: 'Jean',
    created_at: '2026-03-20T00:00:00Z',
    ...overrides,
  } as AppDocument
}

describe('documents store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('has empty initial state', () => {
    const s = useDocumentsStore()
    expect(s.documents).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.searchQuery).toBe('')
    expect(s.previewDoc).toBeNull()
  })

  it('fetchDocuments loads documents from api', async () => {
    const docs = [makeDoc({ id: 1 }), makeDoc({ id: 2, title: 'Doc 2' })]
    apiMock.mockResolvedValue(docs)

    const appStore = useAppStore()
    appStore.activePromoId = 7
    appStore.currentUser = { id: 1, name: 'J', avatar_initials: 'J', photo_data: null, type: 'student', promo_id: 7, promo_name: 'P' }

    const s = useDocumentsStore()
    await s.fetchDocuments(7)
    expect(s.documents).toEqual(docs)
    expect(s.loading).toBe(false)
  })

  it('fetchDocuments sets empty array when no promoId', async () => {
    const s = useDocumentsStore()
    await s.fetchDocuments()
    expect(s.documents).toEqual([])
  })

  // ── Favorites ────────────────────────────────────────────────────────────

  it('toggleFavorite adds and removes favorites', () => {
    const s = useDocumentsStore()
    expect(s.isFavorite(1)).toBe(false)
    s.toggleFavorite(1)
    expect(s.isFavorite(1)).toBe(true)
    s.toggleFavorite(1)
    expect(s.isFavorite(1)).toBe(false)
  })

  // ── Preview navigation ─────────────────────────────────────────────────

  it('openPreview / closePreview manage previewDoc', () => {
    const s = useDocumentsStore()
    const doc = makeDoc()
    s.openPreview(doc)
    expect(s.previewDoc).toEqual(doc)
    s.closePreview()
    expect(s.previewDoc).toBeNull()
  })

  it('previewNext / previewPrev navigate through list', () => {
    const s = useDocumentsStore()
    const docs = [makeDoc({ id: 1 }), makeDoc({ id: 2 }), makeDoc({ id: 3 })]
    s.openPreview(docs[0], docs)

    s.previewNext()
    expect(s.previewDoc!.id).toBe(2)

    s.previewNext()
    expect(s.previewDoc!.id).toBe(3)

    // At the end, no change
    s.previewNext()
    expect(s.previewDoc!.id).toBe(3)

    s.previewPrev()
    expect(s.previewDoc!.id).toBe(2)

    s.previewPrev()
    expect(s.previewDoc!.id).toBe(1)

    // At the start, no change
    s.previewPrev()
    expect(s.previewDoc!.id).toBe(1)
  })

  it('previewIndex returns correct position', () => {
    const s = useDocumentsStore()
    const docs = [makeDoc({ id: 1 }), makeDoc({ id: 2 }), makeDoc({ id: 3 })]
    s.openPreview(docs[1], docs)
    expect(s.previewIndex()).toEqual({ current: 2, total: 3 })
  })

  it('previewIndex returns zeros when no preview', () => {
    const s = useDocumentsStore()
    expect(s.previewIndex()).toEqual({ current: 0, total: 0 })
  })
})
