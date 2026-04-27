/**
 * useBookingApi — wrapper fetch() partage entre les composables publics
 * de booking (usePublicBooking, useCampaignBooking).
 *
 * Centralise :
 *  - la resolution du SERVER_URL via env
 *  - le timeout via fetchWithTimeout
 *  - le parsing JSON tolerant
 *  - le mapping des erreurs reseau / AbortError vers une enveloppe ApiResult
 *
 * Les composables qui l'utilisent ne soccupent plus que de leurs endpoints
 * et de la forme du payload metier.
 */
import { fetchWithTimeout, isAbortError } from '@/utils/fetchWithTimeout'

export const SERVER_URL =
  (import.meta.env?.VITE_SERVER_URL as string | undefined) || 'http://localhost:3001'

export interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
  /** Code d'erreur backend (ex: 'closed', 'not_found', 'invalid_link'). */
  code?: string
}

/**
 * Appelle un endpoint relatif (ex: '/api/bookings/public/...') et retourne
 * une enveloppe { ok, data, error, code }. Ne throw jamais : convertit les
 * erreurs reseau et timeouts en `{ ok: false, error: '...' }` pour que le
 * caller puisse afficher un message sans try/catch.
 */
export async function bookingApi<T>(
  path: string,
  opts: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetchWithTimeout(`${SERVER_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    })
    return await res.json()
  } catch (err) {
    if (isAbortError(err)) return { ok: false, error: 'Temps d attente depasse.' }
    return { ok: false, error: 'Erreur de connexion au serveur.' }
  }
}

/**
 * Genere l'URL publique de telechargement de l'ICS pour un booking.
 * Utilise par les wrappers token et event qui partagent le meme schema.
 */
export function buildIcsUrl(basePath: string, bookingId: number): string {
  return `${SERVER_URL}${basePath}/booking/${bookingId}/ics`
}
