/**
 * Modele DB generique pour les mini-jeux arcade (v74).
 *
 * Une seule table `game_scores` partagee entre Snake, Space Invaders,
 * Pacman et tous les jeux arcade a venir. TypeRace garde son schema
 * dedie (typerace_scores) pour son metric specifique (wpm, accuracy).
 *
 * Le leaderboard agrege le MEILLEUR score par user sur une fenetre
 * (day/week/all) et melange teachers + students (meme choix v2.172 que
 * typerace : chambrage entre collegues bienvenu).
 */
const { getDb } = require('../connection')

function insertGameScore({ gameId, userType, userId, promoId, score, durationMs, meta }) {
  const metaJson = meta ? JSON.stringify(meta) : null
  const info = getDb().prepare(`
    INSERT INTO game_scores (game_id, user_type, user_id, promo_id, score, duration_ms, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(gameId, userType, userId, promoId ?? null, score, durationMs, metaJson)
  return { id: info.lastInsertRowid }
}

function getGameLeaderboard({ gameId, promoId, scope = 'day', limit = 10 }) {
  const windowClause = windowSqlForScope(scope)
  const params = [gameId]
  let promoClause = ''
  if (promoId != null) {
    promoClause = "AND (gs.promo_id = ? OR gs.user_type = 'teacher')"
    params.push(promoId)
  }

  const rows = getDb().prepare(`
    SELECT
      gs.user_type  AS userType,
      gs.user_id    AS userId,
      u.name        AS name,
      MAX(gs.score) AS bestScore,
      COUNT(*)      AS plays
    FROM game_scores gs
    JOIN users u ON u.id = gs.user_id AND u.role = gs.user_type
    WHERE gs.game_id = ?
      ${windowClause}
      ${promoClause}
    GROUP BY gs.user_type, gs.user_id
    ORDER BY bestScore DESC
    LIMIT ?
  `).all(...params, limit)

  return rows.map((r, i) => ({
    rank: i + 1,
    userType: r.userType,
    userId: r.userId,
    name: r.name,
    bestScore: Math.round(r.bestScore),
    plays: r.plays,
  }))
}

function getGameUserStats(gameId, userType, userId) {
  const db = getDb()

  const all = db.prepare(`
    SELECT COUNT(*) AS plays, MAX(score) AS bestScore, AVG(score) AS avgScore
    FROM game_scores
    WHERE game_id = ? AND user_type = ? AND user_id = ?
  `).get(gameId, userType, userId)

  const today = db.prepare(`
    SELECT MAX(score) AS bestScore, COUNT(*) AS plays
    FROM game_scores
    WHERE game_id = ? AND user_type = ? AND user_id = ?
      AND created_at >= datetime('now', 'start of day')
  `).get(gameId, userType, userId)

  const week = db.prepare(`
    SELECT MAX(score) AS bestScore
    FROM game_scores
    WHERE game_id = ? AND user_type = ? AND user_id = ?
      AND created_at >= datetime('now', '-7 days')
  `).get(gameId, userType, userId)

  const history = db.prepare(`
    SELECT id, score, duration_ms AS durationMs, created_at AS createdAt
    FROM game_scores
    WHERE game_id = ? AND user_type = ? AND user_id = ?
      AND created_at >= datetime('now', '-30 days')
    ORDER BY created_at DESC
    LIMIT 100
  `).all(gameId, userType, userId)

  return {
    allTime: {
      plays: all.plays ?? 0,
      bestScore: Math.round(all.bestScore ?? 0),
      avgScore: Math.round(all.avgScore ?? 0),
    },
    today: {
      bestScore: Math.round(today.bestScore ?? 0),
      plays: today.plays ?? 0,
    },
    week: {
      bestScore: Math.round(week.bestScore ?? 0),
    },
    history,
  }
}

function windowSqlForScope(scope) {
  if (scope === 'day')  return "AND gs.created_at >= datetime('now', 'start of day')"
  if (scope === 'week') return "AND gs.created_at >= datetime('now', '-7 days')"
  return ''
}

module.exports = {
  insertGameScore,
  getGameLeaderboard,
  getGameUserStats,
}
