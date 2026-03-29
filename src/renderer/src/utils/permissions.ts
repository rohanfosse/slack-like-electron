// ─── Permissions centralisees (frontend) ──────────────────────────────────────
// Miroir du backend server/permissions.js

export const ROLE_LEVELS = { student: 0, ta: 1, teacher: 2, admin: 3 } as const
export type Role = keyof typeof ROLE_LEVELS

export function hasRole(userRole: string | undefined | null, requiredRole: Role): boolean {
  return (ROLE_LEVELS[userRole as Role] ?? -1) >= (ROLE_LEVELS[requiredRole] ?? Infinity)
}

export function isSystemAdmin(role: string | undefined | null): boolean {
  return role === 'admin'
}

export const ADMIN_MODULES = {
  stats: 'teacher' as Role,
  feedback: 'teacher' as Role,
  moderation: 'teacher' as Role,
  users: 'teacher' as Role,
  security: 'admin' as Role,
  maintenance: 'admin' as Role,
  deploy: 'admin' as Role,
  sessions: 'admin' as Role,
  settings: 'admin' as Role,
  audit: 'admin' as Role,
} as const

export function canAccessModule(userRole: string | undefined | null, moduleName: string): boolean {
  const required = ADMIN_MODULES[moduleName as keyof typeof ADMIN_MODULES]
  return required ? hasRole(userRole, required) : false
}
