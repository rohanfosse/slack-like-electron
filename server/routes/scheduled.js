/**
 * Routes API Messages programmes (user-scope).
 *
 * Monte sous /api/messages/scheduled dans server/index.js — AVANT /api/messages
 * pour ne pas etre capture par les routes :channelId/:studentId.
 */
const router    = require('express').Router()
const { z }     = require('zod')
const rateLimit = require('express-rate-limit')
const queries   = require('../db/index')
const { validate } = require('../middleware/validate')
const wrap      = require('../utils/wrap')
const { AppError } = require('../utils/errors')
const { validateDm, validateChannel } = require('../services/messages')

// Rate limit : 30 creations/min par user (aligne sur messages normaux)
const createLimiter = rateLimit({
  windowMs: 60_000, max: 30,
  keyGenerator: (req) => `sched:${req.user?.id ?? 'anon'}`,
  standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Trop de messages programmes. Reessayez dans une minute.' },
  validate: { xForwardedForHeader: false },
})

// Send at doit etre au moins 30s dans le futur (evite les programmations
// instantanees qui seraient envoyees au prochain tick scheduler).
const MIN_DELAY_MS = 30_000
const MAX_DELAY_MS = 365 * 24 * 3600 * 1000 // 1 an

const isoDate = z.string().refine((s) => {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return false
  const ts = d.getTime()
  const now = Date.now()
  return ts - now >= MIN_DELAY_MS && ts - now <= MAX_DELAY_MS
}, { message: 'sendAt doit etre entre 30s et 1 an dans le futur (format ISO)' })

const createSchema = z.object({
  channelId:     z.number().int().nullable().optional(),
  dmStudentId:   z.number().int().nullable().optional(),
  dmPeerId:      z.number().int().nullable().optional(),
  content:       z.string().min(1, 'Le message ne peut pas etre vide').max(10000, 'Message trop long (max 10 000 caracteres)'),
  sendAt:        isoDate,
  replyToId:     z.number().int().nullable().optional(),
  replyToAuthor: z.string().nullable().optional(),
  replyToPreview:z.string().nullable().optional(),
  attachments:   z.unknown().nullable().optional(),
}).refine(data => !!data.channelId !== !!data.dmStudentId, {
  message: 'channelId ou dmStudentId requis (exclusifs)',
})

const updateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  sendAt:  isoDate.optional(),
}).refine(data => data.content !== undefined || data.sendAt !== undefined, {
  message: 'content ou sendAt requis',
})

// GET /api/messages/scheduled/mine
router.get('/mine', wrap((req) => {
  return queries.listUserScheduledMessages(req.user.id, { includeSent: false })
}))

// POST /api/messages/scheduled
router.post('/', createLimiter, validate(createSchema), wrap((req) => {
  const payload = { ...req.body }

  // Reutilise les validations du MessageService (DM participant, canal non archive / annonce)
  validateDm(payload, req.user)
  validateChannel(payload, req.user)

  try {
    return queries.createUserScheduledMessage({
      authorId:       req.user.id,
      authorName:     req.user.name,
      authorType:     req.user.type,
      channelId:      payload.channelId ?? null,
      dmStudentId:    payload.dmStudentId ?? null,
      dmPeerId:       payload.dmPeerId ?? null,
      content:        payload.content,
      sendAt:         payload.sendAt,
      replyToId:      payload.replyToId ?? null,
      replyToAuthor:  payload.replyToAuthor ?? null,
      replyToPreview: payload.replyToPreview ?? null,
      attachments:    payload.attachments ?? null,
    })
  } catch (err) {
    // Le cap "50 messages programmes" et les autres pre-conditions sont des erreurs metier
    throw new AppError(err.message, 400)
  }
}))

// PATCH /api/messages/scheduled/:id
router.patch('/:id', validate(updateSchema), wrap((req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new AppError('id invalide', 400)
  const result = queries.updateUserScheduledMessage(req.user.id, id, req.body)
  if (!result.updated) throw new AppError('Message programme introuvable ou deja envoye.', 404)
  return result
}))

// DELETE /api/messages/scheduled/:id
router.delete('/:id', wrap((req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new AppError('id invalide', 400)
  return queries.deleteUserScheduledMessage(req.user.id, id)
}))

module.exports = router
