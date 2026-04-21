/**
 * Messages programmes (scheduled_messages) — user-scope.
 *
 * Le worker server/services/schedulerTasks/messages.js relit les lignes
 * `sent = 0 AND send_at <= now()` toutes les 30s. Pas de setTimeout : crash
 * du process = reprise au boot, zero message perdu tant que sent=0.
 *
 * Convention d'identite : author_id est l'id signe du JWT
 *   - students : positif
 *   - teachers : negatif
 * Aligne sur messages.author_id.
 */
const { getDb } = require('../connection');
const { encrypt } = require('../../utils/crypto');
const { safeAuthorType } = require('../../utils/roles');

const MAX_PENDING_PER_USER = 50;
const MAX_CONTENT_LENGTH = 10000;

// SELECT enrichi (nom de canal / destinataire DM) pour l'affichage cote user.
const LIST_SELECT = `
  SELECT sm.*,
         c.name  AS channel_name,
         c.promo_id AS channel_promo_id,
         dm.name AS dm_peer_name
    FROM scheduled_messages sm
    LEFT JOIN channels c  ON c.id  = sm.channel_id
    LEFT JOIN students dm ON dm.id = sm.dm_student_id
`;

/**
 * Compte les messages programmes encore actifs (sent=0, failed_at=NULL)
 * d'un utilisateur. Utilise pour plafonner a MAX_PENDING_PER_USER.
 */
function countActiveScheduledMessages(authorId) {
  const row = getDb().prepare(
    `SELECT COUNT(*) AS n FROM scheduled_messages
      WHERE author_id = ? AND sent = 0 AND failed_at IS NULL`
  ).get(authorId);
  return row?.n ?? 0;
}

/**
 * Cree un message programme user-scope. `content` est chiffre si DM
 * (symetrique a sendMessage pour preserver la confidentialite en DB).
 *
 * @throws Error si le cap MAX_PENDING_PER_USER est atteint.
 */
function createUserScheduledMessage({
  authorId, authorName, authorType,
  channelId = null, dmStudentId = null, dmPeerId = null,
  content, sendAt,
  replyToId = null, replyToAuthor = null, replyToPreview = null,
  attachments = null,
}) {
  if (!content || !content.trim()) throw new Error('Contenu requis.');
  if (content.length > MAX_CONTENT_LENGTH) throw new Error('Message trop long.');
  if (!sendAt) throw new Error('Date d\'envoi requise.');
  if (!channelId && !dmStudentId) throw new Error('channelId ou dmStudentId requis.');
  if (channelId && dmStudentId) throw new Error('channelId et dmStudentId sont exclusifs.');

  const activeCount = countActiveScheduledMessages(authorId);
  if (activeCount >= MAX_PENDING_PER_USER) {
    throw new Error(`Limite de ${MAX_PENDING_PER_USER} messages programmes atteinte. Supprimez-en un avant d'en creer un nouveau.`);
  }

  const storedContent = dmStudentId ? encrypt(content) : content;
  const attachmentsJson = attachments
    ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments))
    : null;

  const res = getDb().prepare(`
    INSERT INTO scheduled_messages
      (channel_id, dm_student_id, dm_peer_id, author_id, author_name, author_type,
       content, reply_to_id, reply_to_author, reply_to_preview, attachments_json, send_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    channelId,
    dmStudentId,
    dmPeerId,
    authorId,
    authorName,
    safeAuthorType(authorType),
    storedContent,
    replyToId,
    replyToAuthor,
    replyToPreview,
    attachmentsJson,
    sendAt,
  );
  return { id: Number(res.lastInsertRowid) };
}

/**
 * Liste les messages programmes d'un user (non envoyes et/ou en erreur).
 * Les sent=1 sont exclus par defaut pour garder la vue utile.
 */
function listUserScheduledMessages(authorId, { includeSent = false } = {}) {
  const where = includeSent ? 'WHERE sm.author_id = ?' : 'WHERE sm.author_id = ? AND sm.sent = 0';
  return getDb().prepare(
    `${LIST_SELECT} ${where} ORDER BY sm.send_at ASC`
  ).all(authorId);
}

/**
 * Met a jour un scheduled message encore en attente (sent = 0).
 * Seul l'owner (author_id = userId) peut modifier.
 */
function updateUserScheduledMessage(authorId, id, { content, sendAt }) {
  const fields = [];
  const vals = [];
  if (content !== undefined) {
    if (!content.trim()) throw new Error('Contenu requis.');
    if (content.length > MAX_CONTENT_LENGTH) throw new Error('Message trop long.');
    // Re-chiffrer uniquement si DM : on lit d'abord la row pour savoir
    const row = getDb().prepare('SELECT dm_student_id FROM scheduled_messages WHERE id = ? AND author_id = ? AND sent = 0').get(id, authorId);
    if (!row) throw new Error('Message programme introuvable ou deja envoye.');
    fields.push('content = ?');
    vals.push(row.dm_student_id ? encrypt(content) : content);
  }
  if (sendAt !== undefined) {
    fields.push('send_at = ?', 'failed_at = NULL', 'error = NULL');
    vals.push(sendAt);
  }
  if (!fields.length) return { updated: 0 };
  vals.push(id, authorId);
  const res = getDb().prepare(
    `UPDATE scheduled_messages SET ${fields.join(', ')}
      WHERE id = ? AND author_id = ? AND sent = 0`
  ).run(...vals);
  return { updated: res.changes };
}

function deleteUserScheduledMessage(authorId, id) {
  const res = getDb().prepare(
    'DELETE FROM scheduled_messages WHERE id = ? AND author_id = ? AND sent = 0'
  ).run(id, authorId);
  return { removed: res.changes };
}

/**
 * Lit toutes les lignes dues (sent=0, send_at <= now, pas failed_at).
 * Retourne toutes les colonnes necessaires au worker pour reconstruire
 * le payload (auteur, destinataire, reply, attachments).
 */
function getDueScheduledMessagesV2() {
  return getDb().prepare(
    `SELECT * FROM scheduled_messages
      WHERE sent = 0
        AND failed_at IS NULL
        AND send_at <= datetime('now')
      LIMIT 100`
  ).all();
}

function markScheduledFailed(id, error) {
  const msg = String(error ?? '').slice(0, 500);
  return getDb().prepare(
    `UPDATE scheduled_messages SET failed_at = datetime('now'), error = ? WHERE id = ?`
  ).run(msg, id);
}

module.exports = {
  MAX_PENDING_PER_USER,
  createUserScheduledMessage,
  listUserScheduledMessages,
  updateUserScheduledMessage,
  deleteUserScheduledMessage,
  countActiveScheduledMessages,
  getDueScheduledMessagesV2,
  markScheduledFailed,
};
