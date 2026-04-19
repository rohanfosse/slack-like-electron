/**
 * snakeEngine — logique pure du mini-jeu Snake, sans etat Vue ni dependance
 * DOM. Toutes les fonctions sont deterministes (l alea est injecte via un
 * generateur fourni par l appelant), ce qui rend le moteur entierement
 * testable en isolation.
 *
 * Le composant SnakeView pilote les refs Vue + le rendu canvas et consomme
 * ces fonctions pour avancer d un tick.
 */

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Cell { x: number; y: number }

export interface SnakeConfig {
  width:       number
  height:      number
  tickInitial: number
  tickMin:     number
  tickStep:    number
  /** Accelere tous les N pommes. */
  foodPerStep: number
}

export const DEFAULT_SNAKE_CONFIG: SnakeConfig = {
  width:       20,
  height:      15,
  tickInitial: 140,
  tickMin:     60,
  tickStep:    8,
  foodPerStep: 5,
}

/** Directions opposees — empeche le 180 instantane. */
const OPPOSITE: Record<Dir, Dir> = {
  up:    'down',
  down:  'up',
  left:  'right',
  right: 'left',
}

/** Corps initial : 3 cellules horizontales au centre de la grille. */
export function initialSnake(w: number, h: number): Cell[] {
  const cx = Math.floor(w / 2)
  const cy = Math.floor(h / 2)
  return [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
}

/** Empeche le demi-tour instantane : retourne null si la direction est opposee. */
export function canTurn(from: Dir, to: Dir): boolean {
  return OPPOSITE[to] !== from
}

/** Cellule occupee par la tete apres un deplacement dans la direction donnee. */
export function nextCell(head: Cell, dir: Dir): Cell {
  switch (dir) {
    case 'up':    return { x: head.x,     y: head.y - 1 }
    case 'down':  return { x: head.x,     y: head.y + 1 }
    case 'left':  return { x: head.x - 1, y: head.y     }
    case 'right': return { x: head.x + 1, y: head.y     }
  }
}

export function isWallHit(cell: Cell, w: number, h: number): boolean {
  return cell.x < 0 || cell.x >= w || cell.y < 0 || cell.y >= h
}

export function isSelfHit(body: readonly Cell[], cell: Cell): boolean {
  return body.some(c => c.x === cell.x && c.y === cell.y)
}

/**
 * Avance le serpent d un pas. Retourne le nouveau corps : si la tete arrive
 * sur une pomme, la queue n est PAS retiree (croissance) ; sinon la queue
 * est retiree (translation pure).
 */
export function advance(body: readonly Cell[], next: Cell, ateFood: boolean): Cell[] {
  const grown = [next, ...body]
  if (!ateFood) grown.pop()
  return grown
}

/**
 * Calcule le prochain interval de tick. Accelere chaque fois que foodEaten
 * est un multiple non nul de foodPerStep, sans jamais descendre sous tickMin.
 */
export function computeNextTick(
  currentTickMs: number,
  foodEaten: number,
  cfg: Pick<SnakeConfig, 'tickMin' | 'tickStep' | 'foodPerStep'>,
): number {
  if (foodEaten <= 0 || foodEaten % cfg.foodPerStep !== 0) return currentTickMs
  return Math.max(cfg.tickMin, currentTickMs - cfg.tickStep)
}

/**
 * Tire une cellule libre (non occupee par le corps). `rand` doit retourner
 * un flottant dans [0, 1). L injection permet des tests deterministes.
 */
export function placeFood(
  body: readonly Cell[],
  w: number,
  h: number,
  rand: () => number = Math.random,
): Cell {
  if (body.length === 0) return { x: Math.floor(rand() * w), y: Math.floor(rand() * h) }

  const occupied = new Set(body.map(c => `${c.x},${c.y}`))
  // Cas pathologique : grille pleine. On renvoie la tete (l appelant est en
  // game over imminent de toute facon).
  if (occupied.size >= w * h) return body[0]

  // Tirage aleatoire avec fallback deterministe pour eviter la boucle
  // infinie si rand est biaise. Max 100 essais, puis scan lineaire.
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(rand() * w)
    const y = Math.floor(rand() * h)
    if (!occupied.has(`${x},${y}`)) return { x, y }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y }
    }
  }
  return body[0]
}

/**
 * Mappe une touche clavier vers une direction. Supporte AZERTY (ZQSD) et
 * QWERTY (WASD). Retourne null pour toute autre touche.
 */
export function keyToDir(key: string): Dir | null {
  const k = key.toLowerCase()
  if (k === 'arrowup'    || k === 'z' || k === 'w')              return 'up'
  if (k === 'arrowdown'  || k === 's')                           return 'down'
  if (k === 'arrowleft'  || k === 'q' || k === 'a')              return 'left'
  if (k === 'arrowright' || k === 'd')                           return 'right'
  return null
}

export type TickOutcome =
  | { kind: 'wall' }
  | { kind: 'self' }
  | { kind: 'move'; body: Cell[]; ateFood: boolean }

/**
 * Calcule l issue d un tick a partir du corps courant et du prochain pas.
 * Ne place PAS la nouvelle pomme (l appelant le fait via placeFood) : on
 * garde la fonction pure et synchrone.
 */
export function stepOnce(
  body: readonly Cell[],
  dir: Dir,
  food: Cell,
  cfg: Pick<SnakeConfig, 'width' | 'height'>,
): TickOutcome {
  const head = body[0]
  const next = nextCell(head, dir)
  if (isWallHit(next, cfg.width, cfg.height)) return { kind: 'wall' }
  if (isSelfHit(body, next))                  return { kind: 'self' }
  const ateFood = next.x === food.x && next.y === food.y
  return { kind: 'move', body: advance(body, next, ateFood), ateFood }
}
