/**
 * httpClient : wrapper fetch avec timeout (15s), retry exponentiel (x2)
 * et gestion du JWT Bearer + expiration 401. Utilise dans le preload
 * Electron par toutes les fonctions API exposees a la renderer.
 *
 * L'etat du token vit dans ce module (singleton) ; les autres modules
 * passent par setJwtToken / getJwtToken pour le modifier / le lire.
 *
 * Sur 401 : le token est vide + le channel `authExpired` est emis pour
 * que le renderer soit invite a se reconnecter.
 */
import { authExpired } from './socketEvents'

export const SERVER_URL: string = process.env.VITE_SERVER_URL || (
  process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://app.cursus.school'
)
if (process.env.NODE_ENV === 'development') {
  console.log('[Preload] SERVER_URL =', SERVER_URL, '| VITE_SERVER_URL =', process.env.VITE_SERVER_URL ?? '(unset)')
}

const FETCH_TIMEOUT = 15_000
const MAX_RETRIES = 2

let jwtToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function getJwtToken(): string | null { return jwtToken }
export function setJwtToken(token: string | null): void { jwtToken = token }

/** Hook optionnel : appele au premier 401, apres reset du token. */
export function setUnauthorizedHandler(fn: () => void): void { onUnauthorized = fn }

/** Decodage base64 protege contre les donnees corrompues. */
export function safeAtob(b64: string): string {
  try { return atob(b64) }
  catch { console.warn('[Preload] Decodage base64 echoue'); return '' }
}

export async function apiFetch(path: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
      const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers, signal: ctrl.signal })
      clearTimeout(timer)
      if (res.status === 401) {
        jwtToken = null
        onUnauthorized?.()
        authExpired.emit()
        return { ok: false, error: 'Session expiree. Veuillez vous reconnecter.' }
      }
      try {
        return await res.json()
      } catch {
        return { ok: false, error: 'Reponse serveur invalide (JSON attendu)' }
      }
    } catch (e: unknown) {
      const isAbort = e instanceof Error && e.name === 'AbortError'
      const errMsg = e instanceof Error ? e.message : String(e)
      const errCode = (e as NodeJS.ErrnoException)?.code ?? ''
      console.warn(`[API] ${path} tentative ${attempt + 1}/${retries + 1} echouee:`, errMsg, errCode ? `(${errCode})` : '')
      if (attempt === retries) {
        const detail = isAbort
          ? `Timeout apres ${FETCH_TIMEOUT / 1000}s sur ${SERVER_URL}${path}`
          : `${errMsg}${errCode ? ` [${errCode}]` : ''} -> ${SERVER_URL}${path}`
        console.error(`[API] ECHEC FINAL: ${detail}`)
        return { ok: false, error: detail }
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  return { ok: false, error: 'Erreur reseau' }
}

export function get(path: string): Promise<unknown> { return apiFetch(path) }
export function post(path: string, body: unknown): Promise<unknown> {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
}
export function put(path: string, body: unknown): Promise<unknown> {
  return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) })
}
export function patch(path: string, body: unknown): Promise<unknown> {
  return apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) })
}
export function del(path: string, body?: unknown): Promise<unknown> {
  return apiFetch(path, body !== undefined
    ? { method: 'DELETE', body: JSON.stringify(body) }
    : { method: 'DELETE' })
}
