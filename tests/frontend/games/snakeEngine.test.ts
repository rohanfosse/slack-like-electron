/**
 * Tests pour le moteur pur Snake — extrait de SnakeView.vue pour isoler la
 * logique de jeu (deplacement, collisions, vitesse, input) du rendu Vue.
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SNAKE_CONFIG,
  initialSnake,
  canTurn,
  nextCell,
  isWallHit,
  isSelfHit,
  advance,
  computeNextTick,
  placeFood,
  keyToDir,
  stepOnce,
  type Cell,
} from '@/games/snakeEngine'

describe('initialSnake', () => {
  it('place 3 cellules horizontales au centre de la grille', () => {
    const body = initialSnake(20, 15)
    expect(body).toHaveLength(3)
    expect(body[0]).toEqual({ x: 10, y: 7 })
    expect(body[1]).toEqual({ x: 9,  y: 7 })
    expect(body[2]).toEqual({ x: 8,  y: 7 })
  })

  it('adapte le centre a la taille de la grille', () => {
    const body = initialSnake(10, 10)
    expect(body[0]).toEqual({ x: 5, y: 5 })
  })
})

describe('canTurn', () => {
  it('autorise un virage perpendiculaire', () => {
    expect(canTurn('right', 'up')).toBe(true)
    expect(canTurn('right', 'down')).toBe(true)
    expect(canTurn('up', 'left')).toBe(true)
  })

  it('refuse le demi-tour instantane', () => {
    expect(canTurn('right', 'left')).toBe(false)
    expect(canTurn('left', 'right')).toBe(false)
    expect(canTurn('up', 'down')).toBe(false)
    expect(canTurn('down', 'up')).toBe(false)
  })

  it('autorise de continuer dans la meme direction', () => {
    expect(canTurn('right', 'right')).toBe(true)
  })
})

describe('nextCell', () => {
  const head: Cell = { x: 5, y: 5 }
  it('up -> y decremente', () => {
    expect(nextCell(head, 'up')).toEqual({ x: 5, y: 4 })
  })
  it('down -> y incremente', () => {
    expect(nextCell(head, 'down')).toEqual({ x: 5, y: 6 })
  })
  it('left -> x decremente', () => {
    expect(nextCell(head, 'left')).toEqual({ x: 4, y: 5 })
  })
  it('right -> x incremente', () => {
    expect(nextCell(head, 'right')).toEqual({ x: 6, y: 5 })
  })
  it('ne mute pas la tete d origine', () => {
    const original = { x: 5, y: 5 }
    nextCell(original, 'up')
    expect(original).toEqual({ x: 5, y: 5 })
  })
})

describe('isWallHit', () => {
  const w = 20, h = 15
  it('false pour une cellule interieure', () => {
    expect(isWallHit({ x: 10, y: 7 }, w, h)).toBe(false)
  })
  it('true pour x negatif', () => {
    expect(isWallHit({ x: -1, y: 5 }, w, h)).toBe(true)
  })
  it('true pour x >= width', () => {
    expect(isWallHit({ x: 20, y: 5 }, w, h)).toBe(true)
  })
  it('true pour y negatif', () => {
    expect(isWallHit({ x: 5, y: -1 }, w, h)).toBe(true)
  })
  it('true pour y >= height', () => {
    expect(isWallHit({ x: 5, y: 15 }, w, h)).toBe(true)
  })
  it('accepte les bords [0, w-1] et [0, h-1]', () => {
    expect(isWallHit({ x: 0, y: 0 }, w, h)).toBe(false)
    expect(isWallHit({ x: 19, y: 14 }, w, h)).toBe(false)
  })
})

describe('isSelfHit', () => {
  const body: Cell[] = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]
  it('false si cellule hors du corps', () => {
    expect(isSelfHit(body, { x: 10, y: 10 })).toBe(false)
  })
  it('true si cellule egale a une cellule du corps', () => {
    expect(isSelfHit(body, { x: 4, y: 5 })).toBe(true)
  })
})

describe('advance', () => {
  const body: Cell[] = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]

  it('translate le corps quand pas de nourriture (longueur conservee)', () => {
    const next = advance(body, { x: 6, y: 5 }, false)
    expect(next).toHaveLength(3)
    expect(next[0]).toEqual({ x: 6, y: 5 })
    expect(next[1]).toEqual({ x: 5, y: 5 })
    expect(next[2]).toEqual({ x: 4, y: 5 })
  })

  it('fait grandir le corps quand on mange (longueur +1)', () => {
    const next = advance(body, { x: 6, y: 5 }, true)
    expect(next).toHaveLength(4)
    expect(next[0]).toEqual({ x: 6, y: 5 })
    expect(next[next.length - 1]).toEqual({ x: 3, y: 5 }) // queue conservee
  })

  it('ne mute pas le corps source', () => {
    const copy = JSON.parse(JSON.stringify(body))
    advance(body, { x: 6, y: 5 }, false)
    expect(body).toEqual(copy)
  })
})

describe('computeNextTick', () => {
  const cfg = { tickMin: 60, tickStep: 8, foodPerStep: 5 }

  it('ne change rien si foodEaten n est pas un multiple', () => {
    expect(computeNextTick(140, 3, cfg)).toBe(140)
    expect(computeNextTick(140, 7, cfg)).toBe(140)
  })

  it('ne change rien si foodEaten == 0', () => {
    expect(computeNextTick(140, 0, cfg)).toBe(140)
  })

  it('accelere (tick - step) tous les N food', () => {
    expect(computeNextTick(140, 5, cfg)).toBe(132)
    expect(computeNextTick(132, 10, cfg)).toBe(124)
  })

  it('clamp au tickMin', () => {
    expect(computeNextTick(64, 50, cfg)).toBe(60)
    expect(computeNextTick(60, 55, cfg)).toBe(60)
  })
})

describe('placeFood', () => {
  it('retourne une cellule libre', () => {
    const body: Cell[] = [{ x: 0, y: 0 }]
    const food = placeFood(body, 3, 3, () => 0.5)
    expect(food.x).toBeGreaterThanOrEqual(0)
    expect(food.x).toBeLessThan(3)
    expect(food.y).toBeGreaterThanOrEqual(0)
    expect(food.y).toBeLessThan(3)
  })

  it('evite les cellules occupees', () => {
    // Grille 2x2 avec 3 cellules occupees : la seule libre est (1, 1).
    const body: Cell[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
    // rand() = 0 forcerait (0, 0) qui est occupee — le fallback lineaire doit
    // trouver (1, 1).
    const food = placeFood(body, 2, 2, () => 0)
    expect(food).toEqual({ x: 1, y: 1 })
  })

  it('est deterministe avec un rand fourni', () => {
    const body: Cell[] = []
    const food = placeFood(body, 10, 10, () => 0.55)
    expect(food).toEqual({ x: 5, y: 5 })
  })

  it('ne boucle pas infiniment si rand est constant et tombe sur une case occupee', () => {
    const body: Cell[] = [{ x: 5, y: 5 }]
    // rand constant = 0.5 -> (5, 5) occupee. Le fallback scan doit renvoyer
    // une autre cellule libre.
    const food = placeFood(body, 10, 10, () => 0.5)
    expect(food).not.toEqual({ x: 5, y: 5 })
  })
})

describe('keyToDir', () => {
  it('fleches', () => {
    expect(keyToDir('ArrowUp')).toBe('up')
    expect(keyToDir('ArrowDown')).toBe('down')
    expect(keyToDir('ArrowLeft')).toBe('left')
    expect(keyToDir('ArrowRight')).toBe('right')
  })

  it('AZERTY (ZQSD)', () => {
    expect(keyToDir('z')).toBe('up')
    expect(keyToDir('q')).toBe('left')
    expect(keyToDir('s')).toBe('down')
    expect(keyToDir('d')).toBe('right')
  })

  it('QWERTY (WASD)', () => {
    expect(keyToDir('w')).toBe('up')
    expect(keyToDir('a')).toBe('left')
  })

  it('insensible a la casse', () => {
    expect(keyToDir('W')).toBe('up')
    expect(keyToDir('ARROWUP')).toBe('up')
  })

  it('null pour une touche non mappee', () => {
    expect(keyToDir('x')).toBeNull()
    expect(keyToDir('Enter')).toBeNull()
    expect(keyToDir(' ')).toBeNull()
  })
})

describe('stepOnce', () => {
  const cfg = { width: 10, height: 10 }
  const body: Cell[] = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]

  it('renvoie wall si la tete sort de la grille', () => {
    const edge: Cell[] = [{ x: 9, y: 5 }, { x: 8, y: 5 }]
    const out = stepOnce(edge, 'right', { x: 0, y: 0 }, cfg)
    expect(out.kind).toBe('wall')
  })

  it('renvoie self si la tete percute le corps', () => {
    // Corps en U : si on va vers le bas depuis (5,5), on touche (5,6).
    const u: Cell[] = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }]
    const out = stepOnce(u, 'down', { x: 0, y: 0 }, cfg)
    expect(out.kind).toBe('self')
  })

  it('renvoie move avec ateFood=false sur une cellule vide', () => {
    const out = stepOnce(body, 'right', { x: 9, y: 9 }, cfg)
    expect(out.kind).toBe('move')
    if (out.kind !== 'move') return
    expect(out.ateFood).toBe(false)
    expect(out.body).toHaveLength(3)
    expect(out.body[0]).toEqual({ x: 6, y: 5 })
  })

  it('renvoie move avec ateFood=true quand la tete atteint la pomme', () => {
    const out = stepOnce(body, 'right', { x: 6, y: 5 }, cfg)
    expect(out.kind).toBe('move')
    if (out.kind !== 'move') return
    expect(out.ateFood).toBe(true)
    expect(out.body).toHaveLength(4) // grandit
  })

  it('ne mute pas le corps d entree', () => {
    const original = JSON.parse(JSON.stringify(body))
    stepOnce(body, 'right', { x: 9, y: 9 }, cfg)
    expect(body).toEqual(original)
  })
})

describe('DEFAULT_SNAKE_CONFIG', () => {
  it('expose les constantes historiques du SnakeView', () => {
    expect(DEFAULT_SNAKE_CONFIG.width).toBe(20)
    expect(DEFAULT_SNAKE_CONFIG.height).toBe(15)
    expect(DEFAULT_SNAKE_CONFIG.tickInitial).toBe(140)
    expect(DEFAULT_SNAKE_CONFIG.tickMin).toBe(60)
    expect(DEFAULT_SNAKE_CONFIG.tickStep).toBe(8)
    expect(DEFAULT_SNAKE_CONFIG.foodPerStep).toBe(5)
  })
})
