/**
 * Service unfurl : fetch des previews OpenGraph avec SSRF guards.
 *
 * Securite :
 *  - Resolution DNS manuelle avant fetch (socket.bind + lookup) pour
 *    verifier que l'IP resolue n'est pas dans une plage privee.
 *  - Blocklist : loopback (127/8), private (10/8, 172.16/12, 192.168/16),
 *    link-local (169.254/16), carrier-grade NAT (100.64/10), IPv6
 *    loopback/link-local, multicast, wildcard.
 *  - Redirects limites a 3 ; re-verifie l'IP apres chaque redirect.
 *  - Timeout 5s, body max 2 MB, content-type 'text/html' uniquement.
 *  - URL scheme : http / https seulement.
 *
 * Cache : delegue a models/linkPreviews.js (TTL 24h).
 */
const dns = require('dns').promises
const net = require('net')
const http = require('http')
const https = require('https')
const { URL } = require('url')
const log = require('../utils/logger')
const { getLinkPreview, upsertLinkPreview } = require('../db/models/linkPreviews')

const FETCH_TIMEOUT_MS = 5000
const MAX_BODY_BYTES   = 2 * 1024 * 1024
const MAX_REDIRECTS    = 3
const USER_AGENT       = 'CursusBot/1.0 (+https://cursus.school)'

/** RFC1918 + loopback + link-local + CGNAT + 0.0.0.0/8 */
function isPrivateIPv4(ip) {
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some(n => Number.isNaN(n))) return true
  const [a, b] = octets
  if (a === 0)   return true                   // 0.0.0.0/8 (wildcard/unspecified)
  if (a === 10)  return true                   // 10/8
  if (a === 127) return true                   // loopback
  if (a === 169 && b === 254) return true      // link-local
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
  if (a === 192 && b === 168) return true      // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64/10 CGNAT
  if (a >= 224) return true                    // multicast + reserved
  return false
}

function isPrivateIPv6(ip) {
  const lower = String(ip).toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fe80:')) return true     // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
  if (lower.startsWith('ff')) return true        // multicast
  // IPv4-mapped IPv6 : ::ffff:a.b.c.d — on extrait l'IPv4 et on check
  const mapped = lower.match(/^::ffff:([0-9.]+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])
  return false
}

function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true
  if (net.isIP(ip) === 4) return isPrivateIPv4(ip)
  if (net.isIP(ip) === 6) return isPrivateIPv6(ip)
  return true
}

/** Resout toutes les IPs du hostname et verifie qu'aucune n'est privee. */
async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('IP privee ou reservee interdite')
    return [hostname]
  }
  let addrs
  try {
    addrs = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new Error('Resolution DNS impossible')
  }
  if (!addrs.length) throw new Error('Aucune IP resolue')
  for (const { address } of addrs) {
    if (isPrivateIp(address)) throw new Error('IP privee ou reservee interdite')
  }
  return addrs.map(a => a.address)
}

/**
 * Normalise et valide une URL. Accepte http/https uniquement, max 2048 chars.
 * Strip fragments et certains tracking params courants (utm_*).
 */
function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed.length > 2048) return null
  let u
  try { u = new URL(trimmed) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  u.hash = ''
  // Strip utm_*
  const toDelete = []
  u.searchParams.forEach((_, k) => { if (k.startsWith('utm_')) toDelete.push(k) })
  for (const k of toDelete) u.searchParams.delete(k)
  return u.toString()
}

/**
 * Fait un HTTP GET protege : SSRF check + timeout + body size + redirects.
 * Retourne { status, headers, body } ou jette une erreur.
 */
