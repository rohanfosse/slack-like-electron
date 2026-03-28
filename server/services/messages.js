/**
 * MessageService : logique metier de creation de message.
 * Extrait de server/routes/messages.js pour separation des responsabilites.
 */
const queries = require('../db/index')
const { ForbiddenError, NotFoundError, AppError } = require('../utils/errors')

/**
 * Valide les permissions DM et l'existence du destinataire.
 */
function validateDm(payload, user) {
  if (!payload.dmStudentId) return

  // Un etudiant ne peut envoyer un DM que dans sa propre boite
  if (user.type === 'student' && payload.dmStudentId !== user.id) {
    throw new ForbiddenError('Vous ne pouvez envoyer des messages que dans vos propres conversations.')
  }
  // Un etudiant ne peut avoir qu'un prof (ID negatif) comme peer
  if (user.type === 'student' && payload.dmPeerId != null && payload.dmPeerId >= 0) {
    throw new ForbiddenError('Destinataire DM invalide.')
  }
  // Verifier que le destinataire existe
  const { getDb } = require('../db/connection')
  const exists = getDb().prepare('SELECT id FROM students WHERE id = ?').get(payload.dmStudentId)
  if (!exists) {
    throw new NotFoundError('Destinataire introuvable.')
  }
}

/**
 * Verifie qu'un etudiant n'ecrit pas dans un canal d'annonce.
 */
function validateChannel(payload, user) {
  if (!payload.channelId || user.type !== 'student') return

  const { getDb } = require('../db/connection')
  const ch = getDb().prepare('SELECT type FROM channels WHERE id = ?').get(payload.channelId)
  if (ch?.type === 'annonce') {
    throw new ForbiddenError('Les etudiants ne peuvent pas poster dans les canaux d\'annonce.')
  }
}

/**
 * Parse les mentions dans le contenu du message.
 */
function parseMentions(content) {
  const rawContent = content ?? ''
  const mentionEveryone = /@everyone\b/i.test(rawContent)
  const mentionNames = []
  const re = /@([\w][\w.\-]*)/g
  let m
  while ((m = re.exec(rawContent)) !== null) {
    const name = m[1].toLowerCase()
    if (name !== 'everyone') mentionNames.push(m[1])
  }
  return { mentionEveryone, mentionNames }
}

/**
 * Construit le payload de push notification Socket.io.
 */
function buildPushPayload(payload, user, message, mentions) {
  return {
    channelId: payload.channelId ?? null,
    dmStudentId: payload.dmStudentId ?? null,
    authorName: user.name ?? null,
    channelName: payload.channelName ?? null,
    promoId: payload.promoId ?? null,
    preview: (payload.content ?? '').replace(/[*_`>#[\]!]/g, '').slice(0, 80),
    mentionEveryone: mentions.mentionEveryone,
    mentionNames: mentions.mentionNames,
    message: payload.dmStudentId ? message : undefined,
  }
}

/**
 * Cree un message et retourne { message, pushPayload }.
 */
function create(payload, user) {
  // Forcer l'identite depuis le JWT (anti-usurpation)
  payload.authorName = user.name
  payload.authorId = user.id
  payload.authorType = user.type === 'ta' ? 'teacher' : user.type

  // Validations
  validateDm(payload, user)
  validateChannel(payload, user)

  // Insertion
  const result = queries.sendMessage(payload)
  const message = queries.getMessageById(Number(result.lastInsertRowid))
  if (!message) {
    throw new AppError('Le message a ete insere mais n\'a pas pu etre relu.', 500)
  }

  // Mentions
  const mentions = parseMentions(payload.content)

  // Push payload
  const pushPayload = buildPushPayload(payload, user, message, mentions)

  return { message, pushPayload }
}

module.exports = { create, validateDm, validateChannel, parseMentions, buildPushPayload }
