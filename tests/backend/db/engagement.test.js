/**
 * Tests unitaires pour le modele engagement (scores d'engagement).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/engagement')

  const db = getTestDb()
  // Seed: create a published travail with a deadline in the future
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published, requires_submission)
    VALUES (100, 1, 1, 'Devoir Engagement', '2099-12-31T23:59:00Z', 'livrable', 1, 1)
  `)
  // Seed: a second student
  db.exec(`
    INSERT OR IGNORE INTO students (id, promo_id, name, email, avatar_initials, password, must_change_password)
    VALUES (2, 1, 'Marie Martin', 'marie@test.fr', 'MM', 'hash', 0)
  `)
})

afterAll(() => teardownTestDb())

describe('computeEngagementScores', () => {
  it('returns an array for a promo with students', () => {
    const results = queries.computeEngagementScores(1)
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('each result has expected engagement fields', () => {
    const results = queries.computeEngagementScores(1)
    const first = results[0]
    expect(first).toHaveProperty('studentId')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('score')
    expect(first).toHaveProperty('messages')
    expect(first).toHaveProperty('onTime')
    expect(first).toHaveProperty('late')
    expect(first).toHaveProperty('missing')
    expect(first).toHaveProperty('totalDevoirs')
    expect(first).toHaveProperty('submitted')
    expect(first).toHaveProperty('lastActivity')
    expect(first).toHaveProperty('atRisk')
  })

  it('score is normalized between 0 and 100', () => {
    const results = queries.computeEngagementScores(1)
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    }
  })

  it('returns empty array for a promo with no students', () => {
    const db = getTestDb()
    db.exec(`INSERT OR IGNORE INTO promotions (id, name) VALUES (99, 'Empty Promo')`)
    const results = queries.computeEngagementScores(99)
    expect(results).toEqual([])
  })

  it('counts messages sent by students', () => {
    const db = getTestDb()
    // Insert messages for student 1
    db.exec(`
      INSERT INTO messages (channel_id, author_name, author_type, content, author_id)
      VALUES (1, 'Jean Dupont', 'student', 'Hello', 1)
    `)
    db.exec(`
      INSERT INTO messages (channel_id, author_name, author_type, content, author_id)
      VALUES (1, 'Jean Dupont', 'student', 'World', 1)
    `)
    const results = queries.computeEngagementScores(1)
    const student1 = results.find(r => r.studentId === 1)
    expect(student1).toBeDefined()
    expect(student1.messages).toBeGreaterThanOrEqual(2)
  })

  it('detects on-time submissions', () => {
    const db = getTestDb()
    // Submit before deadline
    db.exec(`
      INSERT OR IGNORE INTO depots (travail_id, student_id, file_name, file_path, submitted_at)
      VALUES (100, 1, 'rapport.pdf', '/tmp/rapport.pdf', '2026-01-01T10:00:00Z')
    `)
    const results = queries.computeEngagementScores(1)
    const student1 = results.find(r => r.studentId === 1)
    expect(student1.onTime).toBeGreaterThanOrEqual(1)
  })

  it('marks students with low scores as at-risk', () => {
    // Student 2 has no messages and no submissions => missing devoirs => low score
    const results = queries.computeEngagementScores(1)
    const student2 = results.find(r => r.studentId === 2)
    if (student2 && student2.score < 30) {
      expect(student2.atRisk).toBe(true)
    }
  })

  it('results are sorted by score descending', () => {
    const results = queries.computeEngagementScores(1)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })
})
