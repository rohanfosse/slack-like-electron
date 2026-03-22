/** Modèle Live Quiz — sessions interactives en direct (QCM, sondages, nuages de mots) */
const { getDb } = require('../connection');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Génère un code aléatoire de 6 caractères alphanumériques majuscules. */
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I/O/0/1 pour éviter confusion
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

function createSession({ teacherId, promoId, title }) {
  const db = getDb();
  // Générer un code unique (retry si collision)
  let code;
  for (let i = 0; i < 10; i++) {
    code = generateJoinCode();
    const exists = db.prepare('SELECT 1 FROM live_sessions WHERE join_code = ?').get(code);
    if (!exists) break;
  }
  const res = db.prepare(
    'INSERT INTO live_sessions (teacher_id, promo_id, title, join_code) VALUES (?, ?, ?, ?)'
  ).run(teacherId, promoId, title, code);
  return db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(res.lastInsertRowid);
}

function getSession(id) {
  const db = getDb();
  const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
  if (!session) return null;
  const activities = db.prepare(
    'SELECT * FROM live_activities WHERE session_id = ? ORDER BY position ASC'
  ).all(id);
  return { ...session, activities };
}

function getSessionByCode(code) {
  return getDb().prepare('SELECT * FROM live_sessions WHERE join_code = ?').get(code) || null;
}

function getActiveSessionForPromo(promoId) {
  return getDb().prepare(
    "SELECT * FROM live_sessions WHERE promo_id = ? AND status IN ('waiting','active') LIMIT 1"
  ).get(promoId) || null;
}

function updateSessionStatus(id, status) {
  const db = getDb();
  if (status === 'ended') {
    db.prepare("UPDATE live_sessions SET status = ?, ended_at = datetime('now') WHERE id = ?").run(status, id);
  } else {
    db.prepare('UPDATE live_sessions SET status = ? WHERE id = ?').run(status, id);
  }
  return db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
}

function deleteSession(id) {
  return getDb().prepare('DELETE FROM live_sessions WHERE id = ?').run(id);
}

// ─── Activities ──────────────────────────────────────────────────────────────

function addActivity({ sessionId, type, title, options, multi, maxWords, position }) {
  const db = getDb();
  const res = db.prepare(
    'INSERT INTO live_activities (session_id, type, title, options, multi, max_words, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(sessionId, type, title, options ?? null, multi ?? 0, maxWords ?? 3, position ?? 0);
  return db.prepare('SELECT * FROM live_activities WHERE id = ?').get(res.lastInsertRowid);
}

function updateActivity(id, fields) {
  const db = getDb();
  const allowed = ['title', 'type', 'options', 'multi', 'max_words', 'position'];
  const sets = [];
  const vals = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      // Convertir camelCase → snake_case pour max_words
      const col = key === 'maxWords' ? 'max_words' : key;
      sets.push(`${col} = ?`);
      vals.push(fields[key]);
    }
  }
  // Also handle camelCase maxWords
  if (fields.maxWords !== undefined && !fields.max_words) {
    sets.push('max_words = ?');
    vals.push(fields.maxWords);
  }
  if (sets.length === 0) return db.prepare('SELECT * FROM live_activities WHERE id = ?').get(id);
  vals.push(id);
  db.prepare(`UPDATE live_activities SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return db.prepare('SELECT * FROM live_activities WHERE id = ?').get(id);
}

function deleteActivity(id) {
  return getDb().prepare('DELETE FROM live_activities WHERE id = ?').run(id);
}

function setActivityStatus(id, status) {
  const db = getDb();
  if (status === 'live') {
    db.prepare("UPDATE live_activities SET status = ?, started_at = datetime('now') WHERE id = ?").run(status, id);
  } else if (status === 'closed') {
    db.prepare("UPDATE live_activities SET status = ?, closed_at = datetime('now') WHERE id = ?").run(status, id);
  } else {
    db.prepare('UPDATE live_activities SET status = ? WHERE id = ?').run(status, id);
  }
  return db.prepare('SELECT * FROM live_activities WHERE id = ?').get(id);
}

// ─── Responses ───────────────────────────────────────────────────────────────

function submitResponse({ activityId, studentId, answer }) {
  const db = getDb();
  db.prepare(
    'INSERT INTO live_responses (activity_id, student_id, answer) VALUES (?, ?, ?) ON CONFLICT(activity_id, student_id) DO UPDATE SET answer = excluded.answer, created_at = datetime(\'now\')'
  ).run(activityId, studentId, answer);
  return db.prepare(
    'SELECT * FROM live_responses WHERE activity_id = ? AND student_id = ?'
  ).get(activityId, studentId);
}

function getActivityResults(activityId) {
  return getDb().prepare(
    'SELECT * FROM live_responses WHERE activity_id = ? ORDER BY created_at ASC'
  ).all(activityId);
}

function getActivityResultsAggregated(activityId) {
  const db = getDb();
  const activity = db.prepare('SELECT * FROM live_activities WHERE id = ?').get(activityId);
  if (!activity) return null;

  const responses = db.prepare(
    'SELECT * FROM live_responses WHERE activity_id = ?'
  ).all(activityId);

  const total = responses.length;

  if (activity.type === 'qcm') {
    // Compter par option (index ou texte)
    const counts = {};
    for (const r of responses) {
      const key = r.answer;
      counts[key] = (counts[key] || 0) + 1;
    }
    return { type: 'qcm', total, counts };
  }

  if (activity.type === 'sondage') {
    // Grouper par texte de réponse
    const counts = {};
    for (const r of responses) {
      const key = r.answer;
      counts[key] = (counts[key] || 0) + 1;
    }
    return { type: 'sondage', total, counts };
  }

  if (activity.type === 'nuage') {
    // Fréquence de mots (chaque réponse peut contenir plusieurs mots séparés par des virgules)
    const freq = {};
    for (const r of responses) {
      const words = r.answer.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
      for (const w of words) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }
    return { type: 'nuage', total, freq };
  }

  return { type: activity.type, total, raw: responses };
}

function hasStudentResponded(activityId, studentId) {
  const row = getDb().prepare(
    'SELECT 1 FROM live_responses WHERE activity_id = ? AND student_id = ?'
  ).get(activityId, studentId);
  return !!row;
}

module.exports = {
  createSession,
  getSession,
  getSessionByCode,
  getActiveSessionForPromo,
  updateSessionStatus,
  deleteSession,
  addActivity,
  updateActivity,
  deleteActivity,
  setActivityStatus,
  submitResponse,
  getActivityResults,
  getActivityResultsAggregated,
  hasStudentResponded,
};
