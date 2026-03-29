import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const apiMock = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: apiMock }),
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
  getProjectsByPromo: vi.fn(),
  getTaProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  assignTaToProject: vi.fn(),
  unassignTaFromProject: vi.fn(),
  getProjectTas: vi.fn(),
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useProjects } from '@/composables/useProjects'
import { useAppStore } from '@/stores/app'

describe('useProjects', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('has empty initial state', () => {
    const { projects, loading } = useProjects()
    expect(projects.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('loadProjects fetches projects for a promo', async () => {
    const data = [
      { id: 1, promo_id: 7, name: 'Projet A', description: null, deadline: null, created_by: 1, created_at: '', updated_at: '' },
    ]
    apiMock.mockResolvedValue(data)

    const { loadProjects, projects } = useProjects()
    await loadProjects(7)
    expect(projects.value).toEqual(data)
  })

  it('loadProjects uses activePromoId from store if no arg', async () => {
    const appStore = useAppStore()
    appStore.activePromoId = 7
    apiMock.mockResolvedValue([])

    const { loadProjects } = useProjects()
    await loadProjects()
    expect(apiMock).toHaveBeenCalled()
  })

  it('loadProjects does nothing when no promoId', async () => {
    const { loadProjects } = useProjects()
    await loadProjects()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('createProject calls api with createdBy and reloads', async () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: -5, name: 'Prof', avatar_initials: 'P', photo_data: null, type: 'teacher', promo_id: null, promo_name: null }
    appStore.activePromoId = 7

    const created = { id: 10, promo_id: 7, name: 'New', description: null, deadline: null, created_by: 5, created_at: '', updated_at: '' }
    let callCount = 0
    apiMock.mockImplementation(async () => {
      callCount++
      return callCount === 1 ? created : []
    })

    const { createProject } = useProjects()
    const result = await createProject({ promoId: 7, name: 'New' })
    expect(result).toEqual(created)
    // Should have been called twice: create + reload
    expect(apiMock).toHaveBeenCalledTimes(2)
  })

  it('createProject returns null when no currentUser', async () => {
    const { createProject } = useProjects()
    const result = await createProject({ promoId: 7, name: 'New' })
    expect(result).toBeNull()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('deleteProject returns true on success and reloads', async () => {
    const appStore = useAppStore()
    appStore.activePromoId = 7

    let callCount = 0
    apiMock.mockImplementation(async () => {
      callCount++
      return callCount === 1 ? {} : []
    })

    const { deleteProject } = useProjects()
    const ok = await deleteProject(10)
    expect(ok).toBe(true)
    expect(apiMock).toHaveBeenCalledTimes(2)
  })

  it('deleteProject returns false on api failure', async () => {
    apiMock.mockResolvedValue(null)
    const { deleteProject } = useProjects()
    const ok = await deleteProject(10)
    expect(ok).toBe(false)
  })

  it('assignTa and unassignTa delegate to api', async () => {
    apiMock.mockResolvedValue({})
    const { assignTa, unassignTa } = useProjects()
    expect(await assignTa(1, 10)).toBe(true)
    expect(await unassignTa(1, 10)).toBe(true)
  })

  it('loadTaProjects uses absolute teacher id', async () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: -5, name: 'Prof', avatar_initials: 'P', photo_data: null, type: 'ta', promo_id: null, promo_name: null }
    apiMock.mockResolvedValue([])

    const { loadTaProjects } = useProjects()
    await loadTaProjects()
    expect(apiMock).toHaveBeenCalled()
  })
})
