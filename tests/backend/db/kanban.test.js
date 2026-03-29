/**
 * Tests unitaires pour le modele kanban (cartes de suivi projet).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/kanban')

  const db = getTestDb()
  // Seed: group and travail for kanban cards
  db.exec(`
    INSERT OR IGNORE INTO groups (id, promo_id, name) VALUES (10, 1, 'Kanban Group')
  `)
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published)
    VALUES (10, 1, 1, 'Projet Kanban', '2099-12-31T23:59:00Z', 'livrable', 1)
  `)
})

afterAll(() => teardownTestDb())

describe('createKanbanCard', () => {
  it('creates a card and returns it with default status todo', () => {
    const card = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Task 1',
      description: 'First task',
      createdBy: 'Jean',
    })
    expect(card).toBeDefined()
    expect(card.title).toBe('Task 1')
    expect(card.description).toBe('First task')
    expect(card.status).toBe('todo')
    expect(card.created_by).toBe('Jean')
  })

  it('auto-increments position for cards in same status', () => {
    const card1 = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Pos 0',
    })
    const card2 = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Pos 1',
    })
    expect(card2.position).toBeGreaterThan(card1.position)
  })

  it('defaults description to empty string and createdBy to empty', () => {
    const card = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Minimal Card',
    })
    expect(card.description).toBe('')
    expect(card.created_by).toBe('')
  })
})

describe('getKanbanCards', () => {
  it('returns cards for a given travail and group', () => {
    const cards = queries.getKanbanCards(10, 10)
    expect(Array.isArray(cards)).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('returns empty array for non-existent travail/group', () => {
    const cards = queries.getKanbanCards(9999, 9999)
    expect(cards).toEqual([])
  })
})

describe('updateKanbanCard', () => {
  let cardId

  beforeAll(() => {
    const card = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Update Me',
      description: 'Original desc',
    })
    cardId = card.id
  })

  it('updates title only', () => {
    const updated = queries.updateKanbanCard(cardId, { title: 'Updated Title' })
    expect(updated.title).toBe('Updated Title')
    expect(updated.description).toBe('Original desc')
  })

  it('updates description only', () => {
    const updated = queries.updateKanbanCard(cardId, { description: 'New desc' })
    expect(updated.description).toBe('New desc')
  })

  it('updates position only', () => {
    const updated = queries.updateKanbanCard(cardId, { position: 42 })
    expect(updated.position).toBe(42)
  })

  it('returns card unchanged when no fields provided', () => {
    const unchanged = queries.updateKanbanCard(cardId, {})
    expect(unchanged).toBeDefined()
    expect(unchanged.id).toBe(cardId)
  })
})

describe('moveKanbanCard', () => {
  let cardId

  beforeAll(() => {
    const card = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Move Me',
    })
    cardId = card.id
  })

  it('moves a card to doing status', () => {
    const moved = queries.moveKanbanCard(cardId, 'doing', 0)
    expect(moved.status).toBe('doing')
    expect(moved.position).toBe(0)
  })

  it('moves a card to done status', () => {
    const moved = queries.moveKanbanCard(cardId, 'done', 1)
    expect(moved.status).toBe('done')
    expect(moved.position).toBe(1)
  })

  it('moves a card to blocked status', () => {
    const moved = queries.moveKanbanCard(cardId, 'blocked', 0)
    expect(moved.status).toBe('blocked')
  })
})

describe('deleteKanbanCard', () => {
  it('deletes a card', () => {
    const card = queries.createKanbanCard({
      travailId: 10,
      groupId: 10,
      title: 'Delete Me',
    })
    const result = queries.deleteKanbanCard(card.id)
    expect(result.changes).toBe(1)

    // Verify it no longer appears
    const cards = queries.getKanbanCards(10, 10)
    const found = cards.find(c => c.id === card.id)
    expect(found).toBeUndefined()
  })

  it('returns changes=0 for non-existent card', () => {
    const result = queries.deleteKanbanCard(99999)
    expect(result.changes).toBe(0)
  })
})
