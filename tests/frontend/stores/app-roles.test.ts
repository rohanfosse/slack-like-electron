import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '@/types'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: vi.fn().mockResolvedValue(null) }),
}))

vi.mock('@/utils/permissions', () => ({
  hasRole: (userRole: string | undefined, required: string) => {
    const levels: Record<string, number> = { student: 0, ta: 1, teacher: 2, admin: 3 }
    return (levels[userRole ?? ''] ?? -1) >= (levels[required] ?? Infinity)
  },
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

;(window as unknown as { api: Record<string, unknown> }).api = {
  setToken: vi.fn(),
  onSocketStateChange: vi.fn(() => () => {}),
  onNewMessage: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  getTeacherChannels: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}

import { useAppStore } from '@/stores/app'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Jean Dupont',
    avatar_initials: 'JD',
    photo_data: null,
    type: 'student',
    promo_id: 7,
    promo_name: 'Promo A',
    must_change_password: 0,
    ...overrides,
  }
}

describe('App store — role computeds', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('isStudent is true only for type=student', () => {
    const s = useAppStore()
    s.currentUser = makeUser({ type: 'student' })
    expect(s.isStudent).toBe(true)

    s.currentUser = makeUser({ type: 'teacher' })
    expect(s.isStudent).toBe(false)

    s.currentUser = makeUser({ type: 'admin' })
    expect(s.isStudent).toBe(false)

    s.currentUser = makeUser({ type: 'ta' })
    expect(s.isStudent).toBe(false)
  })

  it('isTeacher is true for teacher and admin (uses hasRole)', () => {
    const s = useAppStore()

    s.currentUser = makeUser({ type: 'teacher' })
    expect(s.isTeacher).toBe(true)

    s.currentUser = makeUser({ type: 'admin' })
    expect(s.isTeacher).toBe(true)

    s.currentUser = makeUser({ type: 'student' })
    expect(s.isTeacher).toBe(false)

    s.currentUser = makeUser({ type: 'ta' })
    expect(s.isTeacher).toBe(false)
  })

  it('isAdmin is true only for admin', () => {
    const s = useAppStore()

    s.currentUser = makeUser({ type: 'admin' })
    expect(s.isAdmin).toBe(true)

    s.currentUser = makeUser({ type: 'teacher' })
    expect(s.isAdmin).toBe(false)

    s.currentUser = makeUser({ type: 'ta' })
    expect(s.isAdmin).toBe(false)

    s.currentUser = makeUser({ type: 'student' })
    expect(s.isAdmin).toBe(false)
  })

  it('isStaff is true for ta, teacher, and admin', () => {
    const s = useAppStore()

    s.currentUser = makeUser({ type: 'ta' })
    expect(s.isStaff).toBe(true)

    s.currentUser = makeUser({ type: 'teacher' })
    expect(s.isStaff).toBe(true)

    s.currentUser = makeUser({ type: 'admin' })
    expect(s.isStaff).toBe(true)

    s.currentUser = makeUser({ type: 'student' })
    expect(s.isStaff).toBe(false)
  })

  it('userRole returns correct role string', () => {
    const s = useAppStore()

    s.currentUser = makeUser({ type: 'student' })
    expect(s.userRole).toBe('student')

    s.currentUser = makeUser({ type: 'teacher' })
    expect(s.userRole).toBe('teacher')

    s.currentUser = makeUser({ type: 'admin' })
    expect(s.userRole).toBe('admin')

    s.currentUser = makeUser({ type: 'ta' })
    expect(s.userRole).toBe('ta')
  })

  it('userRole defaults to student when no user', () => {
    const s = useAppStore()
    expect(s.userRole).toBe('student')
  })

  it('login with type=admin correctly sets all computed values', () => {
    const s = useAppStore()
    s.login(makeUser({ type: 'admin', id: -1 }))

    expect(s.isAdmin).toBe(true)
    expect(s.isTeacher).toBe(true)
    expect(s.isStaff).toBe(true)
    expect(s.isStudent).toBe(false)
    expect(s.userRole).toBe('admin')
  })

  it('login with type=ta sets isStaff but not isTeacher/isAdmin', () => {
    const s = useAppStore()
    s.login(makeUser({ type: 'ta', id: -2 }))

    expect(s.isStaff).toBe(true)
    expect(s.isTeacher).toBe(false)
    expect(s.isAdmin).toBe(false)
    expect(s.isStudent).toBe(false)
    expect(s.userRole).toBe('ta')
  })

  it('computed roles update reactively when currentUser changes', () => {
    const s = useAppStore()

    s.currentUser = makeUser({ type: 'student' })
    expect(s.isStudent).toBe(true)
    expect(s.isAdmin).toBe(false)

    s.currentUser = makeUser({ type: 'admin' })
    expect(s.isStudent).toBe(false)
    expect(s.isAdmin).toBe(true)
  })

  it('null currentUser gives safe defaults', () => {
    const s = useAppStore()
    expect(s.currentUser).toBeNull()
    expect(s.isStudent).toBe(false)
    expect(s.isTeacher).toBe(false)
    expect(s.isAdmin).toBe(false)
    expect(s.isStaff).toBe(false)
    expect(s.userRole).toBe('student')
  })
})
