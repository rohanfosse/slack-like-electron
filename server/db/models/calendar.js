/**
 * Modele DB Calendar — feed tokens iCal (abonnement externe).
 *
 * Le token est opaque et remplace le JWT sur la route publique
 * /ical/:token.ics. Un attaquant qui le connait peut lire le calendrier
 * mais ne peut rien ecrire ; le prof peut revoquer a tout moment.
 */
const { getDb }      = require('../connection')
const { secureToken } = require('../../utils/secureToken')

function getCalendarFeedToken(userType, userId) {
  return getDb().prepare(`
    SELECT user_type, user_id, token, created_at
      FROM calendar_feed_tokens
     WHERE user_type = ? AND user_id = ?
  `).get(userType, userId) ?? null
}

/** La rotation invalide immediatement toutes les URLs precedemment publiees. */
function rotateCalendarFeedToken(userType, userId) {
  const token = secureToken()
  const row = getDb().prepare(`
    INSERT INTO calendar_feed_tokens (user_type, user_id, token, created_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_type, user_id) DO UPDATE SET
      token      = excluded.token,
      created_at = datetime('now')
    RETURNING token, created_at
  `).get(userType, userId, token)
  return row
}

function deleteCalendarFeedToken(userType, userId) {
  getDb().prepare('DELETE FROM calendar_feed_tokens WHERE user_type = ? AND user_id = ?')
    .run(userType, userId)
}

/**
 * Utilise la VIEW `users` (v70) qui unifie teachers + students pour retourner
 * name + email, necessaires a collectEvents() et a la meta iCal.
 */
function findUserByCalendarFeedToken(token) {
  if (!token || typeof token !== 'string') return null
  const row = getDb().prepare(`
    SELECT cft.user_type AS type, cft.user_id AS id, u.name, u.email
      FROM calendar_feed_tokens cft
      JOIN users u ON u.role = cft.user_type AND u.id = cft.user_id
     WHERE cft.token = ?
  `).get(token) ?? null
  return row
}

module.exports = {
  getCalendarFeedToken,
  rotateCalendarFeedToken,
  deleteCalendarFeedToken,
  findUserByCalendarFeedToken,
}
