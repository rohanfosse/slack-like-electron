/**
 * Service Worker - Cursus PWA
 * Stratégies : stale-while-revalidate pour API, cache-first pour assets statiques.
 */

const CACHE_STATIC = 'cursus-static-v4'
const CACHE_API    = 'cursus-api-v4'

const API_CACHE_MAX_AGE = 5 * 60 * 1000       // 5 minutes
const STATIC_CACHE_MAX_AGE = 30 * 24 * 3600e3 // 30 jours

// Assets à précacher lors de l'installation
const PRECACHE_URLS = [
  '/',
  '/index.html',
]

// ── Installation : précache des assets essentiels ────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activation : nettoyage des anciens caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_STATIC, CACHE_API]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !keepCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch : stratégie hybride ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return

  // Ignorer les WebSockets et extensions Chrome
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.protocol === 'chrome-extension:') return

  // API calls → Stale-While-Revalidate (servir le cache, revalider en arrière-plan)
  if (url.pathname.startsWith('/api/')) {
    // Ne pas cacher socket.io
    if (url.pathname.startsWith('/socket.io/')) return

    event.respondWith(
      caches.open(CACHE_API).then(async (cache) => {
        const cached = await cache.match(request)

        // Lancer la revalidation réseau en arrière-plan
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              // Stocker avec un timestamp pour l'expiration
              const cloned = response.clone()
              const headers = new Headers(cloned.headers)
              headers.set('sw-cached-at', String(Date.now()))
              cache.put(request, new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers,
              }))
            }
            return response
          })
          .catch(() => null)

        // Si on a une version en cache récente (< 5 min), la servir immédiatement
        if (cached) {
          const cachedAt = Number(cached.headers.get('sw-cached-at') || 0)
          if (Date.now() - cachedAt < API_CACHE_MAX_AGE) {
            return cached
          }
        }

        // Sinon, attendre le réseau (ou fallback sur le cache périmé)
        const networkResponse = await networkPromise
        if (networkResponse) return networkResponse
        if (cached) return cached

        // Aucune donnée disponible
        return new Response(JSON.stringify({ ok: false, error: 'Hors ligne - données non disponibles.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
    return
  }

  // Pages HTML (navigation) → Network-First
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Assets statiques (JS/CSS/fonts/images) → Cache-First, longue durée
  event.respondWith(
    caches.open(CACHE_STATIC).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached

      const response = await fetch(request)
      if (response.ok && url.origin === self.location.origin) {
        cache.put(request, response.clone())
      }
      return response
    })
  )
})

// ── Message de l'app pour vider le cache (optionnel) ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data === 'CLEAR_API_CACHE') {
    caches.delete(CACHE_API)
  }
})
