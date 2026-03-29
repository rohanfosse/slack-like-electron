const { getDb } = require('../connection')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

/** Génère un mot de passe temporaire aléatoire pour un intervenant. */
function generateTaPassword() {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all    = upper + lower + digits + special;
  const bytes  = crypto.randomBytes(12);
  const mandatory = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    special[bytes[3] % special.length],
  ];
  const rest = Array.from(bytes.subarray(4), b => all[b % all.length]);
  const chars = [...mandatory, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Tous les intervenants (role = 'ta') */
function getIntervenants() {
  return getDb().prepare(
    "SELECT id, name, email, role FROM teachers WHERE role = 'ta' ORDER BY name"
  ).all()
}

/**
 * Crée un intervenant (role = 'ta').
 * Lève une erreur si l'email est déjà utilisé.
 */
function createIntervenant({ name, email, password }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM teachers WHERE LOWER(email) = LOWER(?)').get(email.trim())
  if (existing) throw new Error('Cette adresse email est déjà utilisée.')
  const plain = (password ?? '').trim() || generateTaPassword()
  const hashed = bcrypt.hashSync(plain, 10)
  return db.prepare(
    "INSERT INTO teachers (name, email, password, role) VALUES (?, ?, ?, 'ta')"
  ).run(name.trim(), email.trim().toLowerCase(), hashed).lastInsertRowid
}

/**
 * Supprime un intervenant (ne peut pas supprimer un teacher).
 * teacherId peut être négatif (convention renderer) - Math.abs() appliqué.
 */
function deleteIntervenant(teacherId) {
  const realId = Math.abs(teacherId)
  const t = getDb().prepare("SELECT role FROM teachers WHERE id = ?").get(realId)
  if (!t) throw new Error('Intervenant introuvable.')
  if (t.role === 'teacher') throw new Error('Impossible de supprimer un Responsable Pédagogique.')
  return getDb().prepare('DELETE FROM teachers WHERE id = ?').run(realId)
}

/**
 * Projets assignes a un intervenant - renvoie un tableau d'ids (number[]).
 * Si aucune assignation : tableau vide (l'intervenant voit tous les projets).
 */
function getTeacherProjects(teacherId) {
  return getDb().prepare(
    'SELECT project_id FROM teacher_projects WHERE teacher_id = ?'
  ).all(Math.abs(teacherId)).map(r => r.project_id)
}

/**
 * Remplace entierement les projets d'un intervenant.
 * Wrappe dans une transaction.
 */
function setTeacherProjects({ teacherId, projectIds }) {
  const db     = getDb()
  const realId = Math.abs(teacherId)
  db.transaction(() => {
    db.prepare('DELETE FROM teacher_projects WHERE teacher_id = ?').run(realId)
    const ins = db.prepare(
      'INSERT OR IGNORE INTO teacher_projects (teacher_id, project_id) VALUES (?, ?)'
    )
    for (const pid of (projectIds ?? [])) {
      ins.run(realId, Number(pid))
    }
  })()
}

/**
 * @deprecated Compat shim — renvoie les channel_ids deduits des projets assignes.
 * Utiliser getTeacherProjects() pour le nouveau modele.
 */
function getTeacherChannels(teacherId) {
  return getDb().prepare(
    'SELECT DISTINCT p.channel_id FROM teacher_projects tp JOIN projects p ON tp.project_id = p.id WHERE tp.teacher_id = ? AND p.channel_id IS NOT NULL'
  ).all(Math.abs(teacherId)).map(r => r.channel_id)
}

/**
 * @deprecated Compat shim — convertit les channelIds en projets puis assigne.
 * Utiliser setTeacherProjects() pour le nouveau modele.
 */
function setTeacherChannels({ teacherId, channelIds }) {
  const db     = getDb()
  const realId = Math.abs(teacherId)
  db.transaction(() => {
    db.prepare('DELETE FROM teacher_projects WHERE teacher_id = ?').run(realId)
    const ins = db.prepare(
      'INSERT OR IGNORE INTO teacher_projects (teacher_id, project_id) SELECT ?, id FROM projects WHERE channel_id = ?'
    )
    for (const cid of (channelIds ?? [])) {
      ins.run(realId, Number(cid))
    }
  })()
}

module.exports = {
  getIntervenants, createIntervenant, deleteIntervenant,
  getTeacherChannels, setTeacherChannels,
  getTeacherProjects, setTeacherProjects,
}
