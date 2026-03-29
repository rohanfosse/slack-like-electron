/**
 * Tests unitaires pour le modele submissions (depots, ressources).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/submissions')

  const db = getTestDb()
  // Seed: travaux for submission tests
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published, requires_submission, category)
    VALUES (20, 1, 1, 'Devoir Soumission', '2099-12-31T23:59:00Z', 'livrable', 1, 1, 'Web Dev')
  `)
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published, requires_submission)
    VALUES (21, 1, 1, 'Devoir Expire', '2020-01-01T00:00:00Z', 'livrable', 1, 1)
  `)
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published, requires_submission)
    VALUES (22, 1, 1, 'Devoir Sans Soumission', '2020-01-01T00:00:00Z', 'livrable', 1, 0)
  `)
})

afterAll(() => teardownTestDb())

describe('addDepot', () => {
  it('creates a file depot with snake_case payload', () => {
    const result = queries.addDepot({
      travail_id: 20,
      student_id: 1,
      type: 'file',
      file_name: 'rapport.pdf',
      content: '/uploads/rapport.pdf',
    })
    expect(result).toBeDefined()
    expect(result.changes).toBe(1)
  })

  it('creates a link depot', () => {
    const db = getTestDb()
    // Need a second student for unique constraint
    db.exec(`
      INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
      VALUES (5, 1, 'Luc Perrin', 'luc@test.fr', 'LP', 'hash', 0)
    `)
    const result = queries.addDepot({
      travail_id: 20,
      student_id: 5,
      type: 'link',
      linkUrl: 'https://github.com/example',
    })
    expect(result.changes).toBe(1)
  })

  it('upserts on conflict (same travail+student)', () => {
    queries.addDepot({
      travail_id: 20,
      student_id: 1,
      type: 'file',
      file_name: 'v2.pdf',
      content: '/uploads/v2.pdf',
    })
    const depots = queries.getDepots(20)
    const student1Depots = depots.filter(d => d.student_id === 1)
    // Should have exactly 1 due to UNIQUE constraint with upsert
    expect(student1Depots.length).toBe(1)
    expect(student1Depots[0].file_name).toBe('v2.pdf')
  })

  it('rejects submission after deadline for requires_submission travail', () => {
    expect(() => {
      queries.addDepot({
        travail_id: 21,
        student_id: 1,
        type: 'file',
        file_name: 'late.pdf',
        content: '/uploads/late.pdf',
      })
    }).toThrow('expiré')
  })

  it('allows submission after deadline when requires_submission is false', () => {
    const result = queries.addDepot({
      travail_id: 22,
      student_id: 1,
      type: 'file',
      file_name: 'ok.pdf',
      content: '/uploads/ok.pdf',
    })
    expect(result.changes).toBe(1)
  })
})

describe('getDepots', () => {
  it('returns depots for a travail with student info', () => {
    const depots = queries.getDepots(20)
    expect(Array.isArray(depots)).toBe(true)
    expect(depots.length).toBeGreaterThan(0)
    expect(depots[0]).toHaveProperty('student_name')
    expect(depots[0]).toHaveProperty('avatar_initials')
    expect(depots[0]).toHaveProperty('late_seconds')
  })

  it('returns empty array for travail with no depots', () => {
    const depots = queries.getDepots(9999)
    expect(depots).toEqual([])
  })
})

describe('setNote', () => {
  it('sets a numeric note on a depot', () => {
    const depots = queries.getDepots(20)
    const depotId = depots[0].id
    const result = queries.setNote({ depotId, note: 15.5 })
    expect(result.changes).toBe(1)

    const db = getTestDb()
    const updated = db.prepare('SELECT note FROM depots WHERE id = ?').get(depotId)
    expect(updated.note).toBe(15.5)
  })
})

describe('setFeedback', () => {
  it('sets feedback text on a depot', () => {
    const depots = queries.getDepots(20)
    const depotId = depots[0].id
    const result = queries.setFeedback({ depotId, feedback: 'Bon travail' })
    expect(result.changes).toBe(1)

    const db = getTestDb()
    const updated = db.prepare('SELECT feedback FROM depots WHERE id = ?').get(depotId)
    expect(updated.feedback).toBe('Bon travail')
  })
})

describe('getRessources', () => {
  it('returns resources for a travail', () => {
    const resources = queries.getRessources(20)
    expect(Array.isArray(resources)).toBe(true)
  })

  it('returns empty array for travail with no resources', () => {
    const resources = queries.getRessources(9999)
    expect(resources).toEqual([])
  })
})

describe('addRessource', () => {
  it('creates a resource linked to a travail', () => {
    const result = queries.addRessource({
      travailId: 20,
      type: 'link',
      name: 'Documentation MDN',
      pathOrUrl: 'https://developer.mozilla.org',
      category: 'reference',
    })
    expect(result).toBeDefined()
    expect(result.changes).toBe(1)
  })

  it('throws for non-existent travail', () => {
    expect(() => {
      queries.addRessource({
        travailId: 99999,
        type: 'link',
        name: 'Invalid',
        pathOrUrl: 'https://example.com',
      })
    }).toThrow('introuvable')
  })
})

describe('deleteRessource', () => {
  it('deletes a ressource from the ressources table', () => {
    const db = getTestDb()
    // travail_id 20 exists from beforeAll seed
    db.prepare(
      "INSERT INTO ressources (travail_id, type, name, path_or_url) VALUES (?, ?, ?, ?)"
    ).run(20, 'link', 'To Delete', 'https://delete.me')
    const row = db.prepare("SELECT id FROM ressources WHERE name = 'To Delete'").get()
    const result = queries.deleteRessource(row.id)
    expect(result.changes).toBe(1)
  })

  it('returns changes=0 for non-existent ressource', () => {
    const result = queries.deleteRessource(99999)
    expect(result.changes).toBe(0)
  })
})
