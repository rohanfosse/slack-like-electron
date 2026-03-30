import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ api: vi.fn().mockResolvedValue(null) }) }))
vi.mock('@/constants', () => ({
  STORAGE_KEYS: { SESSION: 's', NAV_STATE: 'n', PREFS: 'p', MUTED_DMS: 'm' },
  NOTIFICATION_HISTORY_LIMIT: 50, MAX_MESSAGE_LENGTH: 5000, MESSAGE_PAGE_SIZE: 50,
  GROUP_THRESHOLD_MS: 300000, TYPING_TIMEOUT_MS: 3000,
  MAX_ACTION_ITEMS: 6,
  URGENCY_ORDER: { critical: 0, warning: 1, info: 2 },
}))

const localStorageMock = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), length: 0, key: vi.fn(() => null) }
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
;(window as unknown as { api: Record<string, unknown> }).api = {
  setToken: vi.fn(), onSocketStateChange: vi.fn(() => () => {}), onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}), getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useActionCenter } from '@/composables/useActionCenter'
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import type { GanttRow } from '@/composables/useDashboardTeacher'

const DAY = 86_400_000

function makeRow(overrides: Partial<GanttRow> = {}): GanttRow {
  return {
    id: 1, title: 'TP1', deadline: '2026-04-05', start_date: null,
    type: 'livrable', published: 1, category: 'Web', channel_name: 'general',
    promo_name: 'Promo A', promo_color: '#4A90D9', depots_count: 5, students_total: 30,
    ...overrides,
  } as GanttRow
}

