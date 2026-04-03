// ─── Cache memoire LRU avec TTL ─────────────────────────────────────────────
// Utilise pour les requetes frequentes (promotions, channels) afin de reduire
// la charge DB. Invalidation manuelle possible via cache.del(key) ou cache.clear().
// Eviction LRU quand le cache depasse MAX_SIZE entrees.

const MAX_SIZE = 1000

const _store = new Map() // key → { value, expiresAt }

const cache = {
  /** Recupere une valeur du cache. Retourne undefined si expiree ou absente. */
  get(key) {
    const entry = _store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) { _store.delete(key); return undefined }
    // LRU : deplacer en fin de Map (plus recent)
    _store.delete(key)
    _store.set(key, entry)
    return entry.value
  },

  /** Stocke une valeur avec un TTL en millisecondes (defaut 60s). */
  set(key, value, ttlMs = 60_000) {
    // Si la cle existe deja, la supprimer pour la remettre en fin
    if (_store.has(key)) _store.delete(key)
    _store.set(key, { value, expiresAt: Date.now() + ttlMs })
    // Eviction LRU si depassement
    if (_store.size > MAX_SIZE) {
      const oldest = _store.keys().next().value
      _store.delete(oldest)
    }
  },

  /** Supprime une cle du cache. */
  del(key) { _store.delete(key) },

  /** Supprime les entrees correspondant a un prefixe (invalidation partielle). */
  invalidate(prefix) {
    for (const key of _store.keys()) {
      if (key.startsWith(prefix)) _store.delete(key)
    }
  },

  /** Vide tout le cache. */
  clear() { _store.clear() },

  /** Nombre d'entrees en cache. */
  get size() { return _store.size },

  /**
   * Pattern cache-aside : retourne la valeur en cache ou execute fn() et la cache.
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
