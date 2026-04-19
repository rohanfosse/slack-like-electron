/**
 * fetchWithTimeout — wrapper fetch() avec AbortSignal.timeout integre.
 *
 * Utilise par tous les uploads + calls HTTP directs cote renderer qui ne
 * passent pas par le preload (window.api). Sans timeout, un serveur hung
 * bloque l UI indefiniment (uploading = true jamais reset).
 *
 * Signale l erreur via AbortError ; le caller decide du toast / retry.
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 30_000
export const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  // On combine le signal du caller (si fourni) avec notre timeout ; si
  // l un des deux abort, le fetch abort. `AbortSignal.any` (present dans
  // Electron 28+) gere proprement le nettoyage des listeners.
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const signals: AbortSignal[] = init.signal ? [init.signal, timeoutSignal] : [timeoutSignal]
  const signal = typeof AbortSignal.any === 'function'
    ? AbortSignal.any(signals)
    : composeSignals(signals)
  return fetch(input, { ...init, signal })
}

/**
 * Fallback pour les runtimes sans AbortSignal.any. Nettoie le listener
 * du signal non-gagnant via un flag interne pour eviter l accumulation
 * lors d uploads repetes sur le meme user signal.
 */
function composeSignals(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController()
  const cleanups: Array<() => void> = []
  const finalize = (reason: unknown) => {
    for (const fn of cleanups) fn()
    cleanups.length = 0
    if (!ctrl.signal.aborted) ctrl.abort(reason)
  }
  for (const s of signals) {
    if (s.aborted) { finalize(s.reason); return ctrl.signal }
    const handler = () => finalize(s.reason)
    s.addEventListener('abort', handler, { once: true })
    cleanups.push(() => s.removeEventListener('abort', handler))
  }
  return ctrl.signal
}

export function isAbortError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const name = (err as { name?: unknown }).name
  return name === 'AbortError' || name === 'TimeoutError'
}
