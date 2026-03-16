const { getDb } = require('../connection');

function getPromotions() {
  return getDb().prepare('SELECT * FROM promotions ORDER BY name').all();
}

function getChannels(promoId) {
  return getDb().prepare(
    "SELECT * FROM channels WHERE promo_id = ? ORDER BY COALESCE(category, 'zzz') ASC, type DESC, name ASC"
  ).all(promoId);
}

function createPromotion({ name, color }) {
  const db      = getDb();
  const promoId = db.prepare('INSERT INTO promotions (name, color) VALUES (?, ?)').run(name, color).lastInsertRowid;
  db.prepare("INSERT INTO channels (promo_id, name, description, type) VALUES (?, 'annonces', 'Informations importantes', 'annonce')").run(promoId);
  db.prepare("INSERT INTO channels (promo_id, name, description, type) VALUES (?, 'general', 'Canal principal', 'chat')").run(promoId);
  return promoId;
}

function deletePromotion(promoId) {
  return getDb().prepare('DELETE FROM promotions WHERE id = ?').run(promoId);
}

function createChannel({ promoId, name, type, isPrivate, members, category }) {
  const db          = getDb();
  const membersJson = isPrivate && members?.length ? JSON.stringify(members) : null;
  const chType      = type === 'annonce' ? 'annonce' : 'chat';
  return db.prepare(
    'INSERT INTO channels (promo_id, name, description, type, is_private, members, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(promoId, name, '', chType, isPrivate ? 1 : 0, membersJson, category ?? null).lastInsertRowid;
}

module.exports = { getPromotions, getChannels, createPromotion, deletePromotion, createChannel };
