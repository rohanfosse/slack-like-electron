import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── Mocks ────────────────────────────────────────────────────────────────────
const showToast = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: vi.fn().mockResolvedValue(null) }),
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

import { useTeacherGrading } from '@/composables/useTeacherGrading'
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'

describe('useTeacherGrading', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const appStore = useAppStore()
    appStore.currentUser = { id: -1, name: 'Prof', avatar_initials: 'P', photo_data: null, type: 'teacher', promo_id: null, promo_name: null }
    showToast.mockClear()
  })

  it('initializes with no editing state', () => {
    const grading = useTeacherGrading()
    expect(grading.editingDepotId.value).toBeNull()
    expect(grading.pendingNoteValue.value).toBe('')
    expect(grading.pendingFeedbackValue.value).toBe('')
    expect(grading.savingGrade.value).toBe(false)
  })

  it('startEditGrade sets editing state', () => {
    const grading = useTeacherGrading()
    grading.startEditGrade(42, 'B', 'Bon travail')
    expect(grading.editingDepotId.value).toBe(42)
    expect(grading.pendingNoteValue.value).toBe('B')
    expect(grading.pendingFeedbackValue.value).toBe('Bon travail')
  })

  it('startEditGrade handles null values', () => {
    const grading = useTeacherGrading()
    grading.startEditGrade(10, null, null)
    expect(grading.editingDepotId.value).toBe(10)
    expect(grading.pendingNoteValue.value).toBe('')
    expect(grading.pendingFeedbackValue.value).toBe('')
  })

  it('cancelEditGrade resets editing', () => {
    const grading = useTeacherGrading()
    grading.startEditGrade(42, 'A', 'Parfait')
    grading.cancelEditGrade()
    expect(grading.editingDepotId.value).toBeNull()
  })

  // ── canSave validation ──────────────────────────────────────────────────
  it('canSave allows letter grades A-F', () => {
    const grading = useTeacherGrading()
    for (const note of ['A', 'B', 'C', 'D', 'E', 'F', 'a', 'f']) {
      grading.pendingNoteValue.value = note
      expect(grading.canSave.value).toBe(true)
    }
  })

  it('canSave allows numeric grades', () => {
    const grading = useTeacherGrading()
    for (const note of ['0', '10', '15.5', '20', '100']) {
      grading.pendingNoteValue.value = note
      expect(grading.canSave.value).toBe(true)
    }
  })

  it('canSave allows empty (no note)', () => {
    const grading = useTeacherGrading()
    grading.pendingNoteValue.value = ''
    expect(grading.canSave.value).toBe(true)
  })

  it('canSave rejects invalid formats', () => {
    const grading = useTeacherGrading()
    for (const note of ['AB', 'hello', 'G', 'X', '12/20', 'NA']) {
      grading.pendingNoteValue.value = note
      expect(grading.canSave.value).toBe(false)
    }
  })

  // ── saveGrade ───────────────────────────────────────────────────────────
  it('saveGrade shows error toast for invalid note', async () => {
    const grading = useTeacherGrading()
    grading.pendingNoteValue.value = 'INVALID'
    await grading.saveGrade(1)
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/invalide/i), 'error')
  })

  it('saveGrade calls store methods and resets on success', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'setNote').mockResolvedValue(undefined)
    vi.spyOn(travauxStore, 'setFeedback').mockResolvedValue(undefined)
    vi.spyOn(travauxStore, 'fetchRendus').mockResolvedValue(undefined)

    const appStore = useAppStore()
    appStore.activePromoId = 1

    const grading = useTeacherGrading()
    grading.startEditGrade(5, 'B', 'Nice')
    await grading.saveGrade(5)

    expect(travauxStore.setNote).toHaveBeenCalledWith({ depotId: 5, note: 'B' })
    expect(travauxStore.setFeedback).toHaveBeenCalledWith({ depotId: 5, feedback: 'Nice' })
    expect(grading.editingDepotId.value).toBeNull()
    expect(grading.savingGrade.value).toBe(false)
  })

  it('saveGrade trims whitespace from note and feedback', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'setNote').mockResolvedValue(undefined)
    vi.spyOn(travauxStore, 'setFeedback').mockResolvedValue(undefined)
    vi.spyOn(travauxStore, 'fetchRendus').mockResolvedValue(undefined)

    const grading = useTeacherGrading()
    grading.startEditGrade(1, null, null)
    grading.pendingNoteValue.value = '  A  '
    grading.pendingFeedbackValue.value = '  Good work  '
    await grading.saveGrade(1)

    expect(travauxStore.setNote).toHaveBeenCalledWith({ depotId: 1, note: 'A' })
    expect(travauxStore.setFeedback).toHaveBeenCalledWith({ depotId: 1, feedback: 'Good work' })
  })

  it('saveGrade passes null for empty note/feedback', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'setNote').mockResolvedValue(undefined)
    vi.spyOn(travauxStore, 'setFeedback').mockResolvedValue(undefined)
    vi.spyOn(travauxStore, 'fetchRendus').mockResolvedValue(undefined)

    const grading = useTeacherGrading()
    grading.startEditGrade(1, null, null)
    grading.pendingNoteValue.value = ''
    grading.pendingFeedbackValue.value = ''
    await grading.saveGrade(1)

    expect(travauxStore.setNote).toHaveBeenCalledWith({ depotId: 1, note: null })
    expect(travauxStore.setFeedback).toHaveBeenCalledWith({ depotId: 1, feedback: null })
  })
})
