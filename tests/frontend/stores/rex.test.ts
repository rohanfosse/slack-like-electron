import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const apiMock = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: apiMock }),
}))

;(window as unknown as { api: Record<string, unknown> }).api = {
  createRexSession: vi.fn(),
  getRexSessionByCode: vi.fn(),
  getRexSession: vi.fn(),
  getActiveRexSession: vi.fn(),
  addRexActivity: vi.fn(),
  setRexActivityStatus: vi.fn(),
  deleteRexActivity: vi.fn(),
  submitRexResponse: vi.fn(),
  getRexActivityResults: vi.fn(),
  updateRexSessionStatus: vi.fn(),
  getRexSessionsForPromo: vi.fn(),
  updateRexActivity: vi.fn(),
  reorderRexActivities: vi.fn(),
  cloneRexSession: vi.fn(),
  deleteRexSession: vi.fn(),
  getRexHistoryForPromo: vi.fn(),
  getRexStatsForPromo: vi.fn(),
  toggleRexPin: vi.fn(),
  exportRexSession: vi.fn(),
  emitRexJoin: vi.fn(),
  emitRexLeave: vi.fn(),
  onRexActivityPushed: vi.fn(() => () => {}),
  onRexActivityClosed: vi.fn(() => () => {}),
  onRexResultsUpdate: vi.fn(() => () => {}),
  onRexSessionStarted: vi.fn(() => () => {}),
  onRexSessionEnded: vi.fn(() => () => {}),
}

import { useRexStore } from '@/stores/rex'

describe('rex store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('has null/empty initial state', () => {
    const s = useRexStore()
    expect(s.currentSession).toBeNull()
    expect(s.currentActivity).toBeNull()
    expect(s.results).toBeNull()
    expect(s.hasResponded).toBe(false)
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
    expect(s.draftSessions).toEqual([])
  })

  it('createSession sets session and emits join', async () => {
    const session = { id: 1, title: 'REX', promo_id: 7, status: 'draft', activities: [] }
    apiMock.mockResolvedValue(session)

    const s = useRexStore()
    const ok = await s.createSession('REX', 7)
    expect(ok).toBe(true)
    expect(s.currentSession).toEqual(session)
  })

  it('createSession returns false on failure', async () => {
    apiMock.mockResolvedValue(null)
    const s = useRexStore()
    const ok = await s.createSession('REX', 7)
    expect(ok).toBe(false)
    expect(s.error).toBe('Impossible de créer la session REX')
  })

  it('leaveSession resets state', () => {
    const s = useRexStore()
    s.currentSession = { id: 1, promo_id: 7 } as any
    s.currentActivity = { id: 2 } as any
    s.results = {} as any
    s.hasResponded = true

    s.leaveSession()
    expect(s.currentSession).toBeNull()
    expect(s.currentActivity).toBeNull()
    expect(s.results).toBeNull()
    expect(s.hasResponded).toBe(false)
  })

  it('pushActivity adds activity to session', async () => {
    const s = useRexStore()
    s.currentSession = { id: 1, promo_id: 7, activities: [] } as any
    const activity = { id: 10, session_id: 1, type: 'nuage', title: 'Words', status: 'draft' }
    apiMock.mockResolvedValue(activity)

    const ok = await s.pushActivity(1, { type: 'nuage', title: 'Words' })
    expect(ok).toBe(true)
    expect(s.currentSession!.activities).toHaveLength(1)
  })

  it('launchActivity sets currentActivity', async () => {
    const act = { id: 10, status: 'live' }
    s_setup: {
      apiMock.mockResolvedValue(act)
    }
    const s = useRexStore()
    s.currentSession = { id: 1, promo_id: 7, activities: [{ id: 10, status: 'draft' }] } as any

    const ok = await s.launchActivity(10)
    expect(ok).toBe(true)
    expect(s.currentActivity).toEqual(act)
    expect(s.results).toBeNull()
  })

  it('closeActivity clears currentActivity', async () => {
    const act = { id: 10, status: 'closed' }
    apiMock.mockResolvedValue(act)

    const s = useRexStore()
    s.currentSession = { id: 1, promo_id: 7, activities: [{ id: 10, status: 'live' }] } as any
    s.currentActivity = { id: 10 } as any

    const ok = await s.closeActivity(10)
    expect(ok).toBe(true)
    expect(s.currentActivity).toBeNull()
  })

  it('deleteActivity removes activity from session', async () => {
    apiMock.mockResolvedValue({})

    const s = useRexStore()
    s.currentSession = { id: 1, promo_id: 7, activities: [{ id: 10 }, { id: 11 }] } as any
    const ok = await s.deleteActivity(10)
    expect(ok).toBe(true)
    expect(s.currentSession!.activities).toHaveLength(1)
    expect(s.currentSession!.activities![0].id).toBe(11)
  })

  it('submitResponse sets hasResponded', async () => {
    apiMock.mockResolvedValue({})
    const s = useRexStore()
    const ok = await s.submitResponse(10, { text: 'Great!' })
    expect(ok).toBe(true)
    expect(s.hasResponded).toBe(true)
  })

  it('endSession calls leaveSession', async () => {
    apiMock.mockResolvedValue({})
    const s = useRexStore()
    s.currentSession = { id: 1, promo_id: 7 } as any
    const ok = await s.endSession(1)
    expect(ok).toBe(true)
    expect(s.currentSession).toBeNull()
  })

  it('sessionActivities returns activities from session', () => {
    const s = useRexStore()
    expect(s.sessionActivities).toEqual([])
    s.currentSession = { id: 1, activities: [{ id: 1 }, { id: 2 }] } as any
    expect(s.sessionActivities).toHaveLength(2)
  })

  it('liveActivity returns the live activity', () => {
    const s = useRexStore()
    s.currentSession = { id: 1, activities: [{ id: 1, status: 'closed' }, { id: 2, status: 'live' }] } as any
    expect(s.liveActivity!.id).toBe(2)
  })

  it('togglePin delegates to api', async () => {
    apiMock.mockResolvedValue({})
    const s = useRexStore()
    const ok = await s.togglePin(5, true)
    expect(ok).toBe(true)
  })
})
