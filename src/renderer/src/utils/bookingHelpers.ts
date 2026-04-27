/**
 * Helpers purs pour le flow de booking. Extraits de BookingFlow.vue pour
 * permettre d'autres consommateurs (tests directs, autres SFC) sans
 * dependre du contexte d'execution Vue.
 */

/** Convertit une Date locale en YYYY-MM-DD. */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Format date long format FR : "lundi 27 avril 2026".
 * Accepte une chaine ISO complete (`2026-04-27T14:00:00Z`) ou date-only (`2026-04-27`).
 */
export function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Format heure court FR : "14:30". */
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Detecte le fuseau horaire du visiteur via Intl.DateTimeFormat. Fallback
 * 'Europe/Paris' si l'API echoue (vieux runtime, jsdom restrictif, etc.).
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Europe/Paris'
  }
}

/** Initiales des jours de la semaine en FR (semaine commencant le lundi). */
export const DAY_INITIALS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

/**
 * Mappe un code d'erreur backend vers un titre d'erreur lisible.
 * Utilise par BookingFlow pour la step error pleine largeur.
 */
export function bookingErrorTitle(code?: string): string {
  switch (code) {
    case 'closed':         return 'Reservations fermees'
    case 'inactive':       return 'Type de RDV indisponible'
    case 'not_found':      return 'Lien introuvable'
    case 'already_booked': return 'Tu as deja reserve'
    case 'invalid_link':   return 'Lien invalide'
    default:               return 'Lien invalide'
  }
}
