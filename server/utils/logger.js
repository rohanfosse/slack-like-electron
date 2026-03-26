// ─── Logger structuré JSON ───────────────────────────────────────────────────
// Remplace console.log/warn/error pour la production.
// Chaque entrée est une ligne JSON parseable par des outils de monitoring.

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const MIN_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || 1

function emit(level, message, meta = {}) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

const logger = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info:  (msg, meta) => emit('info',  msg, meta),
  warn:  (msg, meta) => emit('warn',  msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
}

module.exports = logger
