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

vi.mock('@/utils/devoir', () => ({
  isExpired: (deadline: string, now: number) => new Date(deadline).getTime() < now,
}))

vi.mock('@/utils/depositValidation', () => ({
  validateDeposit: (file: { name: string; size: number } | null, _deadline: string) => {
    if (!file) return { valid: false, error: 'Aucun fichier' }
    if (file.name.endsWith('.exe')) return { valid: false, error: 'Extension non autorisee' }
    return { valid: true }
  },
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
  getRubric: vi.fn().mockResolvedValue({ ok: true, data: null }),
  openFileDialog: vi.fn().mockResolvedValue({ ok: true, data: ['/home/user/rapport.pdf'] }),
}

import { useStudentDeposit } from '@/composables/useStudentDeposit'
import { useAppStore } from '@/stores/app'
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

describe('useStudentDeposit', () => {
  let appStore: ReturnType<typeof useAppStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'Jean', avatar_initials: 'JD', photo_data: null, type: 'student', promo_id: 1, promo_name: 'P1' }
    showToast.mockClear()
  })

  function createDeposit() {
    return useStudentDeposit({ value: Date.now() })
  }

  // ── Initial state ─────────────────────────────────────────────────────
  it('initializes with clean state', () => {
    const deposit = createDeposit()
    expect(deposit.depositingDevoirId.value).toBeNull()
    expect(deposit.depositMode.value).toBe('file')
    expect(deposit.depositFile.value).toBeNull()
    expect(deposit.depositing.value).toBe(false)
    expect(deposit.rubricPreview.value).toBeNull()
  })

  // ── startDeposit ──────────────────────────────────────────────────────
  it('startDeposit sets devoir ID and fetches rubric', async () => {
    const deposit = createDeposit()
    await deposit.startDeposit(makeDevoir({ id: 42 }))
    expect(deposit.depositingDevoirId.value).toBe(42)
    expect((window as any).api.getRubric).toHaveBeenCalledWith(42)
  })

  it('startDeposit resets previous state', async () => {
    const deposit = createDeposit()
    deposit.depositLink.value = 'https://old.com'
    deposit.depositFile.value = '/old/file.pdf'
    await deposit.startDeposit(makeDevoir({ id: 5 }))
    expect(deposit.depositLink.value).toBe('')
    expect(deposit.depositFile.value).toBeNull()
  })

  // ── cancelDeposit ─────────────────────────────────────────────────────
  it('cancelDeposit clears devoir ID', async () => {
    const deposit = createDeposit()
    await deposit.startDeposit(makeDevoir())
    deposit.cancelDeposit()
    expect(deposit.depositingDevoirId.value).toBeNull()
    expect(deposit.rubricPreview.value).toBeNull()
  })

  // ── pickFile ──────────────────────────────────────────────────────────
  it('pickFile sets file path and name', async () => {
    const deposit = createDeposit()
    await deposit.pickFile()
    expect(deposit.depositFile.value).toBe('/home/user/rapport.pdf')
    expect(deposit.depositFileName.value).toBe('rapport.pdf')
  })

  // ── clearDepositFile ──────────────────────────────────────────────────
  it('clearDepositFile resets file state', async () => {
    const deposit = createDeposit()
    await deposit.pickFile()
    deposit.clearDepositFile()
    expect(deposit.depositFile.value).toBeNull()
    expect(deposit.depositFileName.value).toBeNull()
  })

  // ── submitDeposit ─────────────────────────────────────────────────────
  it('does not submit without file in file mode', async () => {
    const travauxStore = useTravauxStore()
    const addDepotSpy = vi.spyOn(travauxStore, 'addDepot')
    const deposit = createDeposit()
    deposit.depositMode.value = 'file'
    deposit.depositFile.value = null
    await deposit.submitDeposit(makeDevoir())
    expect(addDepotSpy).not.toHaveBeenCalled()
  })

  it('does not submit without link in link mode', async () => {
    const travauxStore = useTravauxStore()
    const addDepotSpy = vi.spyOn(travauxStore, 'addDepot')
    const deposit = createDeposit()
    deposit.depositMode.value = 'link'
    deposit.depositLink.value = '   '
    await deposit.submitDeposit(makeDevoir())
    expect(addDepotSpy).not.toHaveBeenCalled()
  })

  it('does not submit if deadline expired', async () => {
    const travauxStore = useTravauxStore()
    const addDepotSpy = vi.spyOn(travauxStore, 'addDepot')
    const deposit = useStudentDeposit({ value: Date.now() })
    deposit.depositFile.value = '/file.pdf'
    deposit.depositFileName.value = 'file.pdf'
    await deposit.submitDeposit(makeDevoir({ deadline: '2020-01-01' }))
    expect(addDepotSpy).not.toHaveBeenCalled()
  })

  it('does not submit without authenticated user', async () => {
    appStore.currentUser = null
    const travauxStore = useTravauxStore()
    const addDepotSpy = vi.spyOn(travauxStore, 'addDepot')
    const deposit = createDeposit()
    deposit.depositFile.value = '/file.pdf'
    deposit.depositFileName.value = 'file.pdf'
    await deposit.submitDeposit(makeDevoir())
    expect(addDepotSpy).not.toHaveBeenCalled()
  })

  it('submits file deposit successfully', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(true)
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const deposit = createDeposit()
    deposit.depositFile.value = '/home/user/rapport.pdf'
    deposit.depositFileName.value = 'rapport.pdf'
    await deposit.submitDeposit(makeDevoir())
    expect(travauxStore.addDepot).toHaveBeenCalledWith(expect.objectContaining({
      travail_id: 1,
      student_id: 1,
      type: 'file',
      content: '/home/user/rapport.pdf',
      file_name: 'rapport.pdf',
    }))
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/soumis/i), 'success')
    expect(deposit.depositingDevoirId.value).toBeNull()
  })

  it('submits link deposit successfully', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(true)
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const deposit = createDeposit()
    deposit.depositMode.value = 'link'
    deposit.depositLink.value = 'https://github.com/myrepo'
    await deposit.submitDeposit(makeDevoir())
    expect(travauxStore.addDepot).toHaveBeenCalledWith(expect.objectContaining({
      type: 'link',
      content: 'https://github.com/myrepo',
    }))
  })

  it('shows error on failed deposit', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(false)
    const deposit = createDeposit()
    deposit.depositFile.value = '/file.pdf'
    deposit.depositFileName.value = 'file.pdf'
    await deposit.submitDeposit(makeDevoir())
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/erreur/i), 'error')
  })

  it('shows validation error for blocked extension', async () => {
    const travauxStore = useTravauxStore()
    const addDepotSpy = vi.spyOn(travauxStore, 'addDepot')
    const deposit = createDeposit()
    deposit.depositFile.value = '/malware.exe'
    deposit.depositFileName.value = 'malware.exe'
    await deposit.submitDeposit(makeDevoir())
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/extension/i), 'error')
    expect(addDepotSpy).not.toHaveBeenCalled()
  })

  it('prevents double submission', async () => {
    const travauxStore = useTravauxStore()
    let resolveDepot: (v: boolean) => void
    vi.spyOn(travauxStore, 'addDepot').mockImplementation(() =>
      new Promise(r => { resolveDepot = r }),
    )
    const deposit = createDeposit()
    deposit.depositFile.value = '/file.pdf'
    deposit.depositFileName.value = 'file.pdf'
    const p1 = deposit.submitDeposit(makeDevoir())
    expect(deposit.depositing.value).toBe(true)
    // Second call should be no-op
    await deposit.submitDeposit(makeDevoir())
    expect(travauxStore.addDepot).toHaveBeenCalledTimes(1)
    resolveDepot!(true)
    await p1
  })
})
