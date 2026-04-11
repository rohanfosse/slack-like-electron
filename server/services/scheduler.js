/**
 * Scheduler : envoi des annonces planifiees et publication programmee (toutes les 30s).
 */
const log = require('../utils/logger')
const { getDueScheduledMessages, markScheduledSent } = require('../db/models/admin')
const { getDueScheduledDevoirs, publishScheduledDevoir } = require('../db/models/assignments')

module.exports = function startScheduler(io, queries) {
  return setInterval(() => {
    // ── Messages programmes ──────────────────────────────────────────
    try {
      const due = getDueScheduledMessages()
      if (!due.length) { /* skip */ }
      else {
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
      }
    } catch (err) {
      log.error('scheduled_messages_failed', { error: err.message })
    }

    // ── Publication programmee des devoirs ────────────────────────────
    try {
      const dueDevoirs = getDueScheduledDevoirs()
      for (const devoir of dueDevoirs) {
        try {
          publishScheduledDevoir(devoir.id)

          if (devoir.promo_id) {
            io.to(`promo:${devoir.promo_id}`).emit('assignment:new', {
              title: devoir.title,
              category: devoir.category || null,
              deadline: devoir.deadline || null,
              promoId: devoir.promo_id,
            })
          }

          if (devoir.channel_id && devoir.promo_id) {
            queries.sendMessage({
              channelId: devoir.channel_id,
              authorName: 'Cursus',
              authorId: null,
              authorType: 'system',
              content: `**Nouveau devoir publie** : ${devoir.title}${devoir.deadline ? ` (a rendre le ${devoir.deadline})` : ''}`,
            })
            io.to(`promo:${devoir.promo_id}`).emit('msg:new', {
              channelId: devoir.channel_id,
              authorName: 'Cursus',
              promoId: devoir.promo_id,
              preview: `Nouveau devoir publie : ${devoir.title}`,
            })
          }

          log.info('scheduled_devoir_published', { id: devoir.id, title: devoir.title })
        } catch (err) {
          log.error('scheduled_devoir_failed', { id: devoir.id, error: err.message })
        }
      }
    } catch (err) {
      log.error('scheduled_devoirs_failed', { error: err.message })
    }

  }, 30000)
}
