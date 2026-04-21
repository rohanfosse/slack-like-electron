// ─── Validation d'URLs côté client ───────────────────────────────────────────
// Utilisé pour le dépôt de lien par l'étudiant (composable useStudentDepositInline)
// et tout champ qui accepte une URL utilisateur. Bloque les schemes dangereux
// (javascript:, data:, file:, vbscript:) pour eviter XSS / exfiltration.

export interface UrlValidationResult {
  valid: boolean
  error?: string
  /** URL nettoyée (trimmed) si valide. */
  normalized?: string
}

const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:'])
const MAX_URL_LENGTH = 2048

/**
 * Valide une URL utilisateur avant enregistrement.
 *
 * Règles appliquées :
 * 1. Non-vide après trim
 * 2. Longueur raisonnable (< 2048 caractères, conservative pour compat navigateurs anciens)
 * 3. Scheme explicite autorisé (http/https/mailto) — auto-préfixe `https://` si
 *    l'utilisateur omet le scheme et que la chaîne ressemble à un domaine
 * 4. Parseable via `new URL(...)` — attrape les chaines malformées
 * 5. Pas de scheme dangereux (javascript:, data:, file:, vbscript:)
 *
 * @param input URL brute saisie par l'utilisateur (peut contenir des espaces)
 * @returns `{ valid, error?, normalized? }`
 */
export function validateUrl(input: string): UrlValidationResult {
  const trimmed = input.trim()
  if (!trimmed) return { valid: false, error: 'Le lien est vide.' }
  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: `Le lien dépasse ${MAX_URL_LENGTH} caractères.` }
  }

  // Auto-prefixe https:// si l'utilisateur a tape "exemple.com/path" sans scheme
  let candidate = trimmed
  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(candidate)) {
    // Pas de scheme detecte. On prefixe seulement si ca ressemble a un domaine
    // (contient un point et pas d'espace interne).
    if (/^[^\s]+\.[^\s]+$/.test(candidate)) {
      candidate = `https://${candidate}`
    } else {
      return { valid: false, error: 'Lien invalide : protocole manquant (https:// ou http://).' }
    }
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return { valid: false, error: 'Lien invalide : URL mal formée.' }
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return {
      valid: false,
      error: `Protocole "${url.protocol}" non autorisé. Utilisez https:// ou http://.`,
    }
  }

  return { valid: true, normalized: url.toString() }
}
