import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const apiMock = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: apiMock }),
}))

import { useKanbanStore } from '@/stores/kanban'
import type { KanbanCard } from '@/types'

;(window as unknown as { api: Record<string, unknown> }).api = {
  getKanbanCards: vi.fn(),
  createKanbanCard: vi.fn(),
  updateKanbanCard: vi.fn(),
  deleteKanbanCard: vi.fn(),
}

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: 1,
    travail_id: 10,
    group_id: 5,
    title: 'Task 1',
    description: null,
    status: 'todo',
    position: 0,
    created_at: '2026-03-20T00:00:00Z',
    ...overrides,
  } as KanbanCard
}

describe('kanban store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('has empty initial state', () => {
    const s = useKanbanStore()
    expect(s.cards).toEqual([])
    expect(s.loading).toBe(false)
  })

  it('fetchCards loads cards from api', async () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2, title: 'Task 2' })]
    apiMock.mockResolvedValue(cards)

    const s = useKanbanStore()
    await s.fetchCards(10, 5)
    expect(s.cards).toEqual(cards)
    expect(s.loading).toBe(false)
  })

  it('createCard appends new card to state', async () => {
    const newCard = makeCard({ id: 3, title: 'New' })
    apiMock.mockResolvedValue(newCard)

    const s = useKanbanStore()
    s.cards = [makeCard({ id: 1 })]
    const result = await s.createCard(10, 5, { title: 'New' })
    expect(result).toEqual(newCard)
    expect(s.cards.length).toBe(2)
    expect(s.cards[1].id).toBe(3)
  })

  it('createCard returns null on api failure', async () => {
    apiMock.mockResolvedValue(null)
    const s = useKanbanStore()
    const result = await s.createCard(10, 5, { title: 'New' })
    expect(result).toBeNull()
  })

  it('moveCard updates card status in state', async () => {
    const moved = makeCard({ id: 1, status: 'done', position: 0 })
    apiMock.mockResolvedValue(moved)

    const s = useKanbanStore()
    s.cards = [makeCard({ id: 1, status: 'todo' })]
    const ok = await s.moveCard(1, 'done', 0)
    expect(ok).toBe(true)
    expect(s.cards[0].status).toBe('done')
  })

  it('updateCard replaces card data in state', async () => {
    const updated = makeCard({ id: 1, title: 'Updated' })
    apiMock.mockResolvedValue(updated)

    const s = useKanbanStore()
    s.cards = [makeCard({ id: 1, title: 'Old' })]
    const ok = await s.updateCard(1, { title: 'Updated' })
    expect(ok).toBe(true)
    expect(s.cards[0].title).toBe('Updated')
  })

  it('deleteCard removes card from state', async () => {
    apiMock.mockResolvedValue({})

    const s = useKanbanStore()
    s.cards = [makeCard({ id: 1 }), makeCard({ id: 2, title: 'Task 2' })]
    const ok = await s.deleteCard(1)
    expect(ok).toBe(true)
    expect(s.cards.length).toBe(1)
    expect(s.cards[0].id).toBe(2)
  })

  it('deleteCard returns false on api failure', async () => {
    apiMock.mockResolvedValue(null)
    const s = useKanbanStore()
    s.cards = [makeCard({ id: 1 })]
    const ok = await s.deleteCard(1)
    expect(ok).toBe(false)
    expect(s.cards.length).toBe(1)
  })
})
