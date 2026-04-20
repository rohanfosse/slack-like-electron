/**
 * useEmojiFrequency : tracker d'emojis recents (localStorage partage).
 * Utilise par EmojiPicker et le menu contextuel des messages pour
 * proposer les emojis preferes/recents de l'utilisateur.
 */

const FREQ_KEY = 'cc_emoji_freq'
const MAX_SIZE = 16

/** Palette par defaut, curee pour l'UI cursus : moderne, expressive, courte. */
const DEFAULT_FAVORITES: readonly string[] = Object.freeze([
  '👍', '❤️', '🎉', '🔥', '💯', '🙏', '✨', '👀',
])

export function getFrequentEmojis(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FREQ_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((e): e is string => typeof e === 'string').slice(0, MAX_SIZE)
  } catch {
    return []
  }
}

export function addFrequentEmoji(emoji: string): void {
  if (!emoji) return
  const list = getFrequentEmojis().filter(e => e !== emoji)
  list.unshift(emoji)
  try {
    localStorage.setItem(FREQ_KEY, JSON.stringify(list.slice(0, MAX_SIZE)))
  } catch { /* quota depasse ou storage inaccessible : on ignore */ }
}

/** Retourne N emojis favoris : les recents en tete, completes avec les defaults. */
export function getQuickEmojis(count = 8): string[] {
  const freq = getFrequentEmojis()
  const defaults = DEFAULT_FAVORITES
  const seen = new Set<string>()
  const out: string[] = []
  for (const e of [...freq, ...defaults]) {
    if (seen.has(e)) continue
    seen.add(e)
    out.push(e)
    if (out.length >= count) break
  }
  return out
}

export { DEFAULT_FAVORITES }
