/**
 * Derive une couleur HSL stable a partir du nom d'une categorie.
 * Saturation et lightness fixes pour un rendu homogene en theme sombre.
 */
const colorCache = new Map<string, string>()

export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return '#3b82f6'  // bleu par defaut
  const cached = colorCache.get(category)
  if (cached) return cached

  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = ((hash % 360) + 360) % 360
  const color = `hsl(${hue}, 65%, 55%)`
  colorCache.set(category, color)
  return color
}

/** Version avec opacite pour les fonds d'evenements. */
export function getCategoryBg(category: string | null | undefined, alpha = 0.15): string {
  if (!category) return `rgba(59, 130, 246, ${alpha})`
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsla(${hue}, 65%, 55%, ${alpha})`
}
