import { describe, it, expect } from 'vitest'
const { ROLE_LEVELS, hasRole, isSystemAdmin, ADMIN_MODULES, canAccessModule } = require('../../server/permissions')

// ─── hasRole ──────────────────────────────────────────────────────────────────

describe('hasRole', () => {
  const roles = ['student', 'ta', 'teacher', 'admin']

  // Expected matrix: hasRole(userRole, requiredRole)
  // Rows = userRole, Cols = requiredRole
  //              student  ta     teacher  admin
  // student      true     false  false    false
  // ta           true     true   false    false
  // teacher      true     true   true     false
  // admin        true     true   true     true
  const expected = {
    student: { student: true, ta: false, teacher: false, admin: false },
    ta: { student: true, ta: true, teacher: false, admin: false },
    teacher: { student: true, ta: true, teacher: true, admin: false },
    admin: { student: true, ta: true, teacher: true, admin: true },
  }

  for (const userRole of roles) {
    for (const requiredRole of roles) {
      it(`hasRole('${userRole}', '${requiredRole}') === ${expected[userRole][requiredRole]}`, () => {
        expect(hasRole(userRole, requiredRole)).toBe(expected[userRole][requiredRole])
      })
    }
  }

  // Edge cases
  it('returns false for undefined userRole', () => {
    expect(hasRole(undefined, 'student')).toBe(false)
  })

  it('returns false for null userRole', () => {
    expect(hasRole(null, 'student')).toBe(false)
  })

  it('returns false for unknown userRole', () => {
    expect(hasRole('superadmin', 'student')).toBe(false)
  })

  it('returns false for undefined requiredRole', () => {
    expect(hasRole('admin', undefined)).toBe(false)
  })

  it('returns false for null requiredRole', () => {
    expect(hasRole('admin', null)).toBe(false)
  })

  it('returns false for unknown requiredRole', () => {
    expect(hasRole('admin', 'superadmin')).toBe(false)
  })

  it('returns false when both roles are undefined', () => {
    expect(hasRole(undefined, undefined)).toBe(false)
  })
})

// ─── isSystemAdmin ────────────────────────────────────────────────────────────

describe('isSystemAdmin', () => {
  it('returns true for admin', () => {
    expect(isSystemAdmin('admin')).toBe(true)
  })

  it('returns false for teacher', () => {
    expect(isSystemAdmin('teacher')).toBe(false)
  })

  it('returns false for ta', () => {
    expect(isSystemAdmin('ta')).toBe(false)
  })

  it('returns false for student', () => {
    expect(isSystemAdmin('student')).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSystemAdmin(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSystemAdmin(null)).toBe(false)
  })
})

// ─── canAccessModule ──────────────────────────────────────────────────────────

describe('canAccessModule', () => {
  const teacherModules = ['stats', 'feedback', 'moderation', 'users']
  const adminModules = ['security', 'maintenance', 'deploy', 'sessions', 'settings', 'audit']
  const roles = ['student', 'ta', 'teacher', 'admin']

  describe('teacher-level modules', () => {
    for (const mod of teacherModules) {
      for (const role of roles) {
        const expectedAccess = role === 'teacher' || role === 'admin'
        it(`canAccessModule('${role}', '${mod}') === ${expectedAccess}`, () => {
          expect(canAccessModule(role, mod)).toBe(expectedAccess)
        })
      }
    }
  })

  describe('admin-level modules', () => {
    for (const mod of adminModules) {
      for (const role of roles) {
        const expectedAccess = role === 'admin'
        it(`canAccessModule('${role}', '${mod}') === ${expectedAccess}`, () => {
          expect(canAccessModule(role, mod)).toBe(expectedAccess)
        })
      }
    }
  })

  // Edge cases
  it('returns false for unknown module', () => {
    expect(canAccessModule('admin', 'unknown_module')).toBe(false)
  })

  it('returns false for undefined module', () => {
    expect(canAccessModule('admin', undefined)).toBe(false)
  })

  it('returns false for null module', () => {
    expect(canAccessModule('admin', null)).toBe(false)
  })

  it('returns false for undefined role with valid module', () => {
    expect(canAccessModule(undefined, 'stats')).toBe(false)
  })

  it('returns false for null role with valid module', () => {
    expect(canAccessModule(null, 'stats')).toBe(false)
  })
})

// ─── ROLE_LEVELS ──────────────────────────────────────────────────────────────

describe('ROLE_LEVELS', () => {
  it('defines correct hierarchy order', () => {
    expect(ROLE_LEVELS.student).toBeLessThan(ROLE_LEVELS.ta)
    expect(ROLE_LEVELS.ta).toBeLessThan(ROLE_LEVELS.teacher)
    expect(ROLE_LEVELS.teacher).toBeLessThan(ROLE_LEVELS.admin)
  })

  it('contains exactly 4 roles', () => {
    expect(Object.keys(ROLE_LEVELS)).toHaveLength(4)
  })
})

// ─── ADMIN_MODULES ────────────────────────────────────────────────────────────

describe('ADMIN_MODULES', () => {
  it('contains exactly 10 modules', () => {
    expect(Object.keys(ADMIN_MODULES)).toHaveLength(10)
  })

  it('all module required roles are valid ROLE_LEVELS keys', () => {
    for (const [, requiredRole] of Object.entries(ADMIN_MODULES)) {
      expect(ROLE_LEVELS).toHaveProperty(requiredRole)
    }
  })
})
