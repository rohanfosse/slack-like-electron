import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const emitLiveJoinMock = vi.fn()
const emitLiveLeaveMock = vi.fn()

;(window as unknown as { api: Record<string, unknown> }).api = {
  createLiveSession: vi.fn(),
  getLiveSessionByCode: vi.fn(),
  getLiveSession: vi.fn(),
  getActiveLiveSession: vi.fn(),
  addLiveActivity: vi.fn(),
  setLiveActivityStatus: vi.fn(),
  deleteLiveActivity: vi.fn(),
  submitLiveResponse: vi.fn(),
  getLiveActivityResults: vi.fn(),
  getLiveLeaderboard: vi.fn(),
  updateLiveSessionStatus: vi.fn(),
  getLiveSessionsForPromo: vi.fn(),
  updateLiveActivity: vi.fn(),
  reorderLiveActivities: vi.fn(),
  cloneLiveSession: vi.fn(),
  deleteLiveSession: vi.fn(),
  getLiveHistoryForPromo: vi.fn(),
  getLiveStatsForPromo: vi.fn(),
  emitLiveJoin: emitLiveJoinMock,
  emitLiveLeave: emitLiveLeaveMock,
  onLiveActivityPushed: vi.fn(() => () => {}),
  onLiveActivityClosed: vi.fn(() => () => {}),
  onLiveResultsUpdate: vi.fn(() => () => {}),
  onLiveScoresUpdate: vi.fn(() => () => {}),
  onLiveSessionStarted: vi.fn(() => () => {}),
  onLiveSessionEnded: vi.fn(() => () => {}),
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useLiveStore } from '@/stores/live'

