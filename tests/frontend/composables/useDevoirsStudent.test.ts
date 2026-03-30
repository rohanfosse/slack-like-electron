import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ api: vi.fn().mockResolvedValue(null) }) }))
vi.mock('@/constants', () => ({
  STORAGE_KEYS: { SESSION: 's', NAV_STATE: 'n', PREFS: 'p', MUTED_DMS: 'm' },
  NOTIFICATION_HISTORY_LIMIT: 50, MAX_MESSAGE_LENGTH: 5000, MESSAGE_PAGE_SIZE: 50,
  GROUP_THRESHOLD_MS: 300000, TYPING_TIMEOUT_MS: 3000,
}))

const localStorageMock = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), length: 0, key: vi.fn(() => null) }
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
;(window as unknown as { api: Record<string, unknown> }).api = {
  setToken: vi.fn(), onSocketStateChange: vi.fn(() => () => {}), onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}), getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useDevoirsStudent } from '@/composables/useDevoirsStudent'
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import type { Devoir } from '@/types'

const NOW = new Date('2026-04-01T12:00:00Z').getTime()
const DAY = 86_400_000

function d(overrides: Partial<Devoir> = {}): Devoir {
  return {
    id: 1, title: 'TP', description: null, channel_id: 1, type: 'livrable',
    category: 'Web', deadline: '2026-04-10', start_date: null, is_published: 1,
    assigned_to: 'all', group_id: null, depot_id: null, requires_submission: 1,
    ...overrides,
  }
}

