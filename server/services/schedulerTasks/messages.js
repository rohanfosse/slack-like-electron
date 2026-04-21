/**
 * schedulerTasks/messages.js — Envoi des messages programmes (user-scope).
 *
 * Passe par MessageService.create en reconstituant un "user" a partir des
 * colonnes du scheduled_message (author_id signe, author_name, author_type).
 * En cas d'erreur : markScheduledFailed au lieu de juste logger, pour que
 * l'utilisateur voie l'echec dans son panneau et puisse corriger la cause.
 */
const log = require('../../utils/logger')
const { getDueScheduledMessagesV2, markScheduledFailed } = require('../../db/models/scheduled')
const { markScheduledSent } = require('../../db/models/admin')
const { decrypt } = require('../../utils/crypto')
const MessageService = require('../messages')

module.exports = function processScheduledMessages(io, _queries) {
  let due
  try {
    due = getDueScheduledMessagesV2()
  } catch (err) {
    log.error('scheduled_messages_fetch_failed', { error: err.message })
    return
  }
  if (!due.length) return

  for (const sm of due) {
    try {
      const user = {
        id: sm.author_id,
        name: sm.author_name,
        type: sm.author_type,
        promo_id: null,
      }

      // Le DM a ete chiffre en DB pour preserver la confidentialite ; on
      // dechiffre avant de passer au MessageService qui re-chiffrera.
      const content = sm.dm_student_id ? decrypt(sm.content) : sm.content

      const payload = {
        channelId:      sm.channel_id ?? null,
        dmStudentId:    sm.dm_student_id ?? null,
        dmPeerId:       sm.dm_peer_id ?? null,
        content,
        replyToId:      sm.reply_to_id ?? null,
        replyToAuthor:  sm.reply_to_author ?? null,
        replyToPreview: sm.reply_to_preview ?? null,
      }

      const { message, pushPayload } = MessageService.create(payload, user)

      // Broadcast socket (meme logique que routes/messages.js)
      if (io) {
        if (payload.dmStudentId) {
          io.to(`user:${payload.dmStudentId}`).emit('msg:new', pushPayload)
          const peerId = payload.dmPeerId ?? user.id
          if (peerId !== payload.dmStudentId) {
            io.to(`user:${peerId}`).emit('msg:new', pushPayload)
          }
        } else if (payload.channelId) {
          const { getDb } = require('../../db/connection')
          try {
            const ch = getDb().prepare('SELECT promo_id FROM channels WHERE id = ?').get(payload.channelId)
            if (ch?.promo_id) io.to(`promo:${ch.promo_id}`).emit('msg:new', pushPayload)
          } catch { /* broadcast best-effort */ }
        }
      }

      markScheduledSent(sm.id)
      log.info('scheduled_message_sent', {
        id: sm.id, messageId: message.id,
        channelId: sm.channel_id, dmStudentId: sm.dm_student_id,
      })
    } catch (err) {
      markScheduledFailed(sm.id, err.message)
      log.error('scheduled_message_failed', { id: sm.id, error: err.message })
    }
  }
}
