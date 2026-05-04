/**
 * Palette fermée de 8 couleurs pour identifier les promotions.
 *
 * Objectif design : garantir l'harmonie visuelle à travers l'app (calendrier,
 * sidebar, dashboard). Interdit aux profs de créer "3 bleus qui se ressemblent".
 *
 * Critères de sélection :
 *  - Répartition uniforme sur le cercle chromatique (8 positions ~45° d'écart en HSL)
 *  - Saturation/lightness calibrées pour être WCAG-readable light + dark
 *  - Alignées avec les tokens sémantiques existants quand c'est pertinent
 *
 * Note v2.272 (alignement landing) : malgré le passage de l'accent app à indigo
 * #6366F1, la palette promo reste figée. Raisons :
 *  1. La fonction d'auto-assignation est `hash(promoName) % palette.length` ;
 *     ajouter/retirer une entrée déplace TOUTES les couleurs auto-assignées des
 *     promos existantes en prod → migration silencieuse non souhaitable.
 *  2. La palette promo identifie une *promotion* (entité métier persistante),
 *     pas l'identité visuelle de l'app. Indigo est l'accent système, pas une
 *     couleur de promo distincte.
 *  3. `#4A90D9` (slug sky) existe en DB sur des promos en cours — le retirer
 *     ferait fail `isPaletteColor` et déclencherait un fallback hash silencieux.
 */

export interface PromoColor {
  /** Nom affiché (fr). */
  label: string
  /** Valeur hex stockée en DB. Source de vérité. */
  value: string
  /** Slug stable (non affiché — utile pour tests/analytics). */
  slug: string
}

export const PROMO_PALETTE: readonly PromoColor[] = Object.freeze([
  { slug: 'sky',    label: 'Ciel',    value: '#4A90D9' },
  { slug: 'violet', label: 'Violet',  value: '#8E5FC5' },
  { slug: 'rose',   label: 'Rose',    value: '#D65B8F' },
  { slug: 'orange', label: 'Orange',  value: '#E8891A' },
  { slug: 'amber',  label: 'Ambre',   value: '#E5B84A' },
  { slug: 'green',  label: 'Vert',    value: '#2EB871' },
  { slug: 'teal',   label: 'Sarcelle',value: '#14B8A6' },
  { slug: 'slate',  label: 'Ardoise', value: '#64748B' },
] as const)

/** Default fallback (doit exister dans PROMO_PALETTE). */
export const DEFAULT_PROMO_COLOR = PROMO_PALETTE[0].value

/**
 * Hash deterministe d'une chaîne → index dans la palette.
 * Deux promos avec le même nom obtiennent la même couleur auto-assignée.
 */
function hashToIndex(s: string, mod: number): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0
  }
  return ((hash % mod) + mod) % mod
}

// Pre-computed lowercase set des valeurs de palette — check O(1) au lieu de .some() linéaire.
const PALETTE_LOWER = new Set(PROMO_PALETTE.map((c) => c.value.toLowerCase()))

// Caches : les fonctions sont pures/déterministes et appelées dans des hot-paths
// (computed `events` du store pour chaque ganttRow/reminder sur 500+ entrées possibles).
const nameColorCache = new Map<string, string>()
const normalizeCache = new Map<string, string>()

/** Couleur auto-assignée depuis un nom de promo (pour seed / migration). */
export function getPromoColorFromName(name: string | null | undefined): string {
  const key = (name ?? '').trim()
  if (!key) return DEFAULT_PROMO_COLOR
  const cached = nameColorCache.get(key)
  if (cached) return cached
  const color = PROMO_PALETTE[hashToIndex(key, PROMO_PALETTE.length)].value
  nameColorCache.set(key, color)
  return color
}

/** Vérifie qu'un hex est dans la palette canonique. */
export function isPaletteColor(hex: string | null | undefined): boolean {
  if (!hex) return false
  return PALETTE_LOWER.has(hex.trim().toLowerCase())
}

/**
 * Normalise une couleur stockée vers la palette :
 * - si elle est déjà dans la palette → inchangée
 * - sinon → fallback sur l'auto-assignée depuis le nom (cohérence visuelle)
 */
export function normalizePromoColor(hex: string | null | undefined, fallbackName: string | null | undefined): string {
  const cacheKey = `${hex ?? ''}|${fallbackName ?? ''}`
  const cached = normalizeCache.get(cacheKey)
  if (cached) return cached
  const color = isPaletteColor(hex) ? (hex as string) : getPromoColorFromName(fallbackName)
  normalizeCache.set(cacheKey, color)
  return color
}
