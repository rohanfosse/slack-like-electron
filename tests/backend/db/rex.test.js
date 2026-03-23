/**
 * Tests unitaires pour le modèle REX (Retour d'Expérience).
 */
const { setupTestDb, teardownTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/rex')
})
afterAll(() => teardownTestDb())

describe('createRexSession', () => {
  it('creates a session with a join code', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'REX Test' })
    expect(session).toBeDefined()
    expect(session.id).toBeDefined()
    expect(session.join_code).toBeDefined()
    expect(session.join_code).toHaveLength(6)
    expect(session.title).toBe('REX Test')
    expect(session.teacher_id).toBe(1)
    expect(session.promo_id).toBe(1)
    expect(session.status).toBe('waiting')
  })
})

describe('getRexSession', () => {
  it('returns session with activities array', () => {
    const created = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Session With Activities' })
    const session = queries.getRexSession(created.id)
    expect(session).toBeDefined()
    expect(session.title).toBe('Session With Activities')
    expect(Array.isArray(session.activities)).toBe(true)
    expect(session.activities).toHaveLength(0)
  })

  it('returns null for non-existent session', () => {
    expect(queries.getRexSession(99999)).toBeNull()
  })
})

describe('getRexSessionByCode', () => {
  it('finds session by join code', () => {
    const created = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Code Lookup' })
    const found = queries.getRexSessionByCode(created.join_code)
    expect(found).toBeDefined()
    expect(found.id).toBe(created.id)
    expect(found.title).toBe('Code Lookup')
  })

  it('returns null for non-existent code', () => {
    expect(queries.getRexSessionByCode('ZZZZZZ')).toBeNull()
  })
})

describe('getActiveRexSession', () => {
  it('returns only active (not waiting) session for a promo', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Active REX' })
    // waiting sessions must NOT be visible to students (draft mode)
    expect(queries.getActiveRexSession(1)).toBeNull()
    queries.updateRexSessionStatus(session.id, 'active')
    const active = queries.getActiveRexSession(1)
    expect(active).not.toBeNull()
    expect(active.status).toBe('active')
  })

  it('returns null for promo with no active sessions', () => {
    expect(queries.getActiveRexSession(9999)).toBeNull()
  })
})

describe('updateRexSessionStatus', () => {
  it('transitions waiting → active', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Status Test' })
    expect(session.status).toBe('waiting')
    const updated = queries.updateRexSessionStatus(session.id, 'active')
    expect(updated.status).toBe('active')
  })

  it('transitions active → ended and sets ended_at', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'End Test' })
    queries.updateRexSessionStatus(session.id, 'active')
    const ended = queries.updateRexSessionStatus(session.id, 'ended')
    expect(ended.status).toBe('ended')
    expect(ended.ended_at).toBeDefined()
  })
})

describe('addRexActivity', () => {
  it('adds a sondage_libre activity', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Activity Session' })
    const activity = queries.addRexActivity({
      sessionId: session.id,
      type: 'sondage_libre',
      title: 'Comment vous sentez-vous ?',
      position: 0,
    })
    expect(activity).toBeDefined()
    expect(activity.session_id).toBe(session.id)
    expect(activity.type).toBe('sondage_libre')
    expect(activity.title).toBe('Comment vous sentez-vous ?')
    expect(activity.status).toBe('pending')
  })

  it('activity appears in getRexSession activities', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Activity List' })
    queries.addRexActivity({ sessionId: session.id, type: 'nuage', title: 'Mots clés', position: 0 })
    queries.addRexActivity({ sessionId: session.id, type: 'echelle', title: 'Satisfaction', position: 1 })
    const full = queries.getRexSession(session.id)
    expect(full.activities).toHaveLength(2)
    expect(full.activities[0].title).toBe('Mots clés')
    expect(full.activities[1].title).toBe('Satisfaction')
  })
})

