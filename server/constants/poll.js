// Marqueur du format sondage, partage entre routes, services et models.
// Le frontend a sa propre constante (src/renderer/src/utils/poll.ts) — les
// deux doivent rester synchrones (defense in depth).
module.exports = {
  POLL_MARKER: '::poll::',
}
