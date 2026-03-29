/**
 * Tests unitaires pour le modele groups (groupes d'etudiants).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/groups')

  const db = getTestDb()
  // Seed additional students for member tests
  db.exec(`
    INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
    VALUES (2, 1, 'Marie Martin', 'marie@test.fr', 'MM', 'hash', 0)
  `)
  db.exec(`
    INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
    VALUES (3, 1, 'Paul Durand', 'paul@test.fr', 'PD', 'hash', 0)
  `)
})

afterAll(() => teardownTestDb())

describe('createGroup', () => {
  it('creates a group and returns the result with lastInsertRowid', () => {
    const result = queries.createGroup({ promoId: 1, name: 'Groupe Alpha' })
    expect(result).toBeDefined()
    expect(result.changes).toBe(1)
    expect(Number(result.lastInsertRowid)).toBeGreaterThan(0)
  })

  it('creates a private channel for the group', () => {
    const db = getTestDb()
    const result = queries.createGroup({ promoId: 1, name: 'Groupe Beta' })
    const groupId = Number(result.lastInsertRowid)
    const channel = db.prepare('SELECT * FROM channels WHERE group_id = ?').get(groupId)
    expect(channel).toBeDefined()
    expect(channel.is_private).toBe(1)
    expect(channel.promo_id).toBe(1)
  })
})

describe('getGroups', () => {
  it('returns groups for a promo', () => {
    const groups = queries.getGroups(1)
    expect(Array.isArray(groups)).toBe(true)
    expect(groups.length).toBeGreaterThan(0)
  })

  it('includes members_count and channel_id', () => {
    const groups = queries.getGroups(1)
    const group = groups[0]
    expect(group).toHaveProperty('members_count')
    expect(group).toHaveProperty('channel_id')
  })

  it('returns groups sorted by name', () => {
    const groups = queries.getGroups(1)
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1].name.localeCompare(groups[i].name)).toBeLessThanOrEqual(0)
    }
  })

  it('returns empty array for non-existent promo', () => {
    const groups = queries.getGroups(9999)
    expect(groups).toEqual([])
  })
})

describe('setGroupMembers / getGroupMembers', () => {
  let groupId

  beforeAll(() => {
    const result = queries.createGroup({ promoId: 1, name: 'Groupe Members' })
    groupId = Number(result.lastInsertRowid)
  })

  it('sets members for a group', () => {
    queries.setGroupMembers({ groupId, studentIds: [1, 2] })
    const members = queries.getGroupMembers(groupId)
    expect(members.length).toBe(2)
    const ids = members.map(m => m.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })

  it('members have name and avatar_initials', () => {
    const members = queries.getGroupMembers(groupId)
    for (const m of members) {
      expect(m).toHaveProperty('name')
      expect(m).toHaveProperty('avatar_initials')
    }
  })

  it('replaces members entirely on second call', () => {
    queries.setGroupMembers({ groupId, studentIds: [3] })
    const members = queries.getGroupMembers(groupId)
    expect(members.length).toBe(1)
    expect(members[0].id).toBe(3)
  })

  it('clears members when given empty array', () => {
    queries.setGroupMembers({ groupId, studentIds: [] })
    const members = queries.getGroupMembers(groupId)
    expect(members.length).toBe(0)
  })

  it('updates private channel members JSON', () => {
    queries.setGroupMembers({ groupId, studentIds: [1, 2, 3] })
    const db = getTestDb()
    const channel = db.prepare('SELECT members FROM channels WHERE group_id = ?').get(groupId)
    const parsed = JSON.parse(channel.members)
    expect(parsed).toEqual([1, 2, 3])
  })

  it('returns empty array for a group with no members', () => {
    const result = queries.createGroup({ promoId: 1, name: 'Empty Group' })
    const emptyGroupId = Number(result.lastInsertRowid)
    const members = queries.getGroupMembers(emptyGroupId)
    expect(members).toEqual([])
  })
})

describe('deleteGroup', () => {
  it('deletes a group and its associated channel', () => {
    const result = queries.createGroup({ promoId: 1, name: 'To Delete' })
    const groupId = Number(result.lastInsertRowid)

    const db = getTestDb()
    const channelBefore = db.prepare('SELECT id FROM channels WHERE group_id = ?').get(groupId)
    expect(channelBefore).toBeDefined()

    queries.deleteGroup(groupId)

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId)
    expect(group).toBeUndefined()

    const channelAfter = db.prepare('SELECT id FROM channels WHERE group_id = ?').get(groupId)
    expect(channelAfter).toBeUndefined()
  })

  it('returns changes=0 for non-existent group', () => {
    const result = queries.deleteGroup(9999)
    expect(result.changes).toBe(0)
  })
})
