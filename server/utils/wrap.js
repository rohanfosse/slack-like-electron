/** Helper de route : enveloppe fn(req) dans try/catch et renvoie { ok, data } */
module.exports = function wrap(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req)
      res.json({ ok: true, data })
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message })
    }
  }
}
