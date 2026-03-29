import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: vi.fn().mockResolvedValue(null) }),
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

import { usePermissions } from '@/composables/usePermissions'
import { useAppStore } from '@/stores/app'

describe('usePermissions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hasRole checks against store userRole', () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'teacher', promo_id: null, promo_name: null }

    const perms = usePermissions()
    expect(perms.hasRole('student')).toBe(true)
    expect(perms.hasRole('teacher')).toBe(true)
    expect(perms.hasRole('admin')).toBe(false)
  })

  it('canAccessModule checks module permissions', () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'teacher', promo_id: null, promo_name: null }

    const perms = usePermissions()
    expect(perms.canAccessModule('stats')).toBe(true)
    expect(perms.canAccessModule('security')).toBe(false)
  })

  it('isAdmin/isTeacher/isStudent computed values reflect store', () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'admin', promo_id: null, promo_name: null }

    const perms = usePermissions()
    expect(perms.isAdmin.value).toBe(true)
    expect(perms.isTeacher.value).toBe(true) // admin has teacher role
    expect(perms.isStudent.value).toBe(false)
  })

  it('student user has limited permissions', () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: 1, name: 'A', avatar_initials: 'A', photo_data: null, type: 'student', promo_id: 7, promo_name: 'P' }

    const perms = usePermissions()
    expect(perms.isStudent.value).toBe(true)
    expect(perms.isTeacher.value).toBe(false)
    expect(perms.isAdmin.value).toBe(false)
    expect(perms.hasRole('student')).toBe(true)
    expect(perms.hasRole('teacher')).toBe(false)
    expect(perms.canAccessModule('stats')).toBe(false)
  })

  it('userRole computed returns current role', () => {
    const appStore = useAppStore()
    appStore.currentUser = { id: -1, name: 'T', avatar_initials: 'T', photo_data: null, type: 'ta', promo_id: null, promo_name: null }

    const perms = usePermissions()
    expect(perms.userRole.value).toBe('ta')
  })
})
