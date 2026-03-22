// ─── Store Pinia - Live Quiz (sessions interactives en temps réel) ───────────
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useAppStore } from './app'
import { useApi } from '@/composables/useApi'
import type { LiveSession, LiveActivity, LiveResults } from '@/types'

export const useLiveStore = defineStore('live', () => {
  const appStore = useAppStore()
  const { api } = useApi()

  // ── État ──────────────────────────────────────────────────────────────────
  const currentSession   = ref<LiveSession | null>(null)
  const currentActivity  = ref<LiveActivity | null>(null)
  const results          = ref<LiveResults | null>(null)
  const participantCount = ref(0)
  const hasResponded     = ref(false)
  const loading          = ref(false)
  const pastSessions     = ref<LiveSession[]>([])

  // ── Computed ─────────────────────────────────────────────────────────────
  const sessionActivities = computed<LiveActivity[]>(() =>
    currentSession.value?.activities ?? [],
  )
  const liveActivity = computed<LiveActivity | null>(() =>
    sessionActivities.value.find(a => a.status === 'live') ?? null,
  )

  // ── Actions ──────────────────────────────────────────────────────────────

  async function createSession(title: string, promoId: number): Promise<boolean> {
    loading.value = true
    try {
      const data = await api<LiveSession>(
        () => window.api.createLiveSession({ title, promoId }),
      )
      if (data) {
        currentSession.value = data
        window.api.emitLiveJoin(promoId)
        return true
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function joinByCode(code: string): Promise<boolean> {
    loading.value = true
    try {
      const data = await api<LiveSession>(
        () => window.api.getLiveSessionByCode(code),
      )
      if (data) {
        currentSession.value = data
        currentActivity.value = data.activities?.find(a => a.status === 'live') ?? null
        hasResponded.value = false
        window.api.emitLiveJoin(data.promo_id)
        return true
      }
      return false
    } finally {
      loading.value = false
    }
  }

  function leaveSession() {
    if (currentSession.value) {
      window.api.emitLiveLeave(currentSession.value.promo_id)
    }
    currentSession.value = null
    currentActivity.value = null
    results.value = null
    hasResponded.value = false
    participantCount.value = 0
  }

  async function fetchSession(id: number): Promise<void> {
    loading.value = true
    try {
      const data = await api<LiveSession>(
        () => window.api.getLiveSession(id),
      )
      if (data) {
        currentSession.value = data
        const live = data.activities?.find(a => a.status === 'live')
        if (live) {
          currentActivity.value = live
          await fetchResults(live.id)
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveForPromo(promoId: number): Promise<boolean> {
    loading.value = true
    try {
      const data = await api<LiveSession>(
        () => window.api.getActiveLiveSession(promoId),
      )
      if (data && data.id) {
        currentSession.value = data
        currentActivity.value = data.activities?.find(a => a.status === 'live') ?? null
        hasResponded.value = false
        window.api.emitLiveJoin(data.promo_id)
        return true
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function pushActivity(sessionId: number, payload: {
    type: 'qcm' | 'sondage' | 'nuage'; title: string
    options?: string[] | null; multi?: number; max_words?: number
  }): Promise<boolean> {
    const data = await api<LiveActivity>(
      () => window.api.addLiveActivity(sessionId, payload),
    )
    if (data && currentSession.value) {
      const acts = currentSession.value.activities ?? []
      currentSession.value = { ...currentSession.value, activities: [...acts, data] }
      return true
    }
    return false
  }

  async function launchActivity(activityId: number): Promise<boolean> {
    const data = await api<LiveActivity>(
      () => window.api.setLiveActivityStatus(activityId, 'live'),
    )
    if (data) {
      currentActivity.value = data
      results.value = null
      // Update in session activities list
      if (currentSession.value?.activities) {
        currentSession.value = {
          ...currentSession.value,
          activities: currentSession.value.activities.map(a =>
            a.id === activityId ? data : { ...a, status: a.status === 'live' ? 'closed' as const : a.status },
          ),
        }
      }
      return true
    }
    return false
  }

  async function closeActivity(activityId: number): Promise<boolean> {
    const data = await api<LiveActivity>(
      () => window.api.setLiveActivityStatus(activityId, 'closed'),
    )
    if (data) {
      currentActivity.value = null
      if (currentSession.value?.activities) {
        currentSession.value = {
          ...currentSession.value,
          activities: currentSession.value.activities.map(a =>
            a.id === activityId ? data : a,
          ),
        }
      }
      return true
    }
    return false
  }

  async function deleteActivity(activityId: number): Promise<boolean> {
    const data = await api(
      () => window.api.deleteLiveActivity(activityId),
    )
    if (data !== null && currentSession.value?.activities) {
      currentSession.value = {
        ...currentSession.value,
        activities: currentSession.value.activities.filter(a => a.id !== activityId),
      }
      return true
    }
    return false
  }

  async function submitResponse(activityId: number, payload: { answers?: number[]; text?: string; words?: string[] }): Promise<boolean> {
    const data = await api(
      () => window.api.submitLiveResponse(activityId, payload),
    )
    if (data !== null) {
      hasResponded.value = true
      return true
    }
    return false
  }

  async function fetchResults(activityId: number): Promise<void> {
    const data = await api<LiveResults>(
      () => window.api.getLiveActivityResults(activityId),
    )
    if (data) results.value = data
  }

  async function endSession(sessionId: number): Promise<boolean> {
    const data = await api(
      () => window.api.updateLiveSessionStatus(sessionId, 'ended'),
    )
    if (data !== null) {
      leaveSession()
      return true
    }
    return false
  }

  async function startSession(sessionId: number): Promise<boolean> {
    const data = await api<LiveSession>(
      () => window.api.updateLiveSessionStatus(sessionId, 'active'),
    )
    if (data) {
      currentSession.value = { ...currentSession.value!, status: 'active' }
      return true
    }
    return false
  }

  // ── Socket listeners ─────────────────────────────────────────────────────
  const _cleanups: (() => void)[] = []

  function initSocketListeners() {
    disposeSocketListeners()

    _cleanups.push(
      window.api.onLiveActivityPushed(({ activity }) => {
        const act = activity as LiveActivity
        if (currentSession.value && act.session_id === currentSession.value.id) {
          const acts = currentSession.value.activities ?? []
          currentSession.value = { ...currentSession.value, activities: [...acts, act] }
        }
      }),
    )

    _cleanups.push(
      window.api.onLiveActivityClosed(({ activityId }: { activityId: number }) => {
        if (currentActivity.value && currentActivity.value.id === activityId) {
          currentActivity.value = Object.assign({}, currentActivity.value, { status: 'closed' as const })
          fetchResults(activityId)
        }
        if (currentSession.value && currentSession.value.activities) {
          currentSession.value = Object.assign({}, currentSession.value, {
            activities: currentSession.value.activities.map(a =>
              a.id === activityId ? { ...a, status: 'closed' as const } : a,
            ),
          })
        }
      }),
    )

    _cleanups.push(
      window.api.onLiveResultsUpdate(({ activityId, data }: { activityId: number; data: unknown }) => {
        if (results.value?.activityId === activityId || currentActivity.value?.id === activityId) {
          results.value = data as LiveResults
        }
      }),
    )

    _cleanups.push(
      window.api.onLiveSessionStarted(({ sessionId }: { sessionId: number }) => {
        if (currentSession.value && currentSession.value.id === sessionId) {
          currentSession.value = Object.assign({}, currentSession.value, { status: 'active' as const })
        }
      }),
    )

    _cleanups.push(
      window.api.onLiveSessionEnded(({ sessionId }: { sessionId: number }) => {
        if (currentSession.value && currentSession.value.id === sessionId) {
          currentSession.value = Object.assign({}, currentSession.value, { status: 'ended' as const })
          currentActivity.value = null
        }
      }),
    )
  }

  function disposeSocketListeners() {
    _cleanups.forEach(fn => fn())
    _cleanups.length = 0
  }

  return {
    // state
    currentSession, currentActivity, results, participantCount,
    hasResponded, loading, pastSessions,
    // computed
    sessionActivities, liveActivity,
    // actions
    createSession, joinByCode, leaveSession, fetchSession, fetchActiveForPromo,
    pushActivity, launchActivity, closeActivity, deleteActivity,
    submitResponse, fetchResults, endSession, startSession,
    initSocketListeners, disposeSocketListeners,
  }
})
