import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  updateTravailPublished: vi.fn().mockResolvedValue({ ok: true }),
}

import { useDevoirsTeacher } from '@/composables/useDevoirsTeacher'
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import type { GanttRow } from '@/types'

const DAY = 86_400_000

function g(overrides: Partial<GanttRow> = {}): GanttRow {
  return {
    id: 1, title: 'TP1', description: null, deadline: '2026-04-10',
    start_date: null, type: 'livrable', published: 1, is_published: 1,
    category: 'Web', channel_id: 1, channel_name: 'general',
    promo_name: 'Promo A', promo_color: '#4A90D9', depots_count: 5, students_total: 30,
    ...overrides,
  } as GanttRow
}

describe('useDevoirsTeacher', () => {
  let appStore: ReturnType<typeof useAppStore>
  let travauxStore: ReturnType<typeof useTravauxStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    travauxStore = useTravauxStore()
    appStore.currentUser = { id: -1, name: 'Prof', avatar_initials: 'P', photo_data: null, type: 'teacher', promo_id: null, promo_name: null }
    travauxStore.allRendus = []
  })

  // ── unifiedGrouped ────────────────────────────────────────────────────
  describe('unifiedGrouped', () => {
    it('groups by category', () => {
      travauxStore.ganttData = [
        g({ id: 1, category: 'Web' }),
        g({ id: 2, category: 'Data' }),
        g({ id: 3, category: 'Web' }),
      ] as GanttRow[]
      const { unifiedGrouped } = useDevoirsTeacher()
      expect(unifiedGrouped.value.length).toBe(2)
      const web = unifiedGrouped.value.find(([cat]) => cat === 'Web')
      expect(web![1].length).toBe(2)
    })

    it('assigns Sans projet for null category', () => {
      travauxStore.ganttData = [g({ category: null })] as GanttRow[]
      const { unifiedGrouped } = useDevoirsTeacher()
      expect(unifiedGrouped.value[0][0]).toBe('Sans projet')
    })

    it('filters by category', () => {
      travauxStore.ganttData = [g({ id: 1, category: 'Web' }), g({ id: 2, category: 'Data' })] as GanttRow[]
      const teacher = useDevoirsTeacher()
      teacher.filterCategory.value = 'Web'
      expect(teacher.unifiedGrouped.value.length).toBe(1)
    })

    it('filters by search', () => {
      travauxStore.ganttData = [g({ id: 1, title: 'React TP' }), g({ id: 2, title: 'SQL Exam' })] as GanttRow[]
      const teacher = useDevoirsTeacher()
      teacher.teacherSearch.value = 'react'
      expect(teacher.unifiedGrouped.value.flatMap(([, rows]) => rows).length).toBe(1)
    })

    it('filters draft status', () => {
      travauxStore.ganttData = [
        g({ id: 1, is_published: 1 }),
        g({ id: 2, is_published: 0 }),
      ] as GanttRow[]
      const teacher = useDevoirsTeacher()
      teacher.filterStatus.value = 'draft'
      const all = teacher.unifiedGrouped.value.flatMap(([, rows]) => rows)
      expect(all.length).toBe(1)
      expect(all[0].statusLabel).toBe('Brouillon')
    })

    it('computes status labels correctly', () => {
      const past = new Date(Date.now() - DAY).toISOString()
      travauxStore.ganttData = [
        g({ id: 1, is_published: 0 }),
        g({ id: 2, is_published: 1, depots_count: 30, students_total: 30 }),
        g({ id: 3, is_published: 1, deadline: past }),
      ] as GanttRow[]
      const { unifiedGrouped } = useDevoirsTeacher()
      const all = unifiedGrouped.value.flatMap(([, rows]) => rows)
      expect(all.find(r => r.id === 1)!.statusLabel).toBe('Brouillon')
      expect(all.find(r => r.id === 2)!.statusLabel).toBe('Complet')
      expect(all.find(r => r.id === 3)!.statusLabel).toBe('Expiré')
    })
  })

  // ── ganttItems ────────────────────────────────────────────────────────
  describe('ganttItems', () => {
    it('returns empty for no data', () => {
      travauxStore.ganttData = []
      const { ganttItems } = useDevoirsTeacher()
      expect(ganttItems.value.items).toEqual([])
      expect(ganttItems.value.todayPct).toBe(0)
    })

    it('computes left/width percentages', () => {
      travauxStore.ganttData = [
        g({ id: 1, start_date: '2026-04-01', deadline: '2026-04-10' }),
        g({ id: 2, start_date: '2026-04-05', deadline: '2026-04-15' }),
      ] as GanttRow[]
      const { ganttItems } = useDevoirsTeacher()
      const { items } = ganttItems.value
      expect(items.length).toBe(2)
      // First item starts at beginning of range
      expect(items[0].left).toBeGreaterThanOrEqual(0)
      expect(items[0].width).toBeGreaterThan(0)
      // Total span should be coherent
      for (const item of items) {
        expect(item.left + item.width).toBeLessThanOrEqual(102) // allow small rounding
      }
    })

    it('defaults start_date to deadline - 7 days', () => {
      travauxStore.ganttData = [g({ start_date: null, deadline: '2026-04-10' })] as GanttRow[]
      const { ganttItems } = useDevoirsTeacher()
      expect(ganttItems.value.items[0].width).toBeGreaterThan(0)
    })

    it('minimum width is 2%', () => {
      // Very short span relative to range
      travauxStore.ganttData = [
        g({ id: 1, start_date: '2026-01-01', deadline: '2026-01-02' }),
        g({ id: 2, start_date: '2026-01-01', deadline: '2026-12-31' }),
      ] as GanttRow[]
      const { ganttItems } = useDevoirsTeacher()
      expect(ganttItems.value.items[0].width).toBeGreaterThanOrEqual(2)
    })
  })

  // ── globalDrafts / globalToGrade ──────────────────────────────────────
  describe('global stats', () => {
    it('counts drafts', () => {
      travauxStore.ganttData = [
        g({ is_published: 0 }),
        g({ is_published: 1 }),
        g({ is_published: 0 }),
      ] as GanttRow[]
      const { globalDrafts } = useDevoirsTeacher()
      expect(globalDrafts.value).toBe(2)
    })

    it('counts rendus to grade', () => {
      travauxStore.allRendus = [
        { travail_id: 1, student_name: 'A', submitted_at: '2026-04-01', note: null },
        { travail_id: 1, student_name: 'B', submitted_at: '2026-04-01', note: 'A' },
        { travail_id: 2, student_name: 'C', submitted_at: '2026-04-02', note: null },
      ] as any[]
      const { globalToGrade } = useDevoirsTeacher()
      expect(globalToGrade.value).toBe(2)
    })
  })

  // ── projectStats ──────────────────────────────────────────────────────
  describe('projectStats', () => {
    it('calculates submission percentage', () => {
      travauxStore.ganttData = [
        g({ id: 1, category: 'Web', depots_count: 10, students_total: 30 }),
        g({ id: 2, category: 'Web', depots_count: 20, students_total: 30 }),
      ] as GanttRow[]
      travauxStore.allRendus = []
      const { projectStats } = useDevoirsTeacher()
      const stats = projectStats('Web')
      expect(stats.totalDepots).toBe(30)
      expect(stats.totalExpected).toBe(60)
      expect(stats.pct).toBe(50)
    })
  })

  // ── teacherCategories ─────────────────────────────────────────────────
  describe('teacherCategories', () => {
    it('returns sorted unique categories', () => {
      travauxStore.ganttData = [
        g({ category: 'Data' }), g({ category: 'Web' }), g({ category: 'Web' }),
      ] as GanttRow[]
      const { teacherCategories } = useDevoirsTeacher()
      expect(teacherCategories.value).toEqual(['Data', 'Web'])
    })
  })

  // ── toggleProjectCollapse ─────────────────────────────────────────────
  describe('toggleProjectCollapse', () => {
    it('toggles collapse state', () => {
      const { collapsedProjects, toggleProjectCollapse } = useDevoirsTeacher()
      toggleProjectCollapse('Web')
      expect(collapsedProjects.value.has('Web')).toBe(true)
      toggleProjectCollapse('Web')
      expect(collapsedProjects.value.has('Web')).toBe(false)
    })
  })

  // ── upcomingDevoirs ───────────────────────────────────────────────────
  describe('upcomingDevoirs', () => {
    it('returns max 5 upcoming published devoirs', () => {
      const future = (d: number) => new Date(Date.now() + d * DAY).toISOString()
      travauxStore.ganttData = Array.from({ length: 10 }, (_, i) =>
        g({ id: i + 1, deadline: future(i + 1), is_published: 1 }),
      ) as GanttRow[]
      const { upcomingDevoirs } = useDevoirsTeacher()
      expect(upcomingDevoirs.value.length).toBe(5)
      // Sorted by deadline
      for (let i = 1; i < upcomingDevoirs.value.length; i++) {
        expect(new Date(upcomingDevoirs.value[i].deadline).getTime())
          .toBeGreaterThanOrEqual(new Date(upcomingDevoirs.value[i - 1].deadline).getTime())
      }
    })
  })
})
