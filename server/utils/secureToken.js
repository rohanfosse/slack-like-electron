const crypto = require('crypto')

/**
 * Cryptographically strong URL-safe token (base64url).
 * 32 octets -> 43 chars apres base64url sans padding.
 * A preferer a uuidv4() pour tout token distribue publiquement (liens email, URLs publiques).
 */
function secureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

module.exports = { secureToken }
