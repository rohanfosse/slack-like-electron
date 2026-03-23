/** Génère un code aléatoire de 6 caractères alphanumériques majuscules.
 *  Exclut les caractères ambigus I/O/0/1 pour éviter la confusion. */
module.exports = function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
