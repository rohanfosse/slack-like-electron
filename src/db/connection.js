const Database = require('better-sqlite3');
const path     = require('path');
const { app }  = require('electron');

let db;

function getDb() {
  if (!db) {
    const DB_PATH = path.join(app.getPath('userData'), 'cesi-classroom.db');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
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
