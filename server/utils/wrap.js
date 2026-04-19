/** Helper de route : enveloppe fn(req) dans try/catch et renvoie { ok, data }.
 *  Utilise err.statusCode si present (classes AppError), sinon fallback string matching. */
const log = require('./logger')

// Phrases metier specifiques (pas des substrings genériques comme "email" ou
// "max" qui matcheraient accidentellement des erreurs DB internes).
const CLIENT_ERROR_KEYWORDS = [
  'requis', 'invalide', 'introuvable', 'autoris', 'Accès',
  'pas pu', 'incorrect', 'expiré', 'existe', 'Données invalides',
  'trop long', 'trop court', 'refusé', 'manquant', 'déjà traité',
  'déjà utilisée', 'déjà utilisé',
  // Validation de mot de passe (user-facing)
  'majuscule', 'minuscule', 'spécial',
  'mot de passe',
  // Ownership / self-only actions
  'votre propre', 'vous-même',
  // Business rules (responsable principal)
  'responsable',
  // Quotas / tailles explicites
  'dépassé', 'taille maximale', 'limite autorisée',
]

/** Messages internes qui ne doivent jamais atteindre le client, meme en 4xx. */
const INTERNAL_LEAK_PATTERNS = [
  /sqlite[_a-z]*/i,
  /constraint failed:.*\./i,
  /[a-z]:\\[^"'\s]+/i,
  /\/(srv|home|root|var|etc|usr|tmp)\//,
  /\bat\s+\w+\s+\(.*:\d+:\d+\)/,
]

function sanitizeClientMessage(msg) {
  for (const re of INTERNAL_LEAK_PATTERNS) {
    if (re.test(msg)) return 'Requête invalide'
  }
  return msg
}

function resolveStatus(err) {
  // 1. Status explicite via AppError (prioritaire)
  if (err.statusCode) return err.statusCode

  const msg = err.message || ''
  const lowerMsg = msg.toLowerCase()

  // 2. Contrainte d'unicité → 409
  if (msg.includes('UNIQUE constraint')) return 409

  // 3. Mot-clé client → 400, sinon 500 (case-insensitive pour resister
  // aux majuscules des messages metier tels que "Responsable ...").
  return CLIENT_ERROR_KEYWORDS.some(kw => lowerMsg.includes(kw.toLowerCase())) ? 400 : 500
}

module.exports = function wrap(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req)
      res.json({ ok: true, data })
    } catch (err) {
      const rawMsg = err.message || 'Erreur interne'
      const status = resolveStatus(err)

      if (status >= 500) {
        log.error('route_error', {
          method: req.method, path: req.path, error: rawMsg, stack: err.stack,
        })
        // Ne JAMAIS leaker les details internes (chemins, noms de colonnes
        // SQLite, stack traces) au client — seules les 4xx portent un
        // message issu du code metier.
        return res.status(500).json({ ok: false, error: 'Erreur interne du serveur' })
      }
      // Meme sur les 4xx on filtre les patterns de leak (chemins, SQLite,
      // stacks) qui indiquent qu une erreur d infra a matche un keyword par
      // coincidence (ex. colonne "email" dans un UNIQUE failed).
      res.status(status).json({ ok: false, error: sanitizeClientMessage(rawMsg) })
    }
  }
}

module.exports.resolveStatus = resolveStatus
module.exports.sanitizeClientMessage = sanitizeClientMessage
