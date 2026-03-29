/**
 * Tests unitaires pour le modele teachers (intervenants et projets).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/teachers')

  const db = getTestDb()
  // Seed: projects for teacher-project assignment tests
  db.exec(`
    INSERT OR IGNORE INTO projects (id, promo_id, name, description, channel_id, created_by)
    VALUES (1, 1, 'Projet Web', 'Developpement web', 1, 1)
  `)
  db.exec(`
    INSERT OR IGNORE INTO projects (id, promo_id, name, description, channel_id, created_by)
    VALUES (2, 1, 'Projet Mobile', 'App mobile', 2, 1)
  `)
})

afterAll(() => teardownTestDb())

describe('createIntervenant', () => {
  it('creates a TA with provided password', () => {
    const id = queries.createIntervenant({
      name: 'Alice TA',
      email: 'alice.ta@cesi.fr',
      password: 'SecureP@ss1',
    })
    expect(Number(id)).toBeGreaterThan(0)

    const db = getTestDb()
    const ta = db.prepare('SELECT * FROM teachers WHERE id = ?').get(Number(id))
    expect(ta.name).toBe('Alice TA')
    expect(ta.role).toBe('ta')
    expect(ta.email).toBe('alice.ta@cesi.fr')
  })

  it('creates a TA with auto-generated password when none provided', () => {
    const id = queries.createIntervenant({
      name: 'Bob TA',
      email: 'bob.ta@cesi.fr',
    })
    expect(Number(id)).toBeGreaterThan(0)
  })

  it('throws on duplicate email', () => {
    expect(() => {
      queries.createIntervenant({
        name: 'Duplicate',
        email: 'alice.ta@cesi.fr',
      })
    }).toThrow('email')
  })

  it('trims and lowercases email', () => {
    const id = queries.createIntervenant({
      name: 'Claire TA',
      email: '  Claire.TA@Cesi.FR  ',
    })
    const db = getTestDb()
    const ta = db.prepare('SELECT email FROM teachers WHERE id = ?').get(Number(id))
    expect(ta.email).toBe('claire.ta@cesi.fr')
  })
})

describe('getIntervenants', () => {
  it('returns only TAs (role=ta)', () => {
    const tas = queries.getIntervenants()
    expect(Array.isArray(tas)).toBe(true)
    for (const ta of tas) {
      expect(ta.role).toBe('ta')
    }
  })

  it('returns id, name, email, role fields', () => {
    const tas = queries.getIntervenants()
    expect(tas.length).toBeGreaterThan(0)
    const ta = tas[0]
    expect(ta).toHaveProperty('id')
    expect(ta).toHaveProperty('name')
    expect(ta).toHaveProperty('email')
    expect(ta).toHaveProperty('role')
  })

  it('returns TAs sorted by name', () => {
    const tas = queries.getIntervenants()
    for (let i = 1; i < tas.length; i++) {
      expect(tas[i - 1].name.localeCompare(tas[i].name)).toBeLessThanOrEqual(0)
    }
  })
})

describe('deleteIntervenant', () => {
  it('deletes a TA', () => {
    const id = queries.createIntervenant({
      name: 'Delete Me',
      email: 'delete@cesi.fr',
      password: 'Pass1234!',
    })
    const result = queries.deleteIntervenant(Number(id))
    expect(result.changes).toBe(1)
  })

  it('handles negative teacherId (renderer convention)', () => {
    const id = queries.createIntervenant({
      name: 'Negative ID',
      email: 'negative@cesi.fr',
      password: 'Pass1234!',
    })
    const result = queries.deleteIntervenant(-Number(id))
    expect(result.changes).toBe(1)
  })

  it('throws when trying to delete a teacher (non-TA)', () => {
    expect(() => {
      queries.deleteIntervenant(1) // teacher id=1 has role 'teacher'
    }).toThrow('Responsable')
  })

  it('throws for non-existent intervenant', () => {
    expect(() => {
      queries.deleteIntervenant(99999)
    }).toThrow('introuvable')
  })
})

describe('getTeacherProjects / setTeacherProjects', () => {
  let taId

  beforeAll(() => {
    taId = Number(queries.createIntervenant({
      name: 'Project TA',
      email: 'projects@cesi.fr',
      password: 'Pass1234!',
    }))
  })

  it('returns empty array when no projects assigned', () => {
    const projects = queries.getTeacherProjects(taId)
    expect(projects).toEqual([])
  })

  it('assigns projects to a teacher', () => {
    queries.setTeacherProjects({ teacherId: taId, projectIds: [1, 2] })
    const projects = queries.getTeacherProjects(taId)
    expect(projects).toContain(1)
    expect(projects).toContain(2)
  })

  it('replaces projects entirely on second call', () => {
    queries.setTeacherProjects({ teacherId: taId, projectIds: [2] })
    const projects = queries.getTeacherProjects(taId)
    expect(projects).toEqual([2])
  })

  it('clears all projects with empty array', () => {
    queries.setTeacherProjects({ teacherId: taId, projectIds: [] })
    const projects = queries.getTeacherProjects(taId)
    expect(projects).toEqual([])
  })

  it('handles negative teacherId', () => {
    queries.setTeacherProjects({ teacherId: -taId, projectIds: [1] })
    const projects = queries.getTeacherProjects(-taId)
    expect(projects).toContain(1)
  })
})

describe('getTeacherChannels / setTeacherChannels (compat shims)', () => {
  let taId

  beforeAll(() => {
    taId = Number(queries.createIntervenant({
      name: 'Channel TA',
      email: 'channels@cesi.fr',
      password: 'Pass1234!',
    }))
  })

  it('returns empty array when no channels assigned', () => {
    const channels = queries.getTeacherChannels(taId)
    expect(channels).toEqual([])
  })

  it('assigns channels via project lookup', () => {
    queries.setTeacherChannels({ teacherId: taId, channelIds: [1] })
    const channels = queries.getTeacherChannels(taId)
    // Channel 1 is linked to project 1
    expect(channels).toContain(1)
  })

  it('clears channel assignments with empty array', () => {
    queries.setTeacherChannels({ teacherId: taId, channelIds: [] })
    const channels = queries.getTeacherChannels(taId)
    expect(channels).toEqual([])
  })
})