describe('live store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
    emitLiveJoinMock.mockReset()
    emitLiveLeaveMock.mockReset()
  })

  it('has null/empty initial state', () => {
    const s = useLiveStore()
    expect(s.currentSession).toBeNull()
    expect(s.currentActivity).toBeNull()
    expect(s.results).toBeNull()
    expect(s.hasResponded).toBe(false)
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
    expect(s.draftSessions).toEqual([])
    expect(s.leaderboard).toEqual([])
  })

  it('createSession sets currentSession and emits join', async () => {
    const session = { id: 1, title: 'Quiz', promo_id: 7, status: 'draft', activities: [] }
    apiMock.mockResolvedValue(session)

    const s = useLiveStore()
    const ok = await s.createSession('Quiz', 7)
    expect(ok).toBe(true)
    expect(s.currentSession).toEqual(session)
    expect(emitLiveJoinMock).toHaveBeenCalledWith(7)
  })

  it('createSession returns false on api failure', async () => {
    apiMock.mockResolvedValue(null)
    const s = useLiveStore()
    const ok = await s.createSession('Quiz', 7)
    expect(ok).toBe(false)
    expect(s.error).toBe('Impossible de créer la session')
  })

  it('leaveSession resets all live state', () => {
    const s = useLiveStore()
    s.currentSession = { id: 1, promo_id: 7 } as any
    s.currentActivity = { id: 2 } as any
    s.results = {} as any
    s.hasResponded = true
    s.participantCount = 5
    s.leaderboard = [{ name: 'A', score: 10 }] as any

    s.leaveSession()

    expect(emitLiveLeaveMock).toHaveBeenCalledWith(7)
    expect(s.currentSession).toBeNull()
    expect(s.currentActivity).toBeNull()
    expect(s.results).toBeNull()
    expect(s.hasResponded).toBe(false)
    expect(s.participantCount).toBe(0)
    expect(s.leaderboard).toEqual([])
  })

  it('pushActivity adds activity to currentSession', async () => {
    const s = useLiveStore()
    s.currentSession = { id: 1, promo_id: 7, activities: [] } as any
    const activity = { id: 10, session_id: 1, type: 'qcm', title: 'Q1', status: 'draft' }
    apiMock.mockResolvedValue(activity)

    const ok = await s.pushActivity(1, { type: 'qcm', title: 'Q1' })
    expect(ok).toBe(true)
    expect(s.currentSession!.activities).toHaveLength(1)
    expect(s.currentSession!.activities![0]).toEqual(activity)
  })

  it('launchActivity sets currentActivity and updates session', async () => {
    const s = useLiveStore()
    const act = { id: 10, session_id: 1, type: 'qcm', title: 'Q1', status: 'live', started_at: '2026-03-29T10:00:00Z' }
    s.currentSession = { id: 1, promo_id: 7, activities: [{ id: 10, status: 'draft' }] } as any
    apiMock.mockResolvedValue(act)

    const ok = await s.launchActivity(10)
    expect(ok).toBe(true)
    expect(s.currentActivity).toEqual(act)
    expect(s.timerStartedAt).toBe('2026-03-29T10:00:00Z')
  })

  it('closeActivity clears currentActivity', async () => {
    const s = useLiveStore()
    const act = { id: 10, session_id: 1, status: 'closed' }
    s.currentSession = { id: 1, promo_id: 7, activities: [{ id: 10, status: 'live' }] } as any
    s.currentActivity = { id: 10 } as any
    apiMock.mockResolvedValue(act)

    const ok = await s.closeActivity(10)
    expect(ok).toBe(true)
    expect(s.currentActivity).toBeNull()
  })

  it('deleteActivity removes activity from session', async () => {
    const s = useLiveStore()
    s.currentSession = { id: 1, promo_id: 7, activities: [{ id: 10 }, { id: 11 }] } as any
    apiMock.mockResolvedValue({})

    const ok = await s.deleteActivity(10)
    expect(ok).toBe(true)
    expect(s.currentSession!.activities).toHaveLength(1)
    expect(s.currentSession!.activities![0].id).toBe(11)
  })

  it('submitResponse sets hasResponded and myScore', async () => {
    const scoreResult = { isCorrect: true, points: 100, rank: 1 }
    apiMock.mockResolvedValue(scoreResult)

    const s = useLiveStore()
    const result = await s.submitResponse(10, { answers: [0] })
    expect(s.hasResponded).toBe(true)
    expect(s.myScore).toEqual(scoreResult)
    expect(result).toEqual(scoreResult)
  })

  it('sessionActivities computed returns activities from currentSession', () => {
    const s = useLiveStore()
    expect(s.sessionActivities).toEqual([])
    s.currentSession = { id: 1, activities: [{ id: 1 }, { id: 2 }] } as any
    expect(s.sessionActivities).toHaveLength(2)
  })

  it('liveActivity computed returns the live activity', () => {
    const s = useLiveStore()
    s.currentSession = { id: 1, activities: [{ id: 1, status: 'closed' }, { id: 2, status: 'live' }] } as any
    expect(s.liveActivity!.id).toBe(2)
  })

  it('endSession calls leaveSession after api success', async () => {
    apiMock.mockResolvedValue({})
    const s = useLiveStore()
    s.currentSession = { id: 1, promo_id: 7 } as any
    const ok = await s.endSession(1)
    expect(ok).toBe(true)
    expect(s.currentSession).toBeNull()
  })

  // ── joinByCode ──────────────────────────────────────────────────────────────

  it('joinByCode sets session, currentActivity from live activity, and emits join', async () => {
    const liveAct = { id: 5, session_id: 1, status: 'live', title: 'Q1' }
    const session = { id: 1, promo_id: 7, activities: [{ id: 4, status: 'closed' }, liveAct] }
    apiMock.mockResolvedValue(session)

    const s = useLiveStore()
    const ok = await s.joinByCode('ABC123')
    expect(ok).toBe(true)
    expect(s.currentSession).toEqual(session)
    expect(s.currentActivity).toEqual(liveAct)
    expect(s.hasResponded).toBe(false)
    expect(emitLiveJoinMock).toHaveBeenCalledWith(7)
  })

  it('joinByCode returns false and sets error on failure', async () => {
    apiMock.mockResolvedValue(null)
    const s = useLiveStore()
    const ok = await s.joinByCode('INVALID')
    expect(ok).toBe(false)
    expect(s.error).toBe('Code de session invalide ou session introuvable')
    expect(s.currentSession).toBeNull()
  })

  // ── startSession ────────────────────────────────────────────────────────────

  it('startSession updates status to active', async () => {
    const updated = { id: 1, promo_id: 7, status: 'active' }
    apiMock.mockResolvedValue(updated)

    const s = useLiveStore()
    s.currentSession = { id: 1, promo_id: 7, status: 'waiting', activities: [] } as any
    const ok = await s.startSession(1)
    expect(ok).toBe(true)
    expect(s.currentSession!.status).toBe('active')
  })

  it('startSession returns false on api failure', async () => {
    apiMock.mockResolvedValue(null)
    const s = useLiveStore()
    s.currentSession = { id: 1, promo_id: 7, status: 'waiting' } as any
    const ok = await s.startSession(1)
    expect(ok).toBe(false)
  })

  // ── fetchDraftSessions ──────────────────────────────────────────────────────

  it('fetchDraftSessions populates draftSessions', async () => {
    const sessions = [
      { id: 1, title: 'Draft 1', status: 'waiting' },
      { id: 2, title: 'Draft 2', status: 'waiting' },
    ]
    apiMock.mockResolvedValue(sessions)

    const s = useLiveStore()
    await s.fetchDraftSessions(7)
    expect(s.draftSessions).toEqual(sessions)
  })

  it('fetchDraftSessions does not overwrite on null response', async () => {
    apiMock.mockResolvedValue(null)
    const s = useLiveStore()
    s.draftSessions = [{ id: 99 }] as any
    await s.fetchDraftSessions(7)
    expect(s.draftSessions).toEqual([{ id: 99 }])
  })

  // ── deleteSession ───────────────────────────────────────────────────────────

  it('deleteSession removes session from draftSessions', async () => {
    apiMock.mockResolvedValue({})
    const s = useLiveStore()
    s.draftSessions = [{ id: 1 }, { id: 2 }, { id: 3 }] as any
    const ok = await s.deleteSession(2)
    expect(ok).toBe(true)
    expect(s.draftSessions).toHaveLength(2)
    expect(s.draftSessions.find((d: any) => d.id === 2)).toBeUndefined()
  })

  it('deleteSession also calls leaveSession if deleting the current session', async () => {
    apiMock.mockResolvedValue({})
    const s = useLiveStore()
    s.currentSession = { id: 5, promo_id: 7 } as any
    s.draftSessions = [{ id: 5 }] as any
    const ok = await s.deleteSession(5)
    expect(ok).toBe(true)
    expect(s.currentSession).toBeNull()
    expect(emitLiveLeaveMock).toHaveBeenCalledWith(7)
  })

  // ── initSocketListeners / disposeSocketListeners ────────────────────────────

  it('initSocketListeners registers all socket handlers', () => {
    const s = useLiveStore()
    const wApi = (window as any).api
    s.initSocketListeners()

    expect(wApi.onLiveActivityPushed).toHaveBeenCalled()
    expect(wApi.onLiveActivityClosed).toHaveBeenCalled()
    expect(wApi.onLiveResultsUpdate).toHaveBeenCalled()
    expect(wApi.onLiveScoresUpdate).toHaveBeenCalled()
    expect(wApi.onLiveSessionStarted).toHaveBeenCalled()
    expect(wApi.onLiveSessionEnded).toHaveBeenCalled()
  })

  it('disposeSocketListeners calls all cleanup functions', () => {
    const cleanup1 = vi.fn()
    const cleanup2 = vi.fn()
    const wApi = (window as any).api
    wApi.onLiveActivityPushed.mockReturnValue(cleanup1)
    wApi.onLiveActivityClosed.mockReturnValue(cleanup2)

    const s = useLiveStore()
    s.initSocketListeners()
    s.disposeSocketListeners()

    expect(cleanup1).toHaveBeenCalled()
    expect(cleanup2).toHaveBeenCalled()
  })

  it('initSocketListeners disposes previous listeners before registering new ones', () => {
    const cleanup = vi.fn()
    const wApi = (window as any).api
    wApi.onLiveActivityPushed.mockReturnValue(cleanup)

    const s = useLiveStore()
    s.initSocketListeners()
    s.initSocketListeners() // second call should dispose first

    expect(cleanup).toHaveBeenCalled()
  })
})
