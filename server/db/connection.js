const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

let db;

/** Renomme l'ancien fichier cesi-classroom.db en cursus.db si besoin */
function migrateOldDbFile(newPath) {
  const dir = path.dirname(newPath)
  const oldPath = path.join(dir, 'cesi-classroom.db')
  if (!fs.existsSync(newPath) && fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath)
    for (const ext of ['-wal', '-shm']) {
      if (fs.existsSync(oldPath + ext)) fs.renameSync(oldPath + ext, newPath + ext)
    }
  }
}

function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH
  try {
    const { app } = require('electron')
    return path.join(app.getPath('userData'), 'cursus.db')
  } catch {
    return path.join(__dirname, '../../cursus.db')
  }
}

/**
 * Tente de restaurer la DB depuis le backup le plus recent.
 * Retourne true si la restauration a reussi.
 */
function tryRestoreFromBackup(dbPath) {
  const log = require('../utils/logger')
  const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), '..', 'backups')
  try {
    if (!fs.existsSync(backupDir)) return false
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('cursus-') && f.endsWith('.db'))
      .sort()
    if (!backups.length) return false

    const latest = path.join(backupDir, backups[backups.length - 1])
    const corruptedPath = dbPath + '.corrupted'

    // Deplacer le fichier corrompu
    for (const ext of ['', '-wal', '-shm']) {
      if (fs.existsSync(dbPath + ext)) {
        fs.renameSync(dbPath + ext, corruptedPath + ext)
      }
    }

    // Copier le backup
    fs.copyFileSync(latest, dbPath)
    log.warn('db_restored_from_backup', { backup: backups[backups.length - 1], corrupted: corruptedPath })
    return true
  } catch (err) {
    log.error('db_restore_failed', { error: err.message })
    return false
  }
}

function getDb() {
  if (!db) {
    const DB_PATH = resolveDbPath();
    migrateOldDbFile(DB_PATH);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    // Verification d'integrite au premier acces
    try {
      const result = db.pragma('integrity_check', { simple: true })
      if (result !== 'ok') {
        const log = require('../utils/logger')
        log.error('db_integrity_failed', { result, path: DB_PATH })

        // Tenter la restauration depuis un backup
        db.close()
        db = null
        if (tryRestoreFromBackup(DB_PATH)) {
          db = new Database(DB_PATH)
          db.pragma('journal_mode = WAL')
          db.pragma('foreign_keys = ON')
          db.pragma('busy_timeout = 5000')
        } else {
          // Mode degrade : reouvrir la DB corrompue
          log.error('db_no_backup_available', { path: DB_PATH })
          db = new Database(DB_PATH)
          db.pragma('journal_mode = WAL')
          db.pragma('foreign_keys = ON')
          db.pragma('busy_timeout = 5000')
        }
      }
    } catch { /* mode degrade — ne pas crasher */ }
  }
  return db;
}

function closeDb() {
  if (db) {
    try { db.close() } catch {}
    db = null
  }
}

module.exports = { getDb, closeDb };
