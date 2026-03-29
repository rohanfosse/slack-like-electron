/**
 * Tests unitaires pour le modele teacherNotes (carnet de suivi enseignant).
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/teacherNotes')
})

afterAll(() => teardownTestDb())

describe('createNote', () => {
  it('creates a note and returns it with student_name', () => {
    const note = queries.createNote({
      teacherId: 1,
      studentId: 1,
      promoId: 1,
      content: 'Progresse bien en algorithmique',
      tag: 'progression',
      category: 'technique',
    })
    expect(note).toBeDefined()
    expect(note.content).toBe('Progresse bien en algorithmique')
    expect(note.tag).toBe('progression')
    expect(note.category).toBe('technique')
    expect(note.student_name).toBe('Jean Dupont')
    expect(note.teacher_id).toBe(1)
    expect(note.student_id).toBe(1)
  })

  it('defaults tag to observation and category to generale', () => {
    const note = queries.createNote({
      teacherId: 1,
      studentId: 1,
      promoId: 1,
      content: 'Note sans tag ni categorie',
    })
    expect(note.tag).toBe('observation')
    expect(note.category).toBe('generale')
  })

  it('creates notes with different tags', () => {
    const tags = ['progression', 'objectif', 'observation', 'alerte', 'autre']
    for (const tag of tags) {
      const note = queries.createNote({
        teacherId: 1,
        studentId: 1,
        promoId: 1,
        content: `Note tag ${tag}`,
        tag,
      })
      expect(note.tag).toBe(tag)
    }
  })
})

describe('getNotesByStudent', () => {
  it('returns notes for a specific student and teacher', () => {
    const notes = queries.getNotesByStudent(1, 1)
    expect(Array.isArray(notes)).toBe(true)
    expect(notes.length).toBeGreaterThan(0)
    for (const n of notes) {
      expect(n.student_id).toBe(1)
      expect(n.teacher_id).toBe(1)
      expect(n).toHaveProperty('student_name')
    }
  })

  it('returns notes ordered by created_at DESC', () => {
    const notes = queries.getNotesByStudent(1, 1)
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i - 1].created_at >= notes[i].created_at).toBe(true)
    }
  })

  it('returns empty array for non-existent student', () => {
    const notes = queries.getNotesByStudent(9999, 1)
    expect(notes).toEqual([])
  })
})

describe('getNotesByPromo', () => {
  it('returns all notes for a promo by a teacher', () => {
    const notes = queries.getNotesByPromo(1, 1)
    expect(Array.isArray(notes)).toBe(true)
    expect(notes.length).toBeGreaterThan(0)
    for (const n of notes) {
      expect(n.promo_id).toBe(1)
      expect(n.teacher_id).toBe(1)
    }
  })

  it('returns empty array for non-existent promo', () => {
    const notes = queries.getNotesByPromo(9999, 1)
    expect(notes).toEqual([])
  })
})

describe('getNotesCountByStudent', () => {
  it('returns note counts grouped by student', () => {
    const counts = queries.getNotesCountByStudent(1, 1)
    expect(Array.isArray(counts)).toBe(true)
    expect(counts.length).toBeGreaterThan(0)
    const entry = counts[0]
    expect(entry).toHaveProperty('student_id')
    expect(entry).toHaveProperty('count')
    expect(entry).toHaveProperty('last_note_at')
    expect(entry).toHaveProperty('student_name')
    expect(entry.count).toBeGreaterThan(0)
  })

  it('returns empty array for a teacher with no notes in promo', () => {
    const db = getTestDb()
    // Teacher id=2 (the TA) has no notes
    const counts = queries.getNotesCountByStudent(1, 2)
    expect(counts).toEqual([])
  })
})

describe('updateNote', () => {
  let noteId

  beforeAll(() => {
    const note = queries.createNote({
      teacherId: 1,
      studentId: 1,
      promoId: 1,
      content: 'Original content',
      tag: 'observation',
      category: 'generale',
    })
    noteId = note.id
  })

  it('updates content, tag, and category', () => {
    const updated = queries.updateNote(noteId, {
      content: 'Updated content',
      tag: 'alerte',
      category: 'comportement',
    })
    expect(updated.content).toBe('Updated content')
    expect(updated.tag).toBe('alerte')
    expect(updated.category).toBe('comportement')
  })

  it('sets updated_at to current time', () => {
    const before = queries.updateNote(noteId, {
      content: 'Time check',
      tag: 'autre',
    })
    expect(before.updated_at).toBeDefined()
  })

  it('defaults category to generale when not provided', () => {
    const updated = queries.updateNote(noteId, {
      content: 'No category',
      tag: 'observation',
    })
    expect(updated.category).toBe('generale')
  })
})

describe('deleteNote', () => {
  it('deletes a note', () => {
    const note = queries.createNote({
      teacherId: 1,
      studentId: 1,
      promoId: 1,
      content: 'To delete',
    })
    const result = queries.deleteNote(note.id)
    expect(result.changes).toBe(1)

    // Verify deletion
    const notes = queries.getNotesByStudent(1, 1)
    const found = notes.find(n => n.id === note.id)
    expect(found).toBeUndefined()
  })

  it('returns changes=0 for non-existent note', () => {
    const result = queries.deleteNote(99999)
    expect(result.changes).toBe(0)
  })
})
