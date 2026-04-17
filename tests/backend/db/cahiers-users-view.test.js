/**
 * Regression test for "no such table: users" when opening Documents view.
 * Cause : cahiers.js et bookings.js JOIN sur `users` qui n'a jamais existe.
 * Fix v70 : VIEW `users` unifiant teachers + students.
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/cahiers')
})
afterAll(() => teardownTestDb())

describe('users view (v70)', () => {
  it('VIEW users existe et union teachers + students', () => {
    const db = getTestDb()
    const row = db.prepare("SELECT type FROM sqlite_master WHERE name = 'users'").get()
    expect(row).toBeDefined()
    expect(row.type).toBe('view')

    // Le teacher 1 et le student 1 seedes dans setup doivent etre visibles
    const rows = db.prepare('SELECT id, name, role FROM users ORDER BY role, id').all()
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.some(r => r.role === 'teacher')).toBe(true)
    expect(rows.some(r => r.role === 'student')).toBe(true)
  })

  it('getCahiers ne crash plus avec le JOIN users (regression documents)', () => {
    const db = getTestDb()
    // Cree un cahier de test (created_by = teacher 1 seede par le harness)
    db.prepare(
      'INSERT INTO cahiers (promo_id, project, title, created_by) VALUES (1, ?, ?, 1)'
    ).run('projet-test', 'Mon cahier')

    const cahiers = queries.getCahiers(1)
    expect(Array.isArray(cahiers)).toBe(true)
    expect(cahiers.length).toBeGreaterThan(0)
    const c = cahiers[0]
    expect(c.title).toBe('Mon cahier')
    expect(c.author_name).toBeDefined()
  })

  it('getCahierById retourne author_name via la view users', () => {
    const db = getTestDb()
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO cahiers (promo_id, project, title, created_by) VALUES (1, ?, ?, 1)'
    ).run('projet-autre', 'Cahier solo')

    const cahier = queries.getCahierById(Number(lastInsertRowid))
    expect(cahier).toBeDefined()
    expect(cahier.title).toBe('Cahier solo')
    expect(cahier.author_name).toBeDefined()
  })
})
