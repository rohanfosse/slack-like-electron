// ─── Middlewares d'autorisation (rôle + isolation promo) ──────────────────────
const { getDb } = require('../db/connection')

/** Bloque les étudiants — seuls les profs et intervenants passent. */
function requireTeacher(req, res, next) {
  if (req.user?.type === 'student') {
    return res.status(403).json({ ok: false, error: 'Accès réservé aux enseignants.' })
  }
  next()
}

/**
 * Vérifie que l'étudiant appartient à la promo ciblée.
 * Les profs/intervenants passent toujours.
 * @param {(req: import('express').Request) => number|null} getPromoId — extrait le promoId cible de la requête
 */
function requirePromo(getPromoId) {
  return (req, res, next) => {
    if (req.user?.type !== 'student') return next()
    const targetPromo = getPromoId(req)
    if (targetPromo != null && req.user.promo_id !== targetPromo) {
      return res.status(403).json({ ok: false, error: 'Accès non autorisé à cette promotion.' })
    }
    next()
  }
}

/** Lookup : channelId → promo_id */
function promoFromChannel(req) {
  const channelId = Number(req.params.channelId ?? req.query.channelId)
  if (!channelId) return null
  const ch = getDb().prepare('SELECT promo_id FROM channels WHERE id = ?').get(channelId)
  return ch?.promo_id ?? null
}

/** Lookup : promoId depuis params ou query */
function promoFromParam(req) {
  return Number(req.params.promoId ?? req.query.promoId) || null
}

/** Lookup : travailId → promo_id */
function promoFromTravail(req) {
  const travailId = Number(req.params.id ?? req.query.travailId)
  if (!travailId) return null
  const t = getDb().prepare('SELECT promo_id FROM travaux WHERE id = ?').get(travailId)
  return t?.promo_id ?? null
}

/**
 * Vérifie que l'utilisateur est l'auteur du message (pour edit/delete).
 */
function requireMessageOwner(req, res, next) {
  if (req.user?.type !== 'student') return next()
  const msgId = Number(req.params.id)
  if (!msgId) return res.status(400).json({ ok: false, error: 'ID message manquant.' })
  const msg = getDb().prepare('SELECT author_name FROM messages WHERE id = ?').get(msgId)
  if (!msg) return res.status(404).json({ ok: false, error: 'Message introuvable.' })
  if (msg.author_name !== req.user.name) {
    return res.status(403).json({ ok: false, error: 'Vous ne pouvez modifier que vos propres messages.' })
  }
  next()
}

/**
 * Vérifie que l'utilisateur est l'un des deux participants du DM.
 * Le paramètre :studentId identifie la "boîte" DM (toujours l'ID étudiant positif).
 * - Un étudiant ne peut accéder qu'à sa propre boîte (studentId === req.user.id)
 * - Un prof peut accéder à toute boîte (il est l'interlocuteur implicite)
 */
function requireDmParticipant(req, res, next) {
  if (req.user?.type !== 'student') return next() // profs passent
  const boxId = Number(req.params.studentId)
  if (boxId && boxId !== req.user.id) {
    return res.status(403).json({ ok: false, error: 'Vous ne pouvez accéder qu\'à vos propres conversations.' })
  }
  next()
}

module.exports = {
  requireTeacher,
  requirePromo,
  promoFromChannel,
  promoFromParam,
  promoFromTravail,
  requireMessageOwner,
  requireDmParticipant,
}
