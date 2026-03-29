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

vi.mock('@/utils/date', () => ({
  deadlineClass: (d: string | null) => {
    if (!d) return 'no-deadline'
    const diff = new Date(d).getTime() - Date.now()
    if (diff < 0) return 'deadline-passed'
    if (diff < 86400000) return 'deadline-critical'
    return 'deadline-ok'
  },
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
  getStudentTravaux: vi.fn(),
  getGanttData: vi.fn(),
  getAllRendus: vi.fn(),
  getDepots: vi.fn(),
  getRessources: vi.fn(),
  getTravailById: vi.fn(),
  createTravail: vi.fn(),
  addDepot: vi.fn(),
  setNote: vi.fn(),
  setFeedback: vi.fn(),
  markNonSubmittedAsD: vi.fn(),
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useTravauxStore } from '@/stores/travaux'
import { useAppStore } from '@/stores/app'
import type { Devoir } from '@/types'

function makeDevoir(overrides: Partial<Devoir> = {}): Devoir {
  return {
    id: 1,
    title: 'TP1',
    type: 'devoir',
    category: null,
    description: null,
    channel_id: 5,
    deadline: '2099-12-31T23:59:59Z',
    requires_submission: 1,
    depot_id: null,
    grade: null,
    submitted_at: null,
    ...overrides,
  } as Devoir
}

describe('travaux store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('has empty initial state', () => {
    const s = useTravauxStore()
    expect(s.devoirs).toEqual([])
    expect(s.depots).toEqual([])
    expect(s.ganttData).toEqual([])
    expect(s.loading).toBe(false)
    expect(s.view).toBe('gantt')
  })

  it('pendingDevoirs returns devoirs without depot and requiring submission', () => {
    const s = useTravauxStore()
    s.devoirs = [
      makeDevoir({ id: 1, depot_id: null, requires_submission: 1 }),
      makeDevoir({ id: 2, depot_id: 10, requires_submission: 1 }),
      makeDevoir({ id: 3, depot_id: null, requires_submission: 0 }),
    ]
    expect(s.pendingDevoirs.length).toBe(1)
    expect(s.pendingDevoirs[0].id).toBe(1)
  })

  it('submittedCount counts devoirs with depot_id', () => {
    const s = useTravauxStore()
    s.devoirs = [
      makeDevoir({ id: 1, depot_id: null }),
      makeDevoir({ id: 2, depot_id: 10 }),
      makeDevoir({ id: 3, depot_id: 20 }),
    ]
    expect(s.submittedCount).toBe(2)
  })

  it('overdueCount counts pending devoirs with passed deadline', () => {
    const s = useTravauxStore()
    s.devoirs = [
      makeDevoir({ id: 1, depot_id: null, requires_submission: 1, deadline: '2020-01-01T00:00:00Z' }),
      makeDevoir({ id: 2, depot_id: null, requires_submission: 1, deadline: '2099-12-31T23:59:59Z' }),
    ]
    expect(s.overdueCount).toBe(1)
  })

  it('fetchStudentDevoirs loads devoirs', async () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'J', avatar_initials: 'J', photo_data: null, type: 'student', promo_id: 7, promo_name: 'P' }
    const devoirs = [makeDevoir()]
    apiMock.mockResolvedValue(devoirs)

    const s = useTravauxStore()
    await s.fetchStudentDevoirs()
    expect(s.devoirs).toEqual(devoirs)
    expect(s.loading).toBe(false)
  })

  it('fetchStudentDevoirs does nothing without currentUser', async () => {
    const s = useTravauxStore()
    await s.fetchStudentDevoirs()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('fetchGantt loads gantt data', async () => {
    const gantt = [{ id: 1, title: 'TP', deadline: '2026-04-01' }]
    apiMock.mockResolvedValue(gantt)

    const s = useTravauxStore()
    await s.fetchGantt(7)
    expect(s.ganttData).toEqual(gantt)
  })

  it('setView changes view state', () => {
    const s = useTravauxStore()
    s.setView('rendus')
    expect(s.view).toBe('rendus')
    s.setView('student')
    expect(s.view).toBe('student')
  })

  it('openTravail sets currentDevoir and fetches depots/ressources', async () => {
    const devoir = makeDevoir({ id: 5 })
    let callIdx = 0
    apiMock.mockImplementation(async () => {
      callIdx++
      if (callIdx === 1) return devoir
      return []
    })

    const appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'J', avatar_initials: 'J', photo_data: null, type: 'student', promo_id: 7, promo_name: 'P' }

    const s = useTravauxStore()
    await s.openTravail(5)
    expect(s.currentDevoir).toEqual(devoir)
    expect(appStore.currentTravailId).toBe(5)
  })
})
