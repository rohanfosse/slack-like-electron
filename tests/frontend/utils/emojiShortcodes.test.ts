import { describe, it, expect } from 'vitest'
import { searchEmojiShortcodes, EMOJI_BY_SHORTCODE, EMOJI_SHORTCODES } from '@/utils/emojiShortcodes'

describe('EMOJI_SHORTCODES', () => {
  it('tous les shortcodes sont uniques', () => {
    const set = new Set(EMOJI_SHORTCODES.map(e => e.shortcode))
    expect(set.size).toBe(EMOJI_SHORTCODES.length)
  })

  it('EMOJI_BY_SHORTCODE permet un lookup O(1)', () => {
    expect(EMOJI_BY_SHORTCODE.get('thumbsup')).toBe('👍')
    expect(EMOJI_BY_SHORTCODE.get('fire')).toBe('🔥')
    expect(EMOJI_BY_SHORTCODE.get('nope_nope_nope')).toBeUndefined()
  })
})

describe('searchEmojiShortcodes', () => {
  it('retourne une liste quand la requete est vide', () => {
    const results = searchEmojiShortcodes('')
    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('priorise startsWith sur includes', () => {
    const results = searchEmojiShortcodes('smile')
    // 'smile' startsWith doit venir avant 'smiley_cat' etc.
    expect(results[0].shortcode.startsWith('smile')).toBe(true)
  })

  it('matche les keywords', () => {
    const results = searchEmojiShortcodes('happy')
    // 'happy' est un keyword de plusieurs smileys, aucun shortcode ne
    // commence par 'happy' donc on doit quand meme retrouver des resultats
    expect(results.length).toBeGreaterThan(0)
  })

  it('retourne au plus 10 resultats', () => {
    const results = searchEmojiShortcodes('a')
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('trouve thumbsup via shortcode exact', () => {
    const results = searchEmojiShortcodes('thumbs')
    expect(results.some(r => r.emoji === '👍')).toBe(true)
  })

  it('insensible a la casse', () => {
    const a = searchEmojiShortcodes('FIRE')
    const b = searchEmojiShortcodes('fire')
    expect(a.map(r => r.shortcode)).toEqual(b.map(r => r.shortcode))
  })

  it('query sans match retourne un tableau vide', () => {
    const results = searchEmojiShortcodes('zzzznomatchzzz')
    expect(results).toEqual([])
  })
})
