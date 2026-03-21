// Rebuild better-sqlite3 pour Electron uniquement si Electron est disponible
// Sur le serveur Hostinger (pas d'Electron), ce script est silencieux.
const { execSync } = require('child_process')

try {
  require('electron')
  console.log('[postinstall] Electron détecté - reconstruction de better-sqlite3...')
  execSync('node node_modules/@electron/rebuild/lib/cli.js -f -w better-sqlite3', {
    stdio: 'inherit',
    cwd:   process.cwd(),
  })
} catch {
  console.log('[postinstall] Electron absent - better-sqlite3 compilé pour Node.js standard.')
}
