/**
 * Tests pour useTeacherBento — visibilite des tuiles du bento professeur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

import { useTeacherBento, TEACHER_TILES } from '@/composables/useTeacherBento'

describe('useTeacherBento', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()

    // Reset to defaults via resetTiles
    const { resetTiles } = useTeacherBento()
    resetTiles()
  })

  // ── TEACHER_TILES ─────────────────────────────────────────────────────────
  it('exports TEACHER_TILES with at least 10 tiles', () => {
    expect(TEACHER_TILES.length).toBeGreaterThanOrEqual(10)
  })

  it('each tile has required fields', () => {
    for (const tile of TEACHER_TILES) {
      expect(tile.id).toBeDefined()
      expect(tile.label).toBeDefined()
      expect(tile.description).toBeDefined()
      expect(tile.category).toBeDefined()
      expect(tile.sizes.length).toBeGreaterThanOrEqual(1)
      expect(tile.defaultSize).toBeDefined()
      expect(typeof tile.defaultEnabled).toBe('boolean')
    }
  })

  // ── isVisible ─────────────────────────────────────────────────────────────
  it('defaultEnabled tiles are visible by default', () => {
    const { isVisible } = useTeacherBento()
    const enabledTiles = TEACHER_TILES.filter(t => t.defaultEnabled)
    for (const tile of enabledTiles) {
      expect(isVisible(tile.id)).toBe(true)
    }
  })

  it('non-defaultEnabled tiles are hidden by default', () => {
    const { isVisible } = useTeacherBento()
    const disabledTiles = TEACHER_TILES.filter(t => !t.defaultEnabled)
    for (const tile of disabledTiles) {
      expect(isVisible(tile.id)).toBe(false)
    }
  })

  // ── toggleTile ────────────────────────────────────────────────────────────
  it('toggleTile hides a visible tile', () => {
    const { isVisible, toggleTile } = useTeacherBento()
    expect(isVisible('focus')).toBe(true)
    toggleTile('focus')
    expect(isVisible('focus')).toBe(false)
  })

  it('toggleTile shows a hidden tile', () => {
    const { isVisible, toggleTile } = useTeacherBento()
    expect(isVisible('clock')).toBe(false)
    toggleTile('clock')
    expect(isVisible('clock')).toBe(true)
  })

  it('toggleTile persists to localStorage', () => {
    const { toggleTile } = useTeacherBento()
    toggleTile('focus')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'teacher_bento_hidden',
      expect.any(String),
    )
  })

  // ── resetTiles ────────────────────────────────────────────────────────────
  it('resetTiles restores defaults', () => {
    const { toggleTile, isVisible, resetTiles } = useTeacherBento()
    toggleTile('focus') // hide it
    expect(isVisible('focus')).toBe(false)
    resetTiles()
    expect(isVisible('focus')).toBe(true)
  })

  it('resetTiles removes localStorage keys', () => {
    const { resetTiles } = useTeacherBento()
    resetTiles()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('teacher_bento_hidden')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('teacher_bento_opt_order')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('teacher_bento_sizes')
  })

  // ── getWidgetSize / setWidgetSize ─────────────────────────────────────────
  it('getWidgetSize returns defaultSize when no override', () => {
    const { getWidgetSize } = useTeacherBento()
    const focusTile = TEACHER_TILES.find(t => t.id === 'focus')!
    expect(getWidgetSize('focus')).toBe(focusTile.defaultSize)
  })

  it('setWidgetSize overrides the size', () => {
    const { getWidgetSize, setWidgetSize } = useTeacherBento()
    setWidgetSize('focus', '1x1')
    expect(getWidgetSize('focus')).toBe('1x1')
  })

  it('setWidgetSize persists to localStorage', () => {
    const { setWidgetSize } = useTeacherBento()
    setWidgetSize('focus', '2x1')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'teacher_bento_sizes',
      expect.any(String),
    )
  })

  it('getWidgetSize returns 1x1 for unknown tile', () => {
    const { getWidgetSize } = useTeacherBento()
    expect(getWidgetSize('nonexistent')).toBe('1x1')
  })

  // ── reorderOptional ───────────────────────────────────────────────────────
  it('reorderOptional changes optional tile order', () => {
    const { reorderOptional, visibleOptionalTiles, toggleTile } = useTeacherBento()
    // Make two optional tiles visible
    toggleTile('clock')
    toggleTile('quote')

    const clockTile = TEACHER_TILES.find(t => t.id === 'clock')!
    const quoteTile = TEACHER_TILES.find(t => t.id === 'quote')!

    reorderOptional([quoteTile, clockTile])
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'teacher_bento_opt_order',
      expect.any(String),
    )
  })

  // ── allTiles ──────────────────────────────────────────────────────────────
  it('allTiles returns the full list', () => {
    const { allTiles } = useTeacherBento()
    expect(allTiles).toBe(TEACHER_TILES)
  })

  // ── visibleTiles (computed) ───────────────────────────────────────────────
  it('visibleTiles exclut les tuiles masquees', () => {
    const { visibleTiles, toggleTile } = useTeacherBento()
    const before = visibleTiles.value.length
    toggleTile('focus') // cache une tuile visible par defaut
    expect(visibleTiles.value.length).toBe(before - 1)
    expect(visibleTiles.value.find(t => t.id === 'focus')).toBeUndefined()
  })

  it('visibleTiles inclut les tuiles nouvellement activees', () => {
    const { visibleTiles, toggleTile } = useTeacherBento()
    expect(visibleTiles.value.find(t => t.id === 'clock')).toBeUndefined()
    toggleTile('clock')
    expect(visibleTiles.value.find(t => t.id === 'clock')).toBeDefined()
  })

  it('visibleTiles contient uniquement des WidgetDef valides', () => {
    const { visibleTiles } = useTeacherBento()
    for (const tile of visibleTiles.value) {
      expect(tile).toBeDefined()
      expect(tile.id).toBeDefined()
    }
  })

  // ── reorderTiles ──────────────────────────────────────────────────────────
  it('reorderTiles persiste le nouvel ordre', () => {
    const { reorderTiles, visibleTiles } = useTeacherBento()
    const reversed = [...visibleTiles.value].reverse()
    reorderTiles(reversed)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'teacher_bento_opt_order',
      expect.any(String),
    )
  })

  it('reorderTiles applique l ordre sur visibleTiles', () => {
    const { reorderTiles, visibleTiles } = useTeacherBento()
    const firstId = visibleTiles.value[0].id
    const lastId = visibleTiles.value[visibleTiles.value.length - 1].id
    const reversed = [...visibleTiles.value].reverse()
    reorderTiles(reversed)
    expect(visibleTiles.value[0].id).toBe(lastId)
    expect(visibleTiles.value[visibleTiles.value.length - 1].id).toBe(firstId)
  })

  it('reorderTiles preserve les tuiles masquees hors de la sequence', () => {
    const { reorderTiles, toggleTile, visibleTiles } = useTeacherBento()
    // Cache 'clock' reste masque apres un reorder
    expect(visibleTiles.value.find(t => t.id === 'clock')).toBeUndefined()
    const reversed = [...visibleTiles.value].reverse()
    reorderTiles(reversed)
    toggleTile('clock') // on l active : il doit apparaitre quelque part
    expect(visibleTiles.value.find(t => t.id === 'clock')).toBeDefined()
  })

  // ── smartReorganize ───────────────────────────────────────────────────────
  it('smartReorganize range les essentielles en premier', () => {
    const { smartReorganize, visibleTiles } = useTeacherBento()
    smartReorganize()
    // La 1ere tuile visible doit appartenir a la categorie la plus prioritaire
    // presente dans l ensemble visible (essential ou tracking).
    const firstCat = visibleTiles.value[0].category
    expect(['essential', 'tracking']).toContain(firstCat)
  })

  it('smartReorganize persiste l ordre', () => {
    const { smartReorganize } = useTeacherBento()
    smartReorganize()
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'teacher_bento_opt_order',
      expect.any(String),
    )
  })

  it('smartReorganize laisse la categorie fun vers la fin', () => {
    const { smartReorganize, toggleTile, visibleTiles } = useTeacherBento()
    toggleTile('clock') // fun
    smartReorganize()
    const funIdx = visibleTiles.value.findIndex(t => t.id === 'clock')
    const essentialIdx = visibleTiles.value.findIndex(t => t.category === 'essential')
    // fun doit etre apres au moins une tuile essentielle
    if (essentialIdx >= 0 && funIdx >= 0) {
      expect(funIdx).toBeGreaterThan(essentialIdx)
    }
  })

  it('smartReorganize est idempotent (2 appels = meme resultat)', () => {
    const { smartReorganize, visibleTiles } = useTeacherBento()
    smartReorganize()
    const order1 = visibleTiles.value.map(t => t.id)
    smartReorganize()
    const order2 = visibleTiles.value.map(t => t.id)
    expect(order2).toEqual(order1)
  })

  it('smartReorganize conserve le meme ensemble de tuiles visibles', () => {
    const { smartReorganize, visibleTiles } = useTeacherBento()
    const beforeIds = new Set(visibleTiles.value.map(t => t.id))
    smartReorganize()
    const afterIds = new Set(visibleTiles.value.map(t => t.id))
    expect(afterIds).toEqual(beforeIds)
  })
})
