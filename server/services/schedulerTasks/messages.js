/**
 * schedulerTasks/messages.js — Envoi des messages programmes.
 */
const log = require('../../utils/logger')
const { getDueScheduledMessages, markScheduledSent } = require('../../db/models/admin')

module.exports = function processScheduledMessages(io, queries) {
  try {
    const due = getDueScheduledMessages()
    if (!due.length) return

    const teachers = queries.getTeachers?.() ?? []
    const channels = queries.getChannels?.(null) ?? []

    for (const sm of due) {
      try {
        const teacher = teachers.find(t => t.name === sm.author_name)
        const authorId = teacher ? -(teacher.id) : null

        queries.sendMessage({
          channelId: sm.channel_id, authorName: sm.author_name,
          authorId, authorType: sm.author_type, content: sm.content,
        })
        markScheduledSent(sm.id)

        const ch = channels.find(c => c.id === sm.channel_id)
        if (ch) {
          io.to(`promo:${ch.promo_id}`).emit('msg:new', {
            channelId: sm.channel_id, authorName: sm.author_name,
            promoId: ch.promo_id,
            preview: sm.content.replace(/[*_`>#[\]!]/g, '').slice(0, 80),
          })
        }
        log.info('scheduled_message_sent', { id: sm.id, channelId: sm.channel_id })
      } catch (err) {
        log.error('scheduled_message_failed', { id: sm.id, error: err.message })
      }
    }
  } catch (err) {
    log.error('scheduled_messages_failed', { error: err.message })
  }
}
