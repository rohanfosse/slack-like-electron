/**
 * Scheduler : envoi des annonces planifiees (toutes les 30s).
 * Extrait de server/index.js pour separation des responsabilites.
 */
const log = require('../utils/logger')

module.exports = function startScheduler(io, queries) {
  return setInterval(() => {
    try {
      const { getDueScheduledMessages, markScheduledSent } = require('../db/models/admin')
      const due = getDueScheduledMessages()
      for (const sm of due) {
        try {
          // Resoudre l'authorId via le model (plus de SQL brut)
          const teachers = queries.getTeachers?.() ?? []
          const teacher = teachers.find(t => t.name === sm.author_name)
          const authorId = teacher ? -(teacher.id) : null

          queries.sendMessage({
            channelId: sm.channel_id, authorName: sm.author_name,
            authorId, authorType: sm.author_type, content: sm.content,
          })
          markScheduledSent(sm.id)

          // Envoi cible a la promo du canal via le model
          const channels = queries.getChannels?.(null) ?? []
          const ch = channels.find(c => c.id === sm.channel_id)
          if (ch) {
            io.to(`promo:${ch.promo_id}`).emit('msg:new', {
              channelId: sm.channel_id, authorName: sm.author_name,
              promoId: ch.promo_id,
              preview: sm.content.replace(/[*_`>#[\]!]/g, '').slice(0, 80),
            })
          }
          console.log(`[Scheduled] Message #${sm.id} envoye dans canal ${sm.channel_id}`)
        } catch (err) {
          console.error(`[Scheduled] Erreur envoi #${sm.id}:`, err.message)
        }
      }
    } catch (err) {
      log.error('scheduled_messages_failed', { error: err.message })
    }

    // ── Publication programmee des devoirs ────────────────────────────────
    try {
      const { getDueScheduledDevoirs, publishScheduledDevoir } = require('../db/models/assignments')
      const dueDevoirs = getDueScheduledDevoirs()
      for (const devoir of dueDevoirs) {
        try {
          publishScheduledDevoir(devoir.id)

          // Notifier les etudiants via socket
          if (devoir.promo_id) {
            io.to(`promo:${devoir.promo_id}`).emit('assignment:new', {
              title: devoir.title,
              category: devoir.category || null,
              deadline: devoir.deadline || null,
              promoId: devoir.promo_id,
            })
          }

          // Message d'annonce dans le canal lie
          if (devoir.channel_id) {
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

          console.log(`[Scheduled] Devoir #${devoir.id} "${devoir.title}" publie`)
        } catch (err) {
          console.error(`[Scheduled] Erreur publication devoir #${devoir.id}:`, err.message)
        }
      }
    } catch (err) {
      log.error('scheduled_devoirs_failed', { error: err.message })
    }
  }, 30000)
}
