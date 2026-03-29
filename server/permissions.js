// ─── Permissions centralisees ─────────────────────────────────────────────────
// Source unique de verite pour la hierarchie des roles et les permissions.
// Utilise par le middleware authorize.js, les IPC helpers, et le frontend.

const ROLE_LEVELS = { student: 0, ta: 1, teacher: 2, admin: 3 }

/**
 * Verifie si un role a au moins le niveau requis (heritage hierarchique).
 * admin > teacher > ta > student
 */
function hasRole(userRole, requiredRole) {
  return (ROLE_LEVELS[userRole] ?? -1) >= (ROLE_LEVELS[requiredRole] ?? Infinity)
}

/** Verifie si le role est admin global */
function isSystemAdmin(role) {
  return role === 'admin'
}

/** Modules admin et le role minimum pour y acceder */
const ADMIN_MODULES = {
  stats: 'teacher',
  feedback: 'teacher',
  moderation: 'teacher',
  users: 'teacher',
  security: 'admin',
  maintenance: 'admin',
  deploy: 'admin',
  sessions: 'admin',
  settings: 'admin',
  audit: 'admin',
}

/**
 * Verifie si un role peut acceder a un module admin.
 * Les modules 'teacher' sont accessibles aux teachers et admins.
 * Les modules 'admin' ne sont accessibles qu'aux admins.
 */
function canAccessModule(userRole, moduleName) {
  const required = ADMIN_MODULES[moduleName]
  return required ? hasRole(userRole, required) : false
}

module.exports = { ROLE_LEVELS, hasRole, isSystemAdmin, ADMIN_MODULES, canAccessModule }
