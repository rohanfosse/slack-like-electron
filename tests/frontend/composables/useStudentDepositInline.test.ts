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
  openFileDialog: vi.fn().mockResolvedValue({ ok: true, data: ['/home/user/rapport.pdf'] }),
  uploadFile: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://cdn/rapport.pdf', file_size: 12345 } }),
}

import { useStudentDepositInline } from '@/composables/useStudentDepositInline'
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

describe('useStudentDepositInline', () => {
  let appStore: ReturnType<typeof useAppStore>
  const isExpiredAlwaysFalse = () => false
  const isExpiredAlwaysTrue = () => true

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'Jean', avatar_initials: 'JD', photo_data: null, type: 'student', promo_id: 1, promo_name: 'P1' }
    showToast.mockClear()
  })

  // ── Initial state ─────────────────────────────────────────────────────
  it('initializes with clean state', () => {
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    expect(d.depositingDevoirId.value).toBeNull()
    expect(d.mode.value).toBe('file')
    expect(d.file.value).toBeNull()
    expect(d.fileSize.value).toBeNull()
    expect(d.depositing.value).toBe(false)
    expect(d.uploading.value).toBe(false)
  })

  // ── start / cancel ────────────────────────────────────────────────────
  it('start resets previous state and sets devoir id', () => {
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.link.value = 'https://old.com'
    d.file.value = '/old'
    d.fileName.value = 'old.pdf'
    d.start(makeDevoir({ id: 42 }))
    expect(d.depositingDevoirId.value).toBe(42)
    expect(d.link.value).toBe('')
    expect(d.file.value).toBeNull()
    expect(d.fileName.value).toBeNull()
  })

  it('cancel clears devoir id', () => {
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.start(makeDevoir())
    d.cancel()
    expect(d.depositingDevoirId.value).toBeNull()
  })

  // ── URL validation (link mode) ────────────────────────────────────────
  it('refuses empty link', async () => {
    const travauxStore = useTravauxStore()
    const spy = vi.spyOn(travauxStore, 'addDepot')
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.mode.value = 'link'
    d.link.value = '   '
    await d.submit(makeDevoir())
    expect(spy).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/vide/i), 'error')
  })

  it('refuses javascript: link (security)', async () => {
    const travauxStore = useTravauxStore()
    const spy = vi.spyOn(travauxStore, 'addDepot')
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.mode.value = 'link'
    d.link.value = 'javascript:alert(1)'
    await d.submit(makeDevoir())
    expect(spy).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/protocole/i), 'error')
  })

  it('refuses link without scheme and without dot', async () => {
    const travauxStore = useTravauxStore()
    const spy = vi.spyOn(travauxStore, 'addDepot')
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.mode.value = 'link'
    d.link.value = 'notaurl'
    await d.submit(makeDevoir())
    expect(spy).not.toHaveBeenCalled()
  })

  it('accepts valid https link', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(true)
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.mode.value = 'link'
    d.link.value = 'https://github.com/user/repo'
    await d.submit(makeDevoir())
    expect(travauxStore.addDepot).toHaveBeenCalledWith(expect.objectContaining({
      type: 'link',
      content: expect.stringContaining('github.com'),
    }))
  })

  it('auto-prefixes https:// for bare domain', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(true)
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.mode.value = 'link'
    d.link.value = 'example.com/path'
    await d.submit(makeDevoir())
    const call = (travauxStore.addDepot as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.content).toMatch(/^https:\/\/example\.com/)
  })

  // ── File mode ─────────────────────────────────────────────────────────
  it('refuses file submission without picked file', async () => {
    const travauxStore = useTravauxStore()
    const spy = vi.spyOn(travauxStore, 'addDepot')
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.mode.value = 'file'
    d.file.value = null
    await d.submit(makeDevoir())
    expect(spy).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/selectionne/i), 'error')
  })

  it('pickFile sets url, name and size', async () => {
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    await d.pickFile()
    expect(d.file.value).toBe('https://cdn/rapport.pdf')
    expect(d.fileName.value).toBe('rapport.pdf')
    expect(d.fileSize.value).toBe(12345)
  })

  it('clearFile resets file state', async () => {
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    await d.pickFile()
    d.clearFile()
    expect(d.file.value).toBeNull()
    expect(d.fileName.value).toBeNull()
    expect(d.fileSize.value).toBeNull()
  })

  // ── Deadline guard ────────────────────────────────────────────────────
  it('refuses submit if deadline expired', async () => {
    const travauxStore = useTravauxStore()
    const spy = vi.spyOn(travauxStore, 'addDepot')
    const d = useStudentDepositInline(isExpiredAlwaysTrue)
    d.file.value = '/uploaded'
    d.fileName.value = 'x.pdf'
    await d.submit(makeDevoir())
    expect(spy).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/depasse|dépasse/i), 'error')
  })

  it('refuses submit if no authenticated user', async () => {
    appStore.currentUser = null
    const travauxStore = useTravauxStore()
    const spy = vi.spyOn(travauxStore, 'addDepot')
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.file.value = '/x'
    d.fileName.value = 'x.pdf'
    await d.submit(makeDevoir())
    expect(spy).not.toHaveBeenCalled()
  })

  // ── Double submit prevention ──────────────────────────────────────────
  it('prevents double submission', async () => {
    const travauxStore = useTravauxStore()
    let resolveDepot: (v: boolean) => void = () => {}
    vi.spyOn(travauxStore, 'addDepot').mockImplementation(
      () => new Promise<boolean>(r => { resolveDepot = r }),
    )
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.file.value = '/x'
    d.fileName.value = 'x.pdf'
    const p1 = d.submit(makeDevoir())
    expect(d.depositing.value).toBe(true)
    // second call should be a no-op
    await d.submit(makeDevoir())
    expect(travauxStore.addDepot).toHaveBeenCalledTimes(1)
    resolveDepot(true)
    await p1
  })

  // ── Submit success ────────────────────────────────────────────────────
  it('submits file deposit successfully', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(true)
    vi.spyOn(travauxStore, 'fetchStudentDevoirs').mockResolvedValue(undefined)
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.file.value = 'https://cdn/x.pdf'
    d.fileName.value = 'x.pdf'
    await d.submit(makeDevoir({ id: 7 }))
    expect(travauxStore.addDepot).toHaveBeenCalledWith(expect.objectContaining({
      travail_id: 7,
      student_id: 1,
      type: 'file',
      content: 'https://cdn/x.pdf',
      file_name: 'x.pdf',
    }))
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/enregistre/i), 'success')
    expect(d.depositingDevoirId.value).toBeNull()
  })

  it('shows error and keeps state on failed deposit', async () => {
    const travauxStore = useTravauxStore()
    vi.spyOn(travauxStore, 'addDepot').mockResolvedValue(false)
    const d = useStudentDepositInline(isExpiredAlwaysFalse)
    d.start(makeDevoir())
    // Ordre important : start() reset file/fileName, donc on les set APRES
    d.file.value = '/x'
    d.fileName.value = 'x.pdf'
    await d.submit(makeDevoir())
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/erreur/i), 'error')
    // Ne reinitialise pas le formulaire en cas d'echec (l'utilisateur doit retry)
    expect(d.depositingDevoirId.value).not.toBeNull()
  })
})
