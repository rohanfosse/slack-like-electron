// ─── Cache mémoire simple avec TTL ──────────────────────────────────────────
// Utilisé pour les requêtes fréquentes (promotions, channels) afin de réduire
// la charge DB. Invalidation manuelle possible via cache.del(key) ou cache.clear().

const _store = new Map() // key → { value, expiresAt }

const cache = {
  /** Récupère une valeur du cache. Retourne undefined si expirée ou absente. */
  get(key) {
    const entry = _store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) { _store.delete(key); return undefined }
    return entry.value
  },

  /** Stocke une valeur avec un TTL en millisecondes (défaut 60s). */
  set(key, value, ttlMs = 60_000) {
    _store.set(key, { value, expiresAt: Date.now() + ttlMs })
  },

  /** Supprime une clé du cache. */
  del(key) { _store.delete(key) },

  /** Supprime les entrées correspondant à un préfixe (invalidation partielle). */
  invalidate(prefix) {
    for (const key of _store.keys()) {
      if (key.startsWith(prefix)) _store.delete(key)
    }
  },

  /** Vide tout le cache. */
  clear() { _store.clear() },

  /** Nombre d'entrées en cache. */
  get size() { return _store.size },

  /**
   * Pattern cache-aside : retourne la valeur en cache ou exécute fn() et la cache.
   * @param {string} key
   * @param {() => T} fn
   * @param {number} ttlMs
   * @returns {T}
   */
  wrap(key, fn, ttlMs = 60_000) {
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    const value = fn()
    cache.set(key, value, ttlMs)
    return value
  },
}

module.exports = cache