describe('useDevoirsStudent', () => {
  let travauxStore: ReturnType<typeof useTravauxStore>
  let appStore: ReturnType<typeof useAppStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    travauxStore = useTravauxStore()
    appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'student', promo_id: 1, promo_name: 'P' }
  })

  // ── studentGroups categorization ──────────────────────────────────────
  describe('studentGroups', () => {
    it('categorizes submitted devoirs', () => {
      travauxStore.devoirs = [d({ id: 1, depot_id: 10 })] as Devoir[]
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      expect(studentGroups.value.submitted.length).toBe(1)
    })

    it('categorizes overdue devoirs', () => {
      travauxStore.devoirs = [d({ id: 1, deadline: '2026-03-01' })] as Devoir[]
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      expect(studentGroups.value.overdue.length).toBe(1)
    })

    it('categorizes urgent devoirs (< 3 days)', () => {
      const deadline = new Date(NOW + 2 * DAY).toISOString()
      travauxStore.devoirs = [d({ id: 1, deadline })] as Devoir[]
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      expect(studentGroups.value.urgent.length).toBe(1)
    })

    it('categorizes pending devoirs (> 3 days)', () => {
      const deadline = new Date(NOW + 10 * DAY).toISOString()
      travauxStore.devoirs = [d({ id: 1, deadline })] as Devoir[]
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      expect(studentGroups.value.pending.length).toBe(1)
    })

    it('categorizes event devoirs (no submission required)', () => {
      travauxStore.devoirs = [d({ id: 1, requires_submission: 0, deadline: '2026-04-10' })] as Devoir[]
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      expect(studentGroups.value.event.length).toBe(1)
    })

    it('puts expired events into submitted', () => {
      travauxStore.devoirs = [d({ id: 1, requires_submission: 0, deadline: '2026-03-01' })] as Devoir[]
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      expect(studentGroups.value.submitted.length).toBe(1)
    })

    it('filters by activeProject', () => {
      travauxStore.devoirs = [
        d({ id: 1, category: 'Web', depot_id: null }),
        d({ id: 2, category: 'Data', depot_id: null }),
      ] as Devoir[]
      appStore.activeProject = 'Web'
      const { studentGroups } = useDevoirsStudent(ref(NOW))
      const total = Object.values(studentGroups.value).reduce((s, arr) => s + arr.length, 0)
      expect(total).toBe(1)
    })
  })

  // ── studentStats ──────────────────────────────────────────────────────
  describe('studentStats', () => {
    it('computes stats correctly', () => {
      travauxStore.devoirs = [
        d({ id: 1, depot_id: 10 }),
        d({ id: 2, deadline: '2026-03-01' }),
        d({ id: 3, deadline: new Date(NOW + DAY).toISOString() }),
      ] as Devoir[]
      const { studentStats } = useDevoirsStudent(ref(NOW))
      expect(studentStats.value.total).toBe(3)
      expect(studentStats.value.submitted).toBe(1)
      expect(studentStats.value.urgent).toBe(2) // overdue + urgent
      expect(studentStats.value.pending).toBe(2)
    })
  })

  // ── studentProjectOverview ────────────────────────────────────────────
  describe('studentProjectOverview', () => {
    it('groups devoirs by category', () => {
      travauxStore.devoirs = [
        d({ id: 1, category: 'Web', depot_id: 10 }),
        d({ id: 2, category: 'Web', depot_id: null }),
        d({ id: 3, category: 'Data', depot_id: 20 }),
      ] as Devoir[]
      appStore.activeProject = null
      const { studentProjectOverview } = useDevoirsStudent(ref(NOW))
      expect(studentProjectOverview.value.length).toBe(2)
      const web = studentProjectOverview.value.find(g => g.key === 'Web')
      expect(web!.submitted).toBe(1)
      expect(web!.pending).toBe(1)
    })

    it('returns empty when activeProject is set', () => {
      travauxStore.devoirs = [d({ category: 'Web' })] as Devoir[]
      appStore.activeProject = 'Web'
      const { studentProjectOverview } = useDevoirsStudent(ref(NOW))
      expect(studentProjectOverview.value).toEqual([])
    })
  })

  // ── studentProjectStats ───────────────────────────────────────────────
  describe('studentProjectStats', () => {
    it('calculates submission percentage', () => {
      travauxStore.devoirs = [
        d({ id: 1, category: 'Web', depot_id: 10 }),
        d({ id: 2, category: 'Web', depot_id: null }),
        d({ id: 3, category: 'Web', depot_id: 20 }),
      ] as Devoir[]
      const { studentProjectStats } = useDevoirsStudent(ref(NOW))
      const stats = studentProjectStats('Web')
      expect(stats.submitted).toBe(2)
      expect(stats.total).toBe(3)
      expect(stats.pct).toBe(67)
    })

    it('returns next deadline', () => {
      const futureDeadline = new Date(NOW + 5 * DAY).toISOString()
      travauxStore.devoirs = [
        d({ id: 1, category: 'Web', deadline: futureDeadline }),
      ] as Devoir[]
      const { studentProjectStats } = useDevoirsStudent(ref(NOW))
      expect(studentProjectStats('Web').nextDeadline).toBe(futureDeadline)
    })
  })

  // ── studentCategories ─────────────────────────────────────────────────
  describe('studentCategories', () => {
    it('extracts unique sorted categories', () => {
      travauxStore.devoirs = [
        d({ category: 'Data' }), d({ category: 'Web' }), d({ category: 'Web' }), d({ category: null }),
      ] as Devoir[]
      const { studentCategories } = useDevoirsStudent(ref(NOW))
      expect(studentCategories.value).toEqual(['Data', 'Web'])
    })
  })

  // ── studentProjectTypeCounts ──────────────────────────────────────────
  describe('studentProjectTypeCounts', () => {
    it('counts devoirs by type within a category', () => {
      travauxStore.devoirs = [
        d({ category: 'Web', type: 'livrable' }),
        d({ category: 'Web', type: 'livrable' }),
        d({ category: 'Web', type: 'soutenance' }),
      ] as Devoir[]
      const { studentProjectTypeCounts } = useDevoirsStudent(ref(NOW))
      const counts = studentProjectTypeCounts('Web')
      expect(counts.find(c => c.type === 'livrable')?.count).toBe(2)
      expect(counts.find(c => c.type === 'soutenance')?.count).toBe(1)
    })
  })
})
