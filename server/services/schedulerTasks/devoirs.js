/**
 * schedulerTasks/devoirs.js — Publication programmee des devoirs.
 */
const log = require('../../utils/logger')
const { getDueScheduledDevoirs, publishScheduledDevoir } = require('../../db/models/assignments')

module.exports = function processScheduledDevoirs(io, queries) {
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
}
