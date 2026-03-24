/** Carnet de suivi — notes privees du professeur sur les etudiants. */
const { getDb } = require('../connection');

function getNotesByStudent(studentId, teacherId) {
  return getDb().prepare(`
    SELECT tn.*, s.name AS student_name
    FROM teacher_notes tn
    JOIN students s ON s.id = tn.student_id
    WHERE tn.student_id = ? AND tn.teacher_id = ?
    ORDER BY tn.created_at DESC
  `).all(studentId, teacherId);
}

function getNotesByPromo(promoId, teacherId) {
  return getDb().prepare(`
    SELECT tn.*, s.name AS student_name
    FROM teacher_notes tn
    JOIN students s ON s.id = tn.student_id
    WHERE tn.promo_id = ? AND tn.teacher_id = ?
    ORDER BY tn.created_at DESC
  `).all(promoId, teacherId);
}

function getNotesCountByStudent(promoId, teacherId) {
  return getDb().prepare(`
    SELECT tn.student_id, COUNT(*) as count,
           MAX(tn.created_at) as last_note_at,
           s.name AS student_name
    FROM teacher_notes tn
    JOIN students s ON s.id = tn.student_id
    WHERE tn.promo_id = ? AND tn.teacher_id = ?
    GROUP BY tn.student_id
    ORDER BY s.name ASC
  `).all(promoId, teacherId);
}

function createNote({ teacherId, studentId, promoId, content, tag, category }) {
  const db = getDb();
  const res = db.prepare(
    'INSERT INTO teacher_notes (teacher_id, student_id, promo_id, content, tag, category) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(teacherId, studentId, promoId, content, tag ?? 'observation', category ?? 'generale');
  return db.prepare(
    'SELECT tn.*, s.name AS student_name FROM teacher_notes tn JOIN students s ON s.id = tn.student_id WHERE tn.id = ?'
  ).get(res.lastInsertRowid);
}

function updateNote(id, { content, tag, category }) {
  const db = getDb();
  db.prepare(
    "UPDATE teacher_notes SET content = ?, tag = ?, category = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(content, tag, category ?? 'generale', id);
  return db.prepare(
    'SELECT tn.*, s.name AS student_name FROM teacher_notes tn JOIN students s ON s.id = tn.student_id WHERE tn.id = ?'
  ).get(id);
}

function deleteNote(id) {
  return getDb().prepare('DELETE FROM teacher_notes WHERE id = ?').run(id);
}

module.exports = {
  getNotesByStudent,
  getNotesByPromo,
  getNotesCountByStudent,
  createNote,
  updateNote,
  deleteNote,
};
