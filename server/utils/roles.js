// ─── Utilitaires rôles/types utilisateur ─────────────────────────────────────

/** Types valides pour la colonne author_type (CHECK constraint messages) */
const VALID_AUTHOR_TYPES = new Set(['teacher', 'student'])

/**
 * Normalise un type utilisateur pour insertion en base.
 * 'admin' et 'ta' sont mappés vers 'teacher'.
 * Lève une erreur si le type est inconnu.
 */
function safeAuthorType(type) {
  if (type === 'admin' || type === 'ta') return 'teacher'
  if (VALID_AUTHOR_TYPES.has(type)) return type
  throw new Error(`Type utilisateur invalide : '${type}'`)
}

/**
 * Normalise un type utilisateur pour les tables sans CHECK constraint
 * (audit_log, feedback, sessions, etc.). Accepte tous les types connus.
 */
const VALID_USER_TYPES = new Set(['admin', 'teacher', 'ta', 'student'])

function safeUserType(type) {
  if (VALID_USER_TYPES.has(type)) return type
  return 'teacher' // fallback defensif
}

module.exports = { safeAuthorType, safeUserType, VALID_AUTHOR_TYPES, VALID_USER_TYPES }
