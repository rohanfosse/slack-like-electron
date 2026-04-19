/**
 * Tests pour le registre des mini-jeux — source unique consommee par le hub
 * /jeux, les sidebars et les vues de jeu. Un bug ici casse la decouverte des
 * jeux en prod (liens morts, couleurs par defaut, badges fantomes).
 */
import { describe, it, expect } from 'vitest'
import { GAMES, type Game } from '@/games/registry'

describe('GAMES registry', () => {
  it('expose au moins 3 jeux (typerace, snake, space_invaders)', () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(3)
  })

  it('chaque jeu a tous les champs requis et valides', () => {
    for (const g of GAMES) {
      expect(g.id).toBeTruthy()
      expect(g.label).toBeTruthy()
      expect(g.icon).toBeDefined()
      expect(g.tagline).toBeTruthy()
      expect(g.description).toBeTruthy()
      expect(g.route).toBeTruthy()
      expect(g.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('les ids sont uniques', () => {
    const ids = GAMES.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('les routes sont uniques et commencent par /', () => {
    const routes = GAMES.map(g => g.route)
    expect(new Set(routes).size).toBe(routes.length)
    for (const r of routes) {
      expect(r.startsWith('/')).toBe(true)
    }
  })

  it('les labels sont uniques (pour l affichage hub)', () => {
    const labels = GAMES.map(g => g.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('le badge ne prend que les valeurs autorisees', () => {
    const allowed: Array<Game['badge']> = ['new', 'beta', null, undefined]
    for (const g of GAMES) {
      expect(allowed).toContain(g.badge)
    }
  })

  it('contient Snake et Space Invaders (v2.173)', () => {
    const ids = GAMES.map(g => g.id)
    expect(ids).toContain('snake')
    expect(ids).toContain('space_invaders')
  })

  it('chaque accent est un hex lisible (pas noir ou blanc pur)', () => {
    for (const g of GAMES) {
      expect(g.accent.toLowerCase()).not.toBe('#000000')
      expect(g.accent.toLowerCase()).not.toBe('#ffffff')
    }
  })

  it('les descriptions sont plus longues que les taglines', () => {
    for (const g of GAMES) {
      expect(g.description.length).toBeGreaterThanOrEqual(g.tagline.length)
    }
  })
})
