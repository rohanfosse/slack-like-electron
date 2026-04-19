// ─── Client-side error reporting (POST /api/report-error) ───────────────────
// Capture les erreurs Vue (onErrorCaptured), les erreurs globales
// (window.onerror) et les rejets de promesses non gerees
// (window.onunhandledrejection) et les envoie au backend pour
// visualisation dans le panel admin.
//
// Resilience :
// - Silencieux en cas d'echec (pas de boucle infinie si /api/report-error throw)
// - Dedup naif : n'envoie pas deux fois la meme erreur d'affilee (protege
//   contre les boucles de rendu Vue qui emettent la meme erreur en rafale)
// - Debounce par identite de message (1 seconde)
// - Cap hard de N rapports par session pour eviter les DOS auto-inflige

import { getAuthToken } from '@/utils/auth'

const MAX_REPORTS_PER_SESSION = 50
const DEDUP_WINDOW_MS = 1000

type ErrorContext = {
  page?: string
  source?: 'vue' | 'window' | 'unhandled_rejection' | 'manual'
}

// Etat interne (singleton par fenetre). Reinitialise au reload.
let reportsSent      = 0
let lastMessage      = ''
let lastSentAt       = 0
let isReportingError = false

/**
 * Extrait un message et une stack serialisables depuis n'importe quelle valeur.
 * Vue peut capturer des valeurs non-Error (strings, objects), on normalise.
 */
function normalizeError(err: unknown): { message: string; stack: string | null } {
  if (err instanceof Error) {
    return { message: err.message || err.name || 'Unknown error', stack: err.stack ?? null }
  }
  if (typeof err === 'string') {
    return { message: err, stack: null }
  }
  try {
    return { message: JSON.stringify(err) || 'Unknown error', stack: null }
  } catch {
    return { message: 'Unknown error (non-serializable)', stack: null }
  }
}

/**
 * Envoie un rapport d'erreur au backend.
 * Absolument silencieux en cas d'echec pour eviter les boucles.
 */
export async function reportError(err: unknown, ctx: ErrorContext = {}): Promise<void> {
  if (isReportingError) return
  if (reportsSent >= MAX_REPORTS_PER_SESSION) return

  const { message, stack } = normalizeError(err)

  const now = Date.now()
  if (message === lastMessage && (now - lastSentAt) < DEDUP_WINDOW_MS) return
  lastMessage = message
  lastSentAt  = now

  // Incrementer avant le fetch pour que le cap tienne meme si plusieurs reports
  // concurrents passent le check en parallele (race condition sinon).
  reportsSent++

  isReportingError = true
  try {
    const token = getAuthToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    // 10s suffit largement ; si le serveur ne repond pas, on ne veut
    // surtout pas bloquer l app qui tente deja de reporter une autre erreur.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    try {
      await fetch('/api/report-error', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          stack,
          page: ctx.page ?? (typeof window !== 'undefined' ? window.location.pathname : null),
          appVersion: (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? null,
          source: ctx.source ?? 'manual',
        }),
        keepalive: true,
        signal: ctrl.signal,
      })
    } finally { clearTimeout(timer) }
  } catch {
    // Silencieux : si le backend est down, on ne peut rien y faire sans boucler
  } finally {
    isReportingError = false
  }
}

// ── Hooks de test (exposes pour la suite unitaire uniquement) ────────────────
// __reset__() remet l'etat au debut pour isoler les tests les uns des autres.
export function __resetErrorReporterForTests__(): void {
  reportsSent      = 0
  lastMessage      = ''
  lastSentAt       = 0
  isReportingError = false
}
