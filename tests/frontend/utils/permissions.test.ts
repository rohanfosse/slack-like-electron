import { describe, it, expect } from 'vitest'
import { hasRole, isSystemAdmin, canAccessModule, ROLE_LEVELS, ADMIN_MODULES } from '@/utils/permissions'

describe('ROLE_LEVELS', () => {
  it('defines correct hierarchy: student < ta < teacher < admin', () => {
    expect(ROLE_LEVELS.student).toBeLessThan(ROLE_LEVELS.ta)
    expect(ROLE_LEVELS.ta).toBeLessThan(ROLE_LEVELS.teacher)
    expect(ROLE_LEVELS.teacher).toBeLessThan(ROLE_LEVELS.admin)
  })
})

describe('hasRole', () => {
  it('admin has all roles', () => {
    expect(hasRole('admin', 'student')).toBe(true)
    expect(hasRole('admin', 'ta')).toBe(true)
    expect(hasRole('admin', 'teacher')).toBe(true)
    expect(hasRole('admin', 'admin')).toBe(true)
  })

  it('teacher has teacher, ta, and student roles', () => {
    expect(hasRole('teacher', 'student')).toBe(true)
    expect(hasRole('teacher', 'ta')).toBe(true)
    expect(hasRole('teacher', 'teacher')).toBe(true)
    expect(hasRole('teacher', 'admin')).toBe(false)
  })

  it('ta has ta and student roles', () => {
    expect(hasRole('ta', 'student')).toBe(true)
    expect(hasRole('ta', 'ta')).toBe(true)
    expect(hasRole('ta', 'teacher')).toBe(false)
    expect(hasRole('ta', 'admin')).toBe(false)
  })

  it('student only has student role', () => {
    expect(hasRole('student', 'student')).toBe(true)
    expect(hasRole('student', 'ta')).toBe(false)
    expect(hasRole('student', 'teacher')).toBe(false)
    expect(hasRole('student', 'admin')).toBe(false)
  })

  it('returns false for null/undefined role', () => {
    expect(hasRole(null, 'student')).toBe(false)
    expect(hasRole(undefined, 'student')).toBe(false)
  })

  it('returns false for unknown role string', () => {
    expect(hasRole('unknown', 'student')).toBe(false)
  })
})

describe('isSystemAdmin', () => {
  it('returns true only for admin', () => {
    expect(isSystemAdmin('admin')).toBe(true)
    expect(isSystemAdmin('teacher')).toBe(false)
    expect(isSystemAdmin('ta')).toBe(false)
    expect(isSystemAdmin('student')).toBe(false)
    expect(isSystemAdmin(null)).toBe(false)
    expect(isSystemAdmin(undefined)).toBe(false)
  })
})

describe('canAccessModule', () => {
  it('admin can access all modules', () => {
    for (const mod of Object.keys(ADMIN_MODULES)) {
      expect(canAccessModule('admin', mod)).toBe(true)
    }
  })

  it('teacher can access teacher-level modules', () => {
    expect(canAccessModule('teacher', 'stats')).toBe(true)
    expect(canAccessModule('teacher', 'feedback')).toBe(true)
    expect(canAccessModule('teacher', 'moderation')).toBe(true)
    expect(canAccessModule('teacher', 'users')).toBe(true)
  })

  it('teacher cannot access admin-only modules', () => {
    expect(canAccessModule('teacher', 'security')).toBe(false)
    expect(canAccessModule('teacher', 'maintenance')).toBe(false)
    expect(canAccessModule('teacher', 'deploy')).toBe(false)
    expect(canAccessModule('teacher', 'settings')).toBe(false)
  })

  it('student cannot access any admin module', () => {
    for (const mod of Object.keys(ADMIN_MODULES)) {
      expect(canAccessModule('student', mod)).toBe(false)
    }
  })

  it('returns false for unknown module', () => {
    expect(canAccessModule('admin', 'nonexistent')).toBe(false)
  })
})
