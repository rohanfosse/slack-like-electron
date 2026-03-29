import { describe, it, expect } from 'vitest'

describe('TabPromotions filteredPromos logic', () => {
  const promos = [
    { id: 1, name: 'A', color: '#000' },
    { id: 2, name: 'B', color: '#fff' },
  ]

  function filteredPromos(activePromoId: number | null, allPromos: typeof promos) {
    if (activePromoId == null) return allPromos
    const filtered = allPromos.filter(p => p.id === activePromoId)
    return filtered.length ? filtered : allPromos
  }

  it('returns all promos when activePromoId is null', () => {
    expect(filteredPromos(null, promos)).toEqual(promos)
  })

  it('returns matching promo when activePromoId exists', () => {
    expect(filteredPromos(1, promos)).toEqual([promos[0]])
  })

  it('falls back to all promos when activePromoId does not exist', () => {
    expect(filteredPromos(999, promos)).toEqual(promos)
  })
})
