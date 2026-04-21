/** Routes API Signets de messages. */
const router    = require('express').Router()
const { z }     = require('zod')
const queries   = require('../db/index')
const { getDb } = require('../db/connection')
const { validate } = require('../middleware/validate')
const wrap      = require('../utils/wrap')
const { ForbiddenError, NotFoundError } = require('../utils/errors')

// ── Schemas ─────────────────────────────────────────────────────────────────
const addSchema = z.object({
  messageId: z.number().int().positive('messageId invalide'),
  note:      z.string().max(500, 'Note trop longue (max 500 caractères)').nullable().optional(),
})

const importSchema = z.object({
  messageIds: z.array(z.number().int().positive()).max(500, 'Trop de signets (max 500)'),
})

// ── Access control ──────────────────────────────────────────────────────────
/**
 * Verifie que le user peut bookmarker ce message (ie. il y a acces).
 * Teachers et admins : toujours autorises. Students : promo check pour canal,
 * participant check pour DM.
 */
function assertMessageAccess(user, messageId) {
  const msg = getDb().prepare(`
    SELECT m.id, m.channel_id, m.dm_student_id, m.author_id,
           c.promo_id AS channel_promo
    FROM messages m
    LEFT JOIN channels c ON c.id = m.channel_id
    WHERE m.id = ? AND m.deleted_at IS NULL
  `).get(messageId)
  if (!msg) throw new NotFoundError('Message introuvable.')
  if (user?.type !== 'student') return msg
  if (msg.channel_id) {
    if (msg.channel_promo !== user.promo_id) {
      throw new ForbiddenError('Accès non autorisé à ce message.')
    }
    return msg
  }
  // DM : participant direct OU boite partagee (meme promo que le proprietaire)
  if (msg.dm_student_id === user.id || msg.author_id === user.id) return msg
  const box = getDb().prepare('SELECT promo_id FROM students WHERE id = ?').get(msg.dm_student_id)
  if (!box || box.promo_id !== user.promo_id) {
    throw new ForbiddenError('Accès non autorisé à ce message.')
  }
  return msg
}

// ── Routes ──────────────────────────────────────────────────────────────────
// GET /api/bookmarks?before=&limit=
router.get('/', wrap((req) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const before = req.query.before ? Number(req.query.before) : null
  return queries.listBookmarks({ userId: req.user.id, beforeId: before, limit })
}))

// GET /api/bookmarks/ids  — liste legere pour initialisation du store client
router.get('/ids', wrap((req) => ({
  ids: queries.listBookmarkIds(req.user.id),
  count: queries.countBookmarks(req.user.id),
})))

// POST /api/bookmarks  body: { messageId, note? }
router.post('/', validate(addSchema), wrap((req) => {
  assertMessageAccess(req.user, req.body.messageId)
  return queries.addBookmark({
    userId:    req.user.id,
    userType:  req.user.type,
    messageId: req.body.messageId,
    note:      req.body.note ?? null,
  })
}))

// DELETE /api/bookmarks/:messageId
router.delete('/:messageId', wrap((req) => {
  const messageId = Number(req.params.messageId)
  if (!Number.isInteger(messageId) || messageId <= 0) {
    throw new Error('messageId invalide')
  }
  return queries.removeBookmark({ userId: req.user.id, messageId })
}))

// POST /api/bookmarks/import  body: { messageIds: [] }
// Migration one-shot du localStorage vers le serveur. Les IDs inaccessibles
// ou deja bookmarkes sont silencieusement ignores (INSERT OR IGNORE).
router.post('/import', validate(importSchema), wrap((req) => {
  return queries.importBookmarks({
    userId:     req.user.id,
    userType:   req.user.type,
    messageIds: req.body.messageIds,
  })
}))

module.exports = router
