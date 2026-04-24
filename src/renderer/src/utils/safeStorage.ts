// ─── Wrappers localStorage sûrs ───────────────────────────────────────────────
// Ne lèvent jamais d'exception.
// Toutes les erreurs (JSON corrompu, quota dépassé, storage désactivé) sont
// silencieusement absorbées : safeGetJSON retourne le fallback, safeSetJSON
// retourne false.

/**
 * Lit et parse une valeur JSON depuis localStorage.
 *
 * @param key      Clé localStorage.
 * @param fallback Valeur retournée si la clé est absente, le JSON invalide,
 *                 ou si tout accès au storage lève une exception.
 * @returns La valeur parsée, ou `fallback` en cas d'erreur.
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Sérialise une valeur en JSON et la persiste dans localStorage.
 *
 * @param key   Clé localStorage.
 * @param value Valeur à sérialiser (doit être compatible JSON.stringify).
 * @returns `true` si l'écriture a réussi, `false` sinon (quota, storage
 *          désactivé, référence circulaire, etc.).
 */
export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
    return true
  } catch {
    return false
  }
}

/** Lecture brute (sans parse JSON). Retourne null si absent ou storage indisponible. */
export function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

/** Écriture brute. Ignore silencieusement les erreurs (quota, mode privé). */
export function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* silencieux */ }
}

/** Suppression. Ignore silencieusement les erreurs. */
export function safeRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* silencieux */ }
}
