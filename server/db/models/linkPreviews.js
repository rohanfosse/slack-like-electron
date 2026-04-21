/**
 * Cache des previews de liens (OpenGraph).
 */
const crypto = require('crypto');
// Lire via connection.getDb() (pas destructuring) pour que les tests puissent
// monkey-patch setupTestDb() apres le chargement du module.
const connection = require('../connection');
const getDb = () => connection.getDb();

const TTL_HOURS = 24;

function hashUrl(url) {
  return crypto.createHash('sha256').update(String(url).trim().toLowerCase()).digest('hex');
}

/** Retourne la preview cachee si non expiree, sinon null. */
function getLinkPreview(url) {
  const hash = hashUrl(url);
  const row = getDb().prepare(
    `SELECT url, title, description, image, site_name, status, fetched_at, expires_at
       FROM link_previews
      WHERE url_hash = ?
        AND expires_at > datetime('now')`
  ).get(hash);
  return row ?? null;
}

/** Upsert d'une preview dans le cache. */
function upsertLinkPreview({ url, title = null, description = null, image = null, siteName = null, status = 200 }) {
  const hash = hashUrl(url);
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
  getDb().prepare(`
    INSERT INTO link_previews (url_hash, url, title, description, image, site_name, status, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(url_hash) DO UPDATE SET
      url         = excluded.url,
      title       = excluded.title,
      description = excluded.description,
      image       = excluded.image,
      site_name   = excluded.site_name,
      status      = excluded.status,
      fetched_at  = excluded.fetched_at,
      expires_at  = excluded.expires_at
  `).run(hash, url, title, description, image, siteName, status, expires);
  return { url, title, description, image, site_name: siteName, status };
}

/** Purge les entrees expirees. Appele par le scheduler. */
function purgeExpiredLinkPreviews() {
  return getDb().prepare(
    `DELETE FROM link_previews WHERE expires_at <= datetime('now')`
  ).run().changes;
}

module.exports = {
  TTL_HOURS,
  hashUrl,
  getLinkPreview,
  upsertLinkPreview,
  purgeExpiredLinkPreviews,
};
