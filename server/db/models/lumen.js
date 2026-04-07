/** Lumen — Cours en markdown publies par les enseignants pour leurs etudiants. */
const { getDb } = require('../connection');

// ─── Cours ───────────────────────────────────────────────────────────────────

function createLumenCourse({ teacherId, promoId, title, summary = '', content = '' }) {
  const db = getDb();
  const res = db.prepare(
    'INSERT INTO lumen_courses (teacher_id, promo_id, title, summary, content) VALUES (?, ?, ?, ?, ?)'
  ).run(teacherId, promoId, title, summary, content);
  return db.prepare('SELECT * FROM lumen_courses WHERE id = ?').get(res.lastInsertRowid);
}

function getLumenCourse(id) {
  return getDb().prepare('SELECT * FROM lumen_courses WHERE id = ?').get(id) || null;
}

function getLumenCoursesForPromo(promoId, { onlyPublished = false } = {}) {
  const db = getDb();
  if (onlyPublished) {
    return db.prepare(
      `SELECT id, teacher_id, promo_id, title, summary, status, created_at, updated_at, published_at
       FROM lumen_courses
       WHERE promo_id = ? AND status = 'published'
       ORDER BY published_at DESC, updated_at DESC`
    ).all(promoId);
  }
  return db.prepare(
    `SELECT id, teacher_id, promo_id, title, summary, status, created_at, updated_at, published_at
     FROM lumen_courses
     WHERE promo_id = ?
     ORDER BY status ASC, updated_at DESC`
  ).all(promoId);
}

function getLumenCoursesForTeacher(teacherId) {
  return getDb().prepare(
    `SELECT id, teacher_id, promo_id, title, summary, status, created_at, updated_at, published_at
     FROM lumen_courses
     WHERE teacher_id = ?
     ORDER BY updated_at DESC`
  ).all(teacherId);
}

function updateLumenCourse(id, { title, summary, content }) {
  const db = getDb();
  const fields = [];
  const params = [];
  if (title !== undefined)   { fields.push('title = ?');   params.push(title); }
  if (summary !== undefined) { fields.push('summary = ?'); params.push(summary); }
  if (content !== undefined) { fields.push('content = ?'); params.push(content); }
  if (fields.length === 0) return getLumenCourse(id);
  fields.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE lumen_courses SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getLumenCourse(id);
}

function publishLumenCourse(id) {
  const db = getDb();
  db.prepare(
    "UPDATE lumen_courses SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);
  return getLumenCourse(id);
}

function unpublishLumenCourse(id) {
  const db = getDb();
  db.prepare(
    "UPDATE lumen_courses SET status = 'draft', updated_at = datetime('now') WHERE id = ?"
  ).run(id);
  return getLumenCourse(id);
}

function deleteLumenCourse(id) {
  getDb().prepare('DELETE FROM lumen_courses WHERE id = ?').run(id);
}

function getLumenStatsForPromo(promoId) {
  const row = getDb().prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
       SUM(CASE WHEN status = 'draft'     THEN 1 ELSE 0 END) AS drafts
     FROM lumen_courses WHERE promo_id = ?`
  ).get(promoId);
  return {
    total:     row?.total ?? 0,
    published: row?.published ?? 0,
    drafts:    row?.drafts ?? 0,
  };
}

module.exports = {
  createLumenCourse,
  getLumenCourse,
  getLumenCoursesForPromo,
  getLumenCoursesForTeacher,
  updateLumenCourse,
  publishLumenCourse,
  unpublishLumenCourse,
  deleteLumenCourse,
  getLumenStatsForPromo,
};
