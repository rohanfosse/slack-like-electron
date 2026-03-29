import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const routerPushMock = vi.fn()
const routeMock = ref({ name: 'messages' })
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock }),
  useRoute: () => routeMock.value,
}))

const getRecentDmContactsMock = vi.fn()
;(globalThis as Record<string, unknown>).window = {
  api: {
    getRecentDmContacts: getRecentDmContactsMock,
  },
}

vi.mock('@/constants', () => ({
  STORAGE_KEYS: {
    SESSION: 'cc_session',
    NAV_STATE: 'cc_nav_state',
    PREFS: 'cc_prefs',
    MUTED_DMS: 'cc_muted_dms',
  },
  NOTIFICATION_HISTORY_LIMIT: 50,
  DM_RECENT_LIMIT: 10,
  ROLE_LABELS: { admin: 'Admin', teacher: 'Responsable', ta: 'Intervenant', student: 'Etudiant' },
  roleLabel: (t: string | undefined | null) => {
    const labels: Record<string, string> = { admin: 'Admin', teacher: 'Responsable', ta: 'Intervenant', student: 'Etudiant' }
    return labels[t ?? ''] ?? t ?? ''
  },
}))

vi.mock('@/utils/format', () => ({
  avatarColor: () => '#abc',
}))

vi.mock('@/utils/permissions', () => ({
  hasRole: () => false,
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

import { useSidebarDm } from '../../../src/renderer/src/composables/useSidebarDm'
import { useAppStore } from '../../../src/renderer/src/stores/app'
import type { Student } from '../../../src/renderer/src/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStudent(id: number, name: string, promoId = 1): Student {
  return { id, name, email: `${name.toLowerCase().replace(' ', '.')}@test.fr`, promo_id: promoId, promo_name: null, avatar_initials: name.slice(0, 2).toUpperCase(), photo_data: null }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useSidebarDm', () => {
  let appStore: ReturnType<typeof useAppStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    vi.clearAllMocks()
    routeMock.value = { name: 'messages' }
  })

  it('selectDm appelle openDm et emet navigate', () => {
    appStore.currentUser = { id: 1, name: 'Jean', type: 'student', promo_id: 1 } as never
    const emitMock = vi.fn()
    const dmStudents = ref<Student[]>([])
    const ctx = ref(null)
    const { selectDm } = useSidebarDm(dmStudents, ctx as never, emitMock)

    const student = makeStudent(5, 'Paul Dupuis')
    selectDm(student)

    // openDm(5, 1, 'Paul Dupuis') with myId=1 => min(1,5)=1 for student-to-student
    expect(appStore.activeDmStudentId).toBe(1)
    expect(appStore.activeDmPeerId).toBe(5)
    expect(emitMock).toHaveBeenCalledWith('navigate')
  })

  it('selectDm navigue vers /messages si route differente', () => {
    appStore.currentUser = { id: 1, name: 'Jean', type: 'student', promo_id: 1 } as never
    routeMock.value = { name: 'dashboard' }
    const emitMock = vi.fn()
    const dmStudents = ref<Student[]>([])
    const ctx = ref(null)
    const { selectDm } = useSidebarDm(dmStudents, ctx as never, emitMock)

    selectDm(makeStudent(5, 'Paul Dupuis'))

    expect(routerPushMock).toHaveBeenCalledWith('/messages')
  })

  it('dmContactsToShow inclut les contacts etudiants avec messages recents', async () => {
    appStore.currentUser = { id: 1, name: 'Jean', type: 'student', promo_id: 1 } as never
    const dmStudents = ref<Student[]>([
      makeStudent(-1, 'Prof Test'),
      makeStudent(5, 'Paul Dupuis'),
      makeStudent(6, 'Marie Curie'),
    ])
    const ctx = ref(null)
    const { recentDmContacts, dmContactsToShow } = useSidebarDm(dmStudents, ctx as never, vi.fn())

    // Simulate loaded contacts: Paul has recent DM
    recentDmContacts.value = [
      { name: 'Paul Dupuis', last_message_at: '2026-03-29T10:00:00', last_message_preview: 'Salut' },
    ]
    await nextTick()

    const names = dmContactsToShow.value.map((s: Student) => s.name)
    // Teachers always first for student view, then recent student contacts
    expect(names[0]).toBe('Prof Test')
    expect(names).toContain('Paul Dupuis')
    // Marie has no recent DM so should not appear (she is not a teacher)
    expect(names).not.toContain('Marie Curie')
  })

  it('loadRecentDmContacts charge les contacts via window.api', async () => {
    appStore.currentUser = { id: 1, name: 'Jean', type: 'student', promo_id: 1 } as never
    getRecentDmContactsMock.mockResolvedValue({
      ok: true,
      data: [
        { name: 'Paul Dupuis', last_message_at: '2026-03-29T10:00:00', last_message_preview: 'Salut' },
      ],
    })
    const dmStudents = ref<Student[]>([])
    const ctx = ref(null)
    const { loadRecentDmContacts, recentDmContacts } = useSidebarDm(dmStudents, ctx as never, vi.fn())

    await loadRecentDmContacts()

    expect(getRecentDmContactsMock).toHaveBeenCalledWith(1, 10)
    expect(recentDmContacts.value).toHaveLength(1)
    expect(recentDmContacts.value[0].name).toBe('Paul Dupuis')
  })

  it('loadRecentDmContacts retourne vide si api echoue', async () => {
    appStore.currentUser = { id: 1, name: 'Jean', type: 'student', promo_id: 1 } as never
    getRecentDmContactsMock.mockRejectedValue(new Error('network'))
    const dmStudents = ref<Student[]>([])
    const ctx = ref(null)
    const { loadRecentDmContacts, recentDmContacts } = useSidebarDm(dmStudents, ctx as never, vi.fn())

    await loadRecentDmContacts()

    expect(recentDmContacts.value).toEqual([])
  })

  it('getDmPreview retourne un apercu tronque', () => {
    appStore.currentUser = { id: 1, name: 'Jean', type: 'student', promo_id: 1 } as never
    const dmStudents = ref<Student[]>([])
    const ctx = ref(null)
    const { recentDmContacts, getDmPreview } = useSidebarDm(dmStudents, ctx as never, vi.fn())

    recentDmContacts.value = [
      { name: 'Paul Dupuis', last_message_at: '2026-03-29', last_message_preview: 'Ceci est un message assez long qui devrait etre tronque a quarante caracteres maximum' },
    ]

    const preview = getDmPreview('Paul Dupuis')
    expect(preview.length).toBeLessThanOrEqual(40)
  })
})
