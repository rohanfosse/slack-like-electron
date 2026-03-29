/**
 * Tests unitaires pour le modele rubrics (grilles d'evaluation).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/rubrics')

  const db = getTestDb()
  // Seed: travaux for rubric tests
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published)
    VALUES (30, 1, 1, 'Travail Rubric', '2099-12-31T23:59:00Z', 'livrable', 1)
  `)
  db.exec(`
    INSERT OR IGNORE INTO travaux (id, promo_id, channel_id, title, deadline, type, published)
    VALUES (31, 1, 1, 'Travail Rubric 2', '2099-12-31T23:59:00Z', 'livrable', 1)
  `)
  // Seed: depot for score tests
  db.exec(`
    INSERT OR IGNORE INTO depots (id, travail_id, student_id, file_name, file_path)
    VALUES (30, 30, 1, 'depot.pdf', '/tmp/depot.pdf')
  `)
})

afterAll(() => teardownTestDb())

describe('upsertRubric', () => {
  it('creates a rubric with criteria', () => {
    const rubricId = queries.upsertRubric({
      travailId: 30,
      title: 'Grille TP Web',
      criteria: [
        { label: 'HTML valide', max_pts: 5, weight: 1.0 },
        { label: 'CSS responsive', max_pts: 5, weight: 1.5 },
        { label: 'JS fonctionnel', max_pts: 10, weight: 2.0 },
      ],
    })
    expect(Number(rubricId)).toBeGreaterThan(0)
  })

  it('uses default title when not provided', () => {
    const rubricId = queries.upsertRubric({
      travailId: 31,
      criteria: [{ label: 'Critere 1' }],
    })
    const rubric = queries.getRubric(31)
    expect(rubric.title).toBe("Grille d'évaluation")
  })

  it('updates existing rubric and replaces criteria', () => {
    const rubricId = queries.upsertRubric({
      travailId: 30,
      title: 'Grille Mise a Jour',
      criteria: [
        { label: 'Nouveau Critere', max_pts: 8, weight: 1.0 },
      ],
    })
    const rubric = queries.getRubric(30)
    expect(rubric.title).toBe('Grille Mise a Jour')
    expect(rubric.criteria.length).toBe(1)
    expect(rubric.criteria[0].label).toBe('Nouveau Critere')
  })

  it('defaults max_pts to 4 and weight to 1.0', () => {
    queries.upsertRubric({
      travailId: 30,
      criteria: [{ label: 'Default Values' }],
    })
    const rubric = queries.getRubric(30)
    expect(rubric.criteria[0].max_pts).toBe(4)
    expect(rubric.criteria[0].weight).toBe(1.0)
  })

  it('handles empty criteria array', () => {
    queries.upsertRubric({
      travailId: 30,
      title: 'Empty Rubric',
      criteria: [],
    })
    const rubric = queries.getRubric(30)
    expect(rubric.criteria).toEqual([])
  })
})

describe('getRubric', () => {
  it('returns rubric with criteria for existing travail', () => {
    queries.upsertRubric({
      travailId: 30,
      title: 'Test Get',
      criteria: [
        { label: 'A', max_pts: 5, weight: 1 },
        { label: 'B', max_pts: 3, weight: 2 },
      ],
    })
    const rubric = queries.getRubric(30)
    expect(rubric).toBeDefined()
    expect(rubric.travail_id).toBe(30)
    expect(rubric.title).toBe('Test Get')
    expect(rubric.criteria.length).toBe(2)
    expect(rubric.criteria[0]).toHaveProperty('label')
    expect(rubric.criteria[0]).toHaveProperty('max_pts')
    expect(rubric.criteria[0]).toHaveProperty('weight')
    expect(rubric.criteria[0]).toHaveProperty('position')
  })

  it('returns criteria sorted by position', () => {
    const rubric = queries.getRubric(30)
    for (let i = 1; i < rubric.criteria.length; i++) {
      expect(rubric.criteria[i].position).toBeGreaterThanOrEqual(rubric.criteria[i - 1].position)
    }
  })

  it('returns null for travail without rubric', () => {
    const rubric = queries.getRubric(9999)
    expect(rubric).toBeNull()
  })
})

describe('deleteRubric', () => {
  it('deletes a rubric by travail_id', () => {
    queries.upsertRubric({
      travailId: 31,
      criteria: [{ label: 'To Delete' }],
    })
    const result = queries.deleteRubric(31)
    expect(result.changes).toBe(1)
    expect(queries.getRubric(31)).toBeNull()
  })

  it('returns changes=0 for non-existent rubric', () => {
    const result = queries.deleteRubric(9999)
    expect(result.changes).toBe(0)
  })
})

describe('setDepotScores / getDepotScores', () => {
  let criterionIds

  beforeAll(() => {
    queries.upsertRubric({
      travailId: 30,
      title: 'Scoring Rubric',
      criteria: [
        { label: 'Critere A', max_pts: 5, weight: 1 },
        { label: 'Critere B', max_pts: 10, weight: 2 },
      ],
    })
    const rubric = queries.getRubric(30)
    criterionIds = rubric.criteria.map(c => c.id)
  })

  it('sets scores for a depot', () => {
    queries.setDepotScores({
      depotId: 30,
      scores: [
        { criterion_id: criterionIds[0], points: 4 },
        { criterion_id: criterionIds[1], points: 8 },
      ],
    })
    const scores = queries.getDepotScores(30)
    expect(scores.length).toBe(2)
  })

  it('scores include criterion metadata', () => {
    const scores = queries.getDepotScores(30)
    for (const s of scores) {
      expect(s).toHaveProperty('label')
      expect(s).toHaveProperty('max_pts')
      expect(s).toHaveProperty('weight')
      expect(s).toHaveProperty('position')
      expect(s).toHaveProperty('points')
    }
  })

  it('upserts scores on conflict', () => {
    queries.setDepotScores({
      depotId: 30,
      scores: [
        { criterion_id: criterionIds[0], points: 2 },
      ],
    })
    const scores = queries.getDepotScores(30)
    const scoreA = scores.find(s => s.criterion_id === criterionIds[0])
    expect(scoreA.points).toBe(2)
  })

  it('returns empty array for depot with no scores', () => {
    const scores = queries.getDepotScores(99999)
    expect(scores).toEqual([])
  })

  it('scores are sorted by position', () => {
    const scores = queries.getDepotScores(30)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i].position).toBeGreaterThanOrEqual(scores[i - 1].position)
    }
  })
})
