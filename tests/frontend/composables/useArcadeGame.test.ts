/**
 * Tests pour useArcadeGame — socle partage des mini-jeux arcade (Snake,
 * Space Invaders, ...). Valide :
 *   - machine d'etats (idle -> playing -> done)
 *   - chrono + tracking durationMs (plancher a 500ms)
 *   - submit du score en fin de partie + refresh leaderboard + stats
 *   - scope switching (day / week / all) avec court-circuit si inchange
 *   - guard clauses (addScore/tick/endRun hors etat playing)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const api = vi.fn(async (call: () => Promise<{ ok: boolean; data?: unknown; error?: string }>) => {
  const res = await call()
  return res.ok ? (res.data ?? null) : null
})

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api }),
}))

const gameSubmitScore = vi.fn()
const gameLeaderboard = vi.fn()
const gameMyStats = vi.fn()

vi.stubGlobal('window', {
  api: { gameSubmitScore, gameLeaderboard, gameMyStats },
})

import { useArcadeGame } from '@/composables/useArcadeGame'

describe('useArcadeGame', () => {
  let game: ReturnType<typeof useArcadeGame>

  beforeEach(() => {
    api.mockClear()
    gameSubmitScore.mockReset()
    gameLeaderboard.mockReset()
    gameMyStats.mockReset()
    gameSubmitScore.mockResolvedValue({ ok: true, data: { id: 1, score: 0 } })
    gameLeaderboard.mockResolvedValue({ ok: true, data: [] })
    gameMyStats.mockResolvedValue({ ok: true, data: null })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-19T10:00:00Z'))
    game = useArcadeGame('snake')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('etat initial', () => {
    it('expose les valeurs par defaut', () => {
      expect(game.state.value).toBe('idle')
      expect(game.score.value).toBe(0)
      expect(game.elapsedMs.value).toBe(0)
      expect(game.lastResult.value).toBeNull()
      expect(game.leaderboard.value).toEqual([])
      expect(game.myStats.value).toBeNull()
      expect(game.scope.value).toBe('day')
    })
  })

  describe('startRun', () => {
    it('bascule en playing et reset score/elapsed/lastResult', () => {
      game.startRun()
      expect(game.state.value).toBe('playing')
      expect(game.score.value).toBe(0)
      expect(game.elapsedMs.value).toBe(0)
      expect(game.lastResult.value).toBeNull()
    })

    it('ecrase les valeurs d un run precedent', () => {
      game.startRun()
      game.addScore(10)
      expect(game.score.value).toBe(10)
      game.startRun()
      expect(game.score.value).toBe(0)
    })
  })

  describe('addScore', () => {
    it('cumule le delta quand playing', () => {
      game.startRun()
      game.addScore(5)
      game.addScore(7)
      expect(game.score.value).toBe(12)
    })

    it('accepte les deltas negatifs', () => {
      game.startRun()
      game.addScore(10)
      game.addScore(-3)
      expect(game.score.value).toBe(7)
    })

    it('no-op quand idle', () => {
      game.addScore(42)
      expect(game.score.value).toBe(0)
    })

    it('no-op quand done', async () => {
      game.startRun()
      game.addScore(10)
      vi.advanceTimersByTime(1000)
      await game.endRun()
      game.addScore(5)
      expect(game.score.value).toBe(10)
    })
  })

  describe('tick', () => {
    it('met a jour elapsedMs depuis startedAt', () => {
      game.startRun()
      vi.advanceTimersByTime(2500)
      game.tick()
      expect(game.elapsedMs.value).toBe(2500)
    })

    it('no-op quand idle', () => {
      vi.advanceTimersByTime(1000)
      game.tick()
      expect(game.elapsedMs.value).toBe(0)
    })

    it('no-op quand done', async () => {
      game.startRun()
      vi.advanceTimersByTime(1000)
      await game.endRun()
      const after = game.elapsedMs.value
      vi.advanceTimersByTime(5000)
      game.tick()
      expect(game.elapsedMs.value).toBe(after)
    })
  })

  describe('reset', () => {
    it('remet tous les refs a leurs valeurs initiales', () => {
      game.startRun()
      game.addScore(10)
      vi.advanceTimersByTime(500)
      game.tick()
      game.reset()
      expect(game.state.value).toBe('idle')
      expect(game.score.value).toBe(0)
      expect(game.elapsedMs.value).toBe(0)
      expect(game.lastResult.value).toBeNull()
    })
  })

  describe('endRun', () => {
    it('passe a done et fige lastResult', async () => {
      game.startRun()
      game.addScore(25)
      vi.advanceTimersByTime(3000)
      await game.endRun()
      expect(game.state.value).toBe('done')
      expect(game.lastResult.value).toEqual({ score: 25, durationMs: 3000 })
      expect(game.elapsedMs.value).toBe(3000)
    })

    it('applique un plancher de 500ms sur durationMs', async () => {
      game.startRun()
      // 0ms ecoule : clamp a 500
      await game.endRun()
      expect(game.lastResult.value?.durationMs).toBe(500)
    })

    it('submit le score via window.api.gameSubmitScore', async () => {
      game.startRun()
      game.addScore(42)
      vi.advanceTimersByTime(1500)
      await game.endRun({ level: 3 })
      expect(gameSubmitScore).toHaveBeenCalledWith('snake', {
        score: 42,
        durationMs: 1500,
        meta: { level: 3 },
      })
    })

    it('declenche refreshLeaderboard + refreshMyStats apres submit', async () => {
      game.startRun()
      vi.advanceTimersByTime(1000)
      await game.endRun()
      expect(gameLeaderboard).toHaveBeenCalledWith('snake', 'day')
      expect(gameMyStats).toHaveBeenCalledWith('snake')
    })

    it('no-op si appele en dehors de playing', async () => {
      await game.endRun()
      expect(gameSubmitScore).not.toHaveBeenCalled()
      expect(game.state.value).toBe('idle')
    })

    it('ne double-submit pas si appele deux fois', async () => {
      game.startRun()
      vi.advanceTimersByTime(1000)
      await game.endRun()
      await game.endRun()
      expect(gameSubmitScore).toHaveBeenCalledTimes(1)
    })
  })

  describe('refreshLeaderboard', () => {
    it('met a jour leaderboard depuis window.api', async () => {
      const rows = [
        { rank: 1, userType: 'student' as const, userId: 1, name: 'Alice', bestScore: 100, plays: 5 },
      ]
      gameLeaderboard.mockResolvedValue({ ok: true, data: rows })
      await game.refreshLeaderboard()
      expect(game.leaderboard.value).toEqual(rows)
    })

    it('utilise le scope courant par defaut', async () => {
      await game.refreshLeaderboard()
      expect(gameLeaderboard).toHaveBeenCalledWith('snake', 'day')
    })

    it('accepte un scope explicite et met a jour scope.value', async () => {
      await game.refreshLeaderboard('week')
      expect(game.scope.value).toBe('week')
      expect(gameLeaderboard).toHaveBeenCalledWith('snake', 'week')
    })

    it('ne remplace pas leaderboard quand l API echoue', async () => {
      gameLeaderboard.mockResolvedValueOnce({
        ok: true,
        data: [{ rank: 1, userType: 'student', userId: 1, name: 'A', bestScore: 10, plays: 1 }],
      })
      await game.refreshLeaderboard()
      expect(game.leaderboard.value).toHaveLength(1)

      gameLeaderboard.mockResolvedValueOnce({ ok: false, error: 'boom' })
      await game.refreshLeaderboard()
      // Conserve la valeur precedente
      expect(game.leaderboard.value).toHaveLength(1)
    })
  })

  describe('setScope', () => {
    it('bascule le scope et refetch le leaderboard', async () => {
      await game.setScope('all')
      expect(game.scope.value).toBe('all')
      expect(gameLeaderboard).toHaveBeenCalledWith('snake', 'all')
    })

    it('court-circuite si le scope est inchange', async () => {
      expect(game.scope.value).toBe('day')
      await game.setScope('day')
      expect(gameLeaderboard).not.toHaveBeenCalled()
    })

    it('accepte les trois valeurs valides', async () => {
      await game.setScope('week')
      expect(game.scope.value).toBe('week')
      await game.setScope('all')
      expect(game.scope.value).toBe('all')
      await game.setScope('day')
      expect(game.scope.value).toBe('day')
      expect(gameLeaderboard).toHaveBeenCalledTimes(3)
    })
  })

  describe('refreshMyStats', () => {
    it('met a jour myStats depuis window.api', async () => {
      const stats = {
        allTime: { plays: 10, bestScore: 200, avgScore: 80 },
        today: { bestScore: 50, plays: 2 },
        week: { bestScore: 150 },
        history: [],
      }
      gameMyStats.mockResolvedValue({ ok: true, data: stats })
      await game.refreshMyStats()
      expect(game.myStats.value).toEqual(stats)
    })

    it('conserve myStats precedent si l API echoue', async () => {
      const stats = {
        allTime: { plays: 1, bestScore: 1, avgScore: 1 },
        today: { bestScore: 0, plays: 0 },
        week: { bestScore: 0 },
        history: [],
      }
      gameMyStats.mockResolvedValueOnce({ ok: true, data: stats })
      await game.refreshMyStats()
      gameMyStats.mockResolvedValueOnce({ ok: false, error: 'boom' })
      await game.refreshMyStats()
      expect(game.myStats.value).toEqual(stats)
    })
  })

  describe('isolation entre instances', () => {
    it('deux appels useArcadeGame creent des etats independants', () => {
      const snake = useArcadeGame('snake')
      const invaders = useArcadeGame('space-invaders')
      snake.startRun()
      snake.addScore(100)
      expect(invaders.state.value).toBe('idle')
      expect(invaders.score.value).toBe(0)
    })

    it('utilise le gameId fourni pour les appels API', async () => {
      const invaders = useArcadeGame('space-invaders')
      invaders.startRun()
      vi.advanceTimersByTime(1000)
      await invaders.endRun()
      expect(gameSubmitScore).toHaveBeenCalledWith(
        'space-invaders',
        expect.objectContaining({ score: 0 }),
      )
    })
  })
})
