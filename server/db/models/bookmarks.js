/**
 * Signets de messages cote serveur (remplace le localStorage cote client).
 *
 * Convention d'identite : user_id est l'id signe du JWT
 *   - students : positif (ex. 42)
 *   - teachers : negatif (ex. -3)
 * Cela evite un PK composite user_id+user_type et aligne avec messages.author_id.
 */
const { getDb } = require('../connection');
const { decryptRows } = require('../../utils/crypto');

const PAGE_SIZE = 50;
const MAX_NOTE_LENGTH = 500;

const BOOKMARK_SELECT = `
  SELECT
    b.id               AS bookmark_id,
    b.note             AS bookmark_note,
    b.created_at       AS bookmarked_at,
    m.id               AS id,
    m.channel_id,
    m.dm_student_id,
    m.author_id,
    m.author_name,
    m.author_type,
    m.content,
    m.created_at,
    m.edited,
    m.pinned           AS is_pinned,
    m.reply_to_author,
    m.reply_to_preview,
    c.name             AS channel_name,
    dm.name            AS dm_peer_name,
    COALESCE(s.avatar_initials, COALESCE(substr(upper(t.name), 1, 2), substr(upper(m.author_name), 1, 2))) AS author_initials,
    COALESCE(s.photo_data, t.photo_data) AS author_photo
  FROM bookmarks b
  JOIN messages m ON m.id = b.message_id
  LEFT JOIN channels c  ON c.id = m.channel_id
  LEFT JOIN students dm ON dm.id = m.dm_student_id
  LEFT JOIN students s  ON s.id = m.author_id AND m.author_type = 'student'
  LEFT JOIN teachers t  ON t.id = -m.author_id AND m.author_type = 'teacher'
  WHERE b.user_id = ? AND m.deleted_at IS NULL
`;

function addBookmark({ userId, userType, messageId, note = null }) {
  const db = getDb();
  const trimmedNote = note ? String(note).slice(0, MAX_NOTE_LENGTH) : null;
  db.prepare(
    `INSERT INTO bookmarks (user_id, user_type, message_id, note)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, message_id) DO UPDATE SET note = excluded.note`
  ).run(userId, userType, messageId, trimmedNote);
  return { messageId, note: trimmedNote };
}

function removeBookmark({ userId, messageId }) {
  const res = getDb().prepare(
    'DELETE FROM bookmarks WHERE user_id = ? AND message_id = ?'
  ).run(userId, messageId);
  return { removed: res.changes };
}

function listBookmarks({ userId, beforeId = null, limit = PAGE_SIZE }) {
  const safeLimit = Math.min(Math.max(Number(limit) || PAGE_SIZE, 1), 200);
  const params = [userId];
  let sql = BOOKMARK_SELECT;
  if (beforeId) { sql += ' AND b.id < ?'; params.push(Number(beforeId)); }
  sql += ' ORDER BY b.id DESC LIMIT ?';
  params.push(safeLimit);
  const rows = getDb().prepare(sql).all(...params);
  return decryptRows(rows);
}

function listBookmarkIds(userId) {
  const rows = getDb().prepare(
    `SELECT b.message_id AS id
       FROM bookmarks b
       JOIN messages m ON m.id = b.message_id
      WHERE b.user_id = ? AND m.deleted_at IS NULL`
  ).all(userId);
  return rows.map(r => r.id);
}

function countBookmarks(userId) {
  const row = getDb().prepare(
    `SELECT COUNT(*) AS n
       FROM bookmarks b
       JOIN messages m ON m.id = b.message_id
      WHERE b.user_id = ? AND m.deleted_at IS NULL`
  ).get(userId);
  return row?.n ?? 0;
}

/**
 * Import en masse (migration localStorage -> serveur).
 * Retourne le nombre de bookmarks reellement inseres (conflits ignores,
 * messages inexistants ou soft-deletes ignores).
 */
function importBookmarks({ userId, userType, messageIds }) {
  const db = getDb();
  const ids = Array.isArray(messageIds)
    ? messageIds.map(Number).filter(n => Number.isInteger(n) && n > 0)
    : [];
  if (!ids.length) return { inserted: 0 };
  const existing = db.prepare(
    `SELECT id FROM messages WHERE id IN (${ids.map(() => '?').join(',')}) AND deleted_at IS NULL`
  ).all(...ids).map(r => r.id);
  if (!existing.length) return { inserted: 0 };
  const insert = db.prepare(
    `INSERT OR IGNORE INTO bookmarks (user_id, user_type, message_id) VALUES (?, ?, ?)`
  );
  let inserted = 0;
  db.transaction(() => {
    for (const mid of existing) {
      const r = insert.run(userId, userType, mid);
      inserted += r.changes;
    }
  })();
  return { inserted };
}

module.exports = {
  addBookmark,
  removeBookmark,
  listBookmarks,
  listBookmarkIds,
  countBookmarks,
  importBookmarks,
};
