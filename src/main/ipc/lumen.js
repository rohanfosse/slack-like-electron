// ─── IPC : Lumen (export notes markdown) ────────────────────────────────────
// Handler unique pour sauvegarder l'export markdown des notes de l'eleve
// sur le disque via save dialog Electron natif. Le renderer produit le
// contenu (concatene depuis l'API) et delegue la sauvegarde ici.
const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')

function register() {
  /**
   * Sauvegarde un export markdown (notes etudiant) via save dialog natif.
   * @param {{ content: string, suggestedName: string }} payload
   */
  ipcMain.handle('lumen:saveNotesMarkdown', async (_event, payload) => {
    try {
      const { content, suggestedName } = payload ?? {}
      if (typeof content !== 'string') return { ok: false, error: 'Contenu invalide.' }
      const { canceled, filePath: dest } = await dialog.showSaveDialog({
        defaultPath: suggestedName || 'mes-notes-lumen.md',
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Texte', extensions: ['txt'] },
        ],
      })
      if (canceled || !dest) return { ok: true, data: null }
      fs.writeFileSync(dest, content, 'utf8')
      return { ok: true, data: { filename: path.basename(dest), path: dest } }
    } catch (err) {
      return { ok: false, error: err?.message ?? 'Erreur lors de la sauvegarde.' }
    }
  })
}

module.exports = { register }