describe('useActionCenter', () => {
  let appStore: ReturnType<typeof useAppStore>
  let travauxStore: ReturnType<typeof useTravauxStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    travauxStore = useTravauxStore()
    appStore.currentUser = { id: -1, name: 'Prof', avatar_initials: 'P', photo_data: null, type: 'teacher', promo_id: null, promo_name: null }
  })

  // ── actionItems ───────────────────────────────────────────────────────
  describe('actionItems', () => {
    it('generates grade action for expired devoir with depots', () => {
      const pastDeadline = new Date(Date.now() - 2 * DAY).toISOString()
      const gantt = ref([makeRow({ id: 1, deadline: pastDeadline, depots_count: 5, published: 1 })])
      const { actionItems } = useActionCenter(gantt)
      const gradeItem = actionItems.value.find(i => i.type === 'grade')
      expect(gradeItem).toBeDefined()
      expect(gradeItem!.subtitle).toMatch(/rendu/)
    })

    it('generates critical grade action for old expired devoir (>7 days)', () => {
      const oldDeadline = new Date(Date.now() - 10 * DAY).toISOString()
      const gantt = ref([makeRow({ id: 1, deadline: oldDeadline, depots_count: 3, published: 1 })])
      const { actionItems } = useActionCenter(gantt)
      const gradeItem = actionItems.value.find(i => i.type === 'grade')
      expect(gradeItem!.urgency).toBe('critical')
    })

    it('generates deadline warning for imminent devoir with low submission', () => {
      const soonDeadline = new Date(Date.now() + 1 * DAY).toISOString()
      const gantt = ref([makeRow({ id: 1, deadline: soonDeadline, depots_count: 2, students_total: 30, published: 1 })])
      const { actionItems } = useActionCenter(gantt)
      const deadlineItem = actionItems.value.find(i => i.type === 'deadline')
      expect(deadlineItem).toBeDefined()
      expect(deadlineItem!.urgency).toBe('critical') // < 25%
    })

    it('generates late action for expired with very low submission rate', () => {
      const pastDeadline = new Date(Date.now() - 1 * DAY).toISOString()
      const gantt = ref([makeRow({ id: 1, deadline: pastDeadline, depots_count: 2, students_total: 30, published: 1 })])
      const { actionItems } = useActionCenter(gantt)
      const lateItem = actionItems.value.find(i => i.type === 'late')
      expect(lateItem).toBeDefined()
      expect(lateItem!.urgency).toBe('critical')
      expect(lateItem!.subtitle).toMatch(/2\/30/)
    })

    it('generates draft action for unpublished devoir with upcoming deadline', () => {
      const soonDeadline = new Date(Date.now() + 3 * DAY).toISOString()
      const gantt = ref([makeRow({ id: 1, deadline: soonDeadline, published: 0 })])
      const { actionItems } = useActionCenter(gantt)
      const draftItem = actionItems.value.find(i => i.type === 'draft')
      expect(draftItem).toBeDefined()
      expect(draftItem!.subtitle).toMatch(/brouillon/i)
    })

    it('skips unpublished devoirs for grade/deadline/late', () => {
      const gantt = ref([makeRow({ published: 0, depots_count: 5, deadline: new Date(Date.now() - DAY).toISOString() })])
      const { actionItems } = useActionCenter(gantt)
      expect(actionItems.value.filter(i => i.type === 'grade')).toEqual([])
    })

    it('sorts by urgency (critical first)', () => {
      const past = new Date(Date.now() - 10 * DAY).toISOString()
      const soon = new Date(Date.now() + 5 * DAY).toISOString()
      const gantt = ref([
        makeRow({ id: 1, deadline: soon, published: 0 }), // info draft
        makeRow({ id: 2, deadline: past, depots_count: 5, published: 1 }), // critical grade
      ])
      const { actionItems } = useActionCenter(gantt)
      if (actionItems.value.length >= 2) {
        expect(actionItems.value[0].urgency).toBe('critical')
      }
    })

    it('limits to MAX_ACTION_ITEMS', () => {
      const past = new Date(Date.now() - DAY).toISOString()
      const rows = Array.from({ length: 20 }, (_, i) =>
        makeRow({ id: i + 1, deadline: past, depots_count: 3, published: 1 }),
      )
      const gantt = ref(rows)
      const { actionItems } = useActionCenter(gantt)
      expect(actionItems.value.length).toBeLessThanOrEqual(6)
    })

    it('returns empty for no data', () => {
      const gantt = ref<GanttRow[]>([])
      const { actionItems } = useActionCenter(gantt)
      expect(actionItems.value).toEqual([])
    })
  })

  // ── classHealth ───────────────────────────────────────────────────────
  describe('classHealth', () => {
    it('returns null with no published data', () => {
      const gantt = ref<GanttRow[]>([])
      const { classHealth } = useActionCenter(gantt)
      expect(classHealth.value).toBeNull()
    })

    it('calculates excellent health for high submission rates', () => {
      const futureDeadline = new Date(Date.now() + 10 * DAY).toISOString()
      const gantt = ref([
        makeRow({ depots_count: 28, students_total: 30, deadline: futureDeadline, published: 1 }),
        makeRow({ depots_count: 27, students_total: 30, deadline: futureDeadline, published: 1 }),
      ])
      const { classHealth } = useActionCenter(gantt)
      expect(classHealth.value).not.toBeNull()
      expect(classHealth.value!.score).toBeGreaterThanOrEqual(80)
      expect(classHealth.value!.status).toBe('excellent')
    })

    it('calculates critical health for very low submissions', () => {
      const pastDeadline = new Date(Date.now() - 10 * DAY).toISOString()
      const gantt = ref([
        makeRow({ depots_count: 1, students_total: 30, deadline: pastDeadline, published: 1 }),
        makeRow({ depots_count: 2, students_total: 30, deadline: pastDeadline, published: 1 }),
      ])
      const { classHealth } = useActionCenter(gantt)
      expect(classHealth.value!.score).toBeLessThan(40)
      expect(classHealth.value!.status).toBe('critical')
    })

    it('skips unpublished and zero-student rows', () => {
      const gantt = ref([
        makeRow({ published: 0, depots_count: 30, students_total: 30 }),
        makeRow({ published: 1, students_total: 0 }),
      ])
      const { classHealth } = useActionCenter(gantt)
      expect(classHealth.value).toBeNull()
    })
  })

  // ── submissionTrend ───────────────────────────────────────────────────
  describe('submissionTrend', () => {
    it('returns 7 days of trend data', () => {
      travauxStore.allRendus = []
      const gantt = ref<GanttRow[]>([])
      const { submissionTrend } = useActionCenter(gantt)
      expect(submissionTrend.value.days.length).toBe(7)
      expect(submissionTrend.value.maxCount).toBeGreaterThanOrEqual(1)
    })

    it('counts submissions by day', () => {
      const today = new Date().toISOString().slice(0, 10)
      travauxStore.allRendus = [
        { travail_id: 1, student_name: 'A', submitted_at: `${today}T10:00:00Z`, note: null },
        { travail_id: 2, student_name: 'B', submitted_at: `${today}T11:00:00Z`, note: null },
      ] as any[]
      const gantt = ref<GanttRow[]>([])
      const { submissionTrend } = useActionCenter(gantt)
      const todayEntry = submissionTrend.value.days[submissionTrend.value.days.length - 1]
      expect(todayEntry.count).toBe(2)
    })
  })
})