function safeGet(targetUrl, { redirectCount = 0 } = {}) {
  return new Promise(async (resolve, reject) => {
    let url
    try { url = new URL(targetUrl) } catch { return reject(new Error('URL invalide')) }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return reject(new Error('Protocole non supporte'))
    }

    try {
      await assertPublicHost(url.hostname)
    } catch (err) {
      return reject(err)
    }

    const client = url.protocol === 'https:' ? https : http
    const req = client.request({
      method: 'GET',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr,en',
      },
    }, (res) => {
      const status = res.statusCode ?? 0

      // Redirects : on suit jusqu'a MAX_REDIRECTS. Chaque hop re-passe par
      // assertPublicHost (via l'appel recursif a safeGet).
      if ([301, 302, 303, 307, 308].includes(status)) {
        if (redirectCount >= MAX_REDIRECTS) {
          return reject(new Error('Trop de redirections'))
        }
        const loc = res.headers.location
        if (!loc) return reject(new Error('Redirect sans Location'))
        const nextUrl = new URL(loc, url).toString()
        res.resume() // drain
        return safeGet(nextUrl, { redirectCount: redirectCount + 1 }).then(resolve, reject)
      }

      const contentType = String(res.headers['content-type'] ?? '')
      if (!contentType.toLowerCase().includes('text/html')) {
        res.resume()
        return reject(new Error(`Content-Type non supporte : ${contentType}`))
      }

      const chunks = []
      let total = 0
      let aborted = false
      res.on('data', (chunk) => {
        if (aborted) return
        total += chunk.length
        if (total > MAX_BODY_BYTES) {
          aborted = true
          req.destroy(new Error('Body trop volumineux'))
          return reject(new Error('Body trop volumineux'))
        }
        chunks.push(chunk)
      })
      res.on('end', () => {
        if (aborted) return
        resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') })
      })
      res.on('error', reject)
    })

    req.on('timeout', () => {
      req.destroy(new Error('Timeout'))
      reject(new Error('Timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}

/** Extrait les URLs http(s) d'un texte. Dedup + normalise, max 5. */
function extractUrls(text) {
  if (!text || typeof text !== 'string') return []
  const regex = /https?:\/\/[^\s<>"'`]+/gi
  const found = text.match(regex) ?? []
  const normalized = new Set()
  for (const raw of found) {
    // Strip trailing ponctuation courante
    const cleaned = raw.replace(/[.,;:!?\])}>]+$/, '')
    const n = normalizeUrl(cleaned)
    if (n) normalized.add(n)
    if (normalized.size >= 5) break
  }
  return [...normalized]
}

/**
 * Resout une URL en preview. Utilise le cache si frais, sinon fetch.
 * Le resultat d'erreur (status=0) est aussi cache (TTL 24h) pour eviter
 * de re-fetcher en boucle les liens morts.
 */
async function resolveUrl(url) {
  const norm = normalizeUrl(url)
  if (!norm) return null

  const cached = getLinkPreview(norm)
  if (cached) return cached

  try {
    const { body, status } = await safeGet(norm)
    if (status < 200 || status >= 400) {
      return upsertLinkPreview({ url: norm, status })
    }
    // Appel dynamique — ogs est ESM only (package v6+)
    const ogs = (await import('open-graph-scraper')).default
    const { result, error } = await ogs({ html: body })
    if (error) return upsertLinkPreview({ url: norm, status })
    return upsertLinkPreview({
      url:         result.ogUrl ?? norm,
      title:       typeof result.ogTitle === 'string' ? result.ogTitle.slice(0, 300) : null,
      description: typeof result.ogDescription === 'string' ? result.ogDescription.slice(0, 500) : null,
      image:       pickImage(result),
      siteName:    typeof result.ogSiteName === 'string' ? result.ogSiteName.slice(0, 120) : null,
      status,
    })
  } catch (err) {
    log.warn('unfurl_fetch_failed', { url: norm, error: err.message })
    // Cache l'echec pour eviter retry en boucle
    return upsertLinkPreview({ url: norm, status: 0 })
  }
}

function pickImage(result) {
  const img = result?.ogImage
  if (!img) return null
  if (Array.isArray(img) && img[0]?.url) return String(img[0].url).slice(0, 1024)
  if (typeof img === 'object' && img.url) return String(img.url).slice(0, 1024)
  if (typeof img === 'string') return img.slice(0, 1024)
  return null
}

/**
 * Resout plusieurs URLs en parallele. Utilise par /api/link-preview/resolve.
 */
async function resolveUrls(urls) {
  if (!Array.isArray(urls) || !urls.length) return []
  const uniq = [...new Set(urls.map(u => normalizeUrl(u)).filter(Boolean))].slice(0, 5)
  const results = await Promise.allSettled(uniq.map(u => resolveUrl(u)))
  return results
    .map((r) => r.status === 'fulfilled' ? r.value : null)
    .filter(p => p && (p.title || p.description || p.image))
}

module.exports = {
  extractUrls,
  normalizeUrl,
  resolveUrl,
  resolveUrls,
  safeGet,          // expose pour le proxy image
  assertPublicHost, // expose pour les tests
  isPrivateIp,
}
