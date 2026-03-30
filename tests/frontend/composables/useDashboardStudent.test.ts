import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: vi.fn().mockResolvedValue(null) }),
}))

vi.mock('@/composables/useClockTimer', () => ({
  useClockTimer: (_cb: () => void, _opts: unknown) => ({
    now: { value: Date.now() },
    start: vi.fn(),
    cleanup: vi.fn(),
  }),
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: { SESSION: 's', NAV_STATE: 'n', PREFS: 'p', MUTED_DMS: 'm' },
  NOTIFICATION_HISTORY_LIMIT: 50,
  MAX_MESSAGE_LENGTH: 5000,
  MESSAGE_PAGE_SIZE: 50,
  GROUP_THRESHOLD_MS: 300000,
  TYPING_TIMEOUT_MS: 3000,
}))

const localStorageMock = {
  getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(),
  clear: vi.fn(), length: 0, key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

;(window as unknown as { api: Record<string, unknown> }).api = {
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useDashboardStudent } from '@/composables/useDashboardStudent'
import { useTravauxStore } from '@/stores/travaux'
import type { Devoir } from '@/types'

function makeDevoir(overrides: Partial<Devoir> = {}): Devoir {
  return {
    id: 1, title: 'TP1', description: null, channel_id: 1,
    type: 'livrable', category: 'Web', deadline: '2030-06-01',
    start_date: null, is_published: 1, assigned_to: 'all',
    group_id: null, depot_id: null, requires_submission: 1,
    ...overrides,
  }
}

describe('useDashboardStudent', () => {
  let travauxStore: ReturnType<typeof useTravauxStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    travauxStore = useTravauxStore()
  })

  // ── studentStats ────────────────────────────────────────────────────────
  it('computes stats with empty devoirs', () => {
    travauxStore.devoirs = []
    const { studentStats } = useDashboardStudent()
    expect(studentStats.value).toEqual({
      total: 0, submitted: 0, pending: 0, graded: 0, modeGrade: null,
    })
  })

  it('computes stats correctly', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, depot_id: 10, note: 'A' }),
      makeDevoir({ id: 2, depot_id: 11, note: 'B' }),
      makeDevoir({ id: 3, depot_id: 12, note: 'A' }),
      makeDevoir({ id: 4, depot_id: null }),
      makeDevoir({ id: 5, depot_id: null, requires_submission: 0 }),
    ] as Devoir[]
    const { studentStats } = useDashboardStudent()
    expect(studentStats.value.total).toBe(5)
    expect(studentStats.value.submitted).toBe(3)
    expect(studentStats.value.pending).toBe(1) // only id:4 (requires_submission=1)
    expect(studentStats.value.graded).toBe(3)
    expect(studentStats.value.modeGrade).toBe('A') // A appears 2x
  })

  // ── recentGrades ──────────────────────────────────────────────────────
  it('returns up to 3 recent grades', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, depot_id: 10, note: 'A' }),
      makeDevoir({ id: 2, depot_id: 20, note: 'B' }),
      makeDevoir({ id: 3, depot_id: 30, note: 'C' }),
      makeDevoir({ id: 4, depot_id: 40, note: 'D' }),
    ] as Devoir[]
    const { recentGrades } = useDashboardStudent()
    expect(recentGrades.value.length).toBe(3)
  })

  it('excludes NA grades', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, depot_id: 10, note: 'NA' }),
      makeDevoir({ id: 2, depot_id: 20, note: 'A' }),
    ] as Devoir[]
    const { recentGrades } = useDashboardStudent()
    expect(recentGrades.value.length).toBe(1)
    expect(recentGrades.value[0].note).toBe('A')
  })

  // ── urgentActions ─────────────────────────────────────────────────────
  it('returns pending devoirs sorted by deadline', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, depot_id: null, deadline: '2030-12-01' }),
      makeDevoir({ id: 2, depot_id: null, deadline: '2030-06-01' }),
      makeDevoir({ id: 3, depot_id: 10 }), // already submitted
    ] as Devoir[]
    const { urgentActions } = useDashboardStudent()
    expect(urgentActions.value.length).toBe(2)
    expect(urgentActions.value[0].id).toBe(2) // earlier deadline first
  })

  it('marks overdue devoirs', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, depot_id: null, deadline: '2020-01-01' }),
    ] as Devoir[]
    const { urgentActions } = useDashboardStudent()
    expect(urgentActions.value[0].isOverdue).toBe(true)
    expect(urgentActions.value[0].urgency).toMatch(/retard/i)
  })

  it('returns max 5 urgent actions', () => {
    travauxStore.devoirs = Array.from({ length: 10 }, (_, i) =>
      makeDevoir({ id: i + 1, depot_id: null, deadline: `2030-0${(i % 9) + 1}-01` }),
    ) as Devoir[]
    const { urgentActions } = useDashboardStudent()
    expect(urgentActions.value.length).toBeLessThanOrEqual(5)
  })

  // ── recentFeedback ────────────────────────────────────────────────────
  it('returns devoirs with non-empty feedback', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, depot_id: 10, feedback: 'Great work!' }),
      makeDevoir({ id: 2, depot_id: 20, feedback: '' }),
      makeDevoir({ id: 3, depot_id: 30, feedback: null }),
      makeDevoir({ id: 4, depot_id: 40, feedback: 'Needs improvement' }),
    ] as Devoir[]
    const { recentFeedback } = useDashboardStudent()
    expect(recentFeedback.value.length).toBe(2)
  })

  // ── studentProjectCards ───────────────────────────────────────────────
  it('groups devoirs by category into project cards', () => {
    travauxStore.devoirs = [
      makeDevoir({ id: 1, category: 'Web Dev', depot_id: 10 }),
      makeDevoir({ id: 2, category: 'Web Dev', depot_id: null }),
      makeDevoir({ id: 3, category: 'Data Science', depot_id: 20, note: 'A' }),
    ] as Devoir[]
    const { studentProjectCards } = useDashboardStudent()
    expect(studentProjectCards.value.length).toBe(2)
    const webCard = studentProjectCards.value.find(c => c.key === 'Web Dev')
    expect(webCard).toBeDefined()
    expect(webCard!.total).toBe(2)
    expect(webCard!.submitted).toBe(1)
    expect(webCard!.pending).toBe(1)
  })

  // ── loadStudentData ───────────────────────────────────────────────────
  it('loadStudentData sets loadingStudent to false', async () => {
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const { loadStudentData, loadingStudent } = useDashboardStudent()
    expect(loadingStudent.value).toBe(true)
    await loadStudentData()
    expect(loadingStudent.value).toBe(false)
  })
})
