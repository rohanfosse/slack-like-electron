// ─── IPC handlers pour le cache offline ──────────────────────────────────────
const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')

// Lazy : app.getPath() n'est fiable qu'apres app ready, et le bundling CJS
// d'electron-vite peut evaluer ce module avant que electron ait peuple app.
function getCacheDir() {
  return path.join(app.getPath('userData'), 'offline-cache')
}

function ensureCacheDir() {
  const dir = getCacheDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function safeName(key) {
  // Sanitize le nom de fichier : garder uniquement alphanum, tirets, underscores
  return key.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function registerOfflineHandlers() {
  // Ecrire dans le cache
  ipcMain.handle('offline:write', async (_event, key, data) => {
    try {
      const dir = ensureCacheDir()
      const filePath = path.join(dir, `${safeName(key)}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
      return { ok: true, data: null }
    } catch (err) {
      console.error('[Offline] Erreur ecriture cache:', err.message)
      return { ok: false, error: err.message }
    }
  })

  // Lire depuis le cache
  ipcMain.handle('offline:read', async (_event, key) => {
    try {
      const filePath = path.join(getCacheDir(), `${safeName(key)}.json`)
      if (!fs.existsSync(filePath)) return { ok: true, data: null }
      const raw = fs.readFileSync(filePath, 'utf-8')
      return { ok: true, data: JSON.parse(raw) }
    } catch (err) {
      console.error('[Offline] Erreur lecture cache:', err.message)
      return { ok: false, error: err.message }
    }
  })

  // Vider tout le cache
  ipcMain.handle('offline:clear', async () => {
    try {
      const dir = getCacheDir()
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          fs.unlinkSync(path.join(dir, file))
        }
      }
      return { ok: true, data: null }
    } catch (err) {
      console.error('[Offline] Erreur nettoyage cache:', err.message)
      return { ok: false, error: err.message }
    }
  })
}

module.exports = { registerOfflineHandlers }
