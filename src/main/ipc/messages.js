// ─── IPC : Messages (lecture, recherche, épinglage, réactions) ────────────────
const { handle } = require('./helpers')
const queries = require('../../../server/db/index')

function register() {
  // ── Lecture ──────────────────────────────────────────────────────────────
  handle('db:getChannelMessages',     (channelId)              => queries.getChannelMessages(channelId))
  handle('db:getDmMessages',          (studentId)              => queries.getDmMessages(studentId))
  handle('db:getChannelMessagesPage', (channelId, beforeId)    => queries.getChannelMessagesPage(channelId, beforeId ?? null))
  handle('db:getDmMessagesPage',      (studentId, beforeId, peer) => queries.getDmMessagesPage(studentId, beforeId ?? null, peer ?? null))
  handle('db:searchMessages',         (channelId, query)       => queries.searchMessages(channelId, query))
  handle('db:searchAllMessages',      ({ promoId, query, limit }) => queries.searchAllMessages(promoId ?? null, query, limit ?? 8))

  // Note : l'envoi de messages passe par HTTP POST /api/messages (pas par IPC).
  // Le serveur Express gère la sauvegarde DB + l'émission Socket.io.

  // ── Épinglage ───────────────────────────────────────────────────────────
  handle('db:getPinnedMessages', (channelId) => queries.getPinnedMessages(channelId))
  handle('db:togglePinMessage',  (payload)   => queries.togglePinMessage(payload.messageId, payload.pinned))

  // ── Réactions ───────────────────────────────────────────────────────────
  handle('db:updateReactions', (msgId, reactionsJson) => queries.updateReactions(msgId, reactionsJson))

  // ── Suppression / modification ──────────────────────────────────────────
  handle('db:deleteMessage', (id) => queries.deleteMessage(id))
  handle('db:editMessage',   (id, content) => queries.editMessage(id, content))
}

module.exports = { register }