describe('setRexActivityStatus', () => {
  it('transitions pending → live and sets started_at', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Status Activity' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'echelle', title: 'Q', position: 0 })
    const live = queries.setRexActivityStatus(activity.id, 'live')
    expect(live.status).toBe('live')
    expect(live.started_at).toBeDefined()
  })

  it('transitions live → closed and sets closed_at', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Close Activity' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'nuage', title: 'Q', position: 0 })
    queries.setRexActivityStatus(activity.id, 'live')
    const closed = queries.setRexActivityStatus(activity.id, 'closed')
    expect(closed.status).toBe('closed')
    expect(closed.closed_at).toBeDefined()
  })
})

describe('submitRexResponse', () => {
  it('stores a response anonymously', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Response Session' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'question_ouverte', title: 'Q', position: 0 })
    const response = queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'Très bien' })
    expect(response).toBeDefined()
    expect(response.activity_id).toBe(activity.id)
    expect(response.answer).toBe('Très bien')
    // student_id must NOT be exposed
    expect(response.student_id).toBeUndefined()
  })

  it('handles duplicate (ON CONFLICT) — updates answer', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Dup Response' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'question_ouverte', title: 'Q', position: 0 })
    queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'Première réponse' })
    const updated = queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'Réponse corrigée' })
    expect(updated.answer).toBe('Réponse corrigée')
  })
})

describe('getRexActivityResultsAggregated', () => {
  it('returns counts for sondage_libre', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Sondage Results' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'sondage_libre', title: 'Poll', position: 0 })
    queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'Oui' })
    queries.submitRexResponse({ activityId: activity.id, studentId: 2, answer: 'Non' })
    const results = queries.getRexActivityResultsAggregated(activity.id)
    expect(results.type).toBe('sondage_libre')
    expect(results.total).toBe(2)
    expect(Array.isArray(results.counts)).toBe(true)
  })

  it('returns freq for nuage', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Nuage Results' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'nuage', title: 'Words', position: 0 })
    queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'innovation' })
    queries.submitRexResponse({ activityId: activity.id, studentId: 2, answer: 'innovation' })
    const results = queries.getRexActivityResultsAggregated(activity.id)
    expect(results.type).toBe('nuage')
    expect(results.total).toBe(2)
    expect(results.freq[0].word).toBe('innovation')
    expect(results.freq[0].count).toBe(2)
  })

  it('returns average for echelle', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Echelle Results' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'echelle', title: 'Rating', position: 0 })
    queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: '4' })
    queries.submitRexResponse({ activityId: activity.id, studentId: 2, answer: '2' })
    const results = queries.getRexActivityResultsAggregated(activity.id)
    expect(results.type).toBe('echelle')
    expect(results.total).toBe(2)
    expect(results.average).toBe(3)
  })

  it('returns answers for question_ouverte', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'QO Results' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'question_ouverte', title: 'Feedback', position: 0 })
    queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'Super formation' })
    const results = queries.getRexActivityResultsAggregated(activity.id)
    expect(results.type).toBe('question_ouverte')
    expect(results.total).toBe(1)
    expect(results.answers[0].answer).toBe('Super formation')
    expect(results.answers[0].student_id).toBeUndefined()
  })

  it('returns null for non-existent activity', () => {
    expect(queries.getRexActivityResultsAggregated(99999)).toBeNull()
  })
})

describe('deleteRexSession', () => {
  it('deletes session and cascades activities and responses', () => {
    const session = queries.createRexSession({ teacherId: 1, promoId: 1, title: 'Delete Me' })
    const activity = queries.addRexActivity({ sessionId: session.id, type: 'question_ouverte', title: 'Q', position: 0 })
    queries.submitRexResponse({ activityId: activity.id, studentId: 1, answer: 'Réponse' })
    queries.deleteRexSession(session.id)
    expect(queries.getRexSession(session.id)).toBeNull()
    expect(queries.getRexActivityResultsAggregated(activity.id)).toBeNull()
  })
})
