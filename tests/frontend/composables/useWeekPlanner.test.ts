/**
 * Tests pour le composable useWeekPlanner — logique pure buildWeek.
 */
import { describe, it, expect } from 'vitest'
import { buildWeek } from '@/composables/useWeekPlanner'
import type { Devoir } from '@/types'

function makeDevoir(overrides: Partial<Devoir> & { id: number; title: string; deadline: string }): Devoir {
  return {
    description: null,
    channel_id: 1,
    type: 'livrable',
    category: null,
    start_date: null,
    is_published: 1,
    assigned_to: 'all',
    group_id: null,
    depot_id: null,
    ...overrides,
  } as Devoir
}

describe('buildWeek', () => {
  const monday = new Date('2026-04-06T00:00:00')

  it('returns 7 days', () => {
    const week = buildWeek([], monday)
    expect(week.length).toBe(7)
  })

  it('first day matches startDate', () => {
    const week = buildWeek([], monday)
    expect(week[0].date).toBe('2026-04-06')
    expect(week[0].dayName).toBe('Lun')
  })

  it('marks today correctly', () => {
    const today = new Date()
    const week = buildWeek([], today)
    expect(week[0].isToday).toBe(true)
    expect(week[1].isToday).toBe(false)
  })

  it('places devoir on correct day', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'TP Algo', deadline: '2026-04-08T14:00:00Z' }), // Wednesday
    ]
    const week = buildWeek(devoirs, monday)
    const wednesday = week[2] // index 2 = Wed
    expect(wednesday.events.length).toBe(1)
    expect(wednesday.events[0].title).toBe('TP Algo')
  })

  it('ignores devoirs outside the week range', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'Too early', deadline: '2026-04-01T00:00:00Z' }),
      makeDevoir({ id: 2, title: 'Too late', deadline: '2026-04-20T00:00:00Z' }),
    ]
    const week = buildWeek(devoirs, monday)
    const totalEvents = week.reduce((sum, d) => sum + d.events.length, 0)
    expect(totalEvents).toBe(0)
  })

  it('sorts events within a day by deadline', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'Late', deadline: '2026-04-06T18:00:00Z' }),
      makeDevoir({ id: 2, title: 'Early', deadline: '2026-04-06T09:00:00Z' }),
    ]
    const week = buildWeek(devoirs, monday)
    expect(week[0].events[0].title).toBe('Early')
    expect(week[0].events[1].title).toBe('Late')
  })

  it('marks submitted devoirs', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'Done', deadline: '2026-04-06T12:00:00Z', depot_id: 42 }),
      makeDevoir({ id: 2, title: 'Pending', deadline: '2026-04-06T14:00:00Z', depot_id: null }),
    ]
    const week = buildWeek(devoirs, monday)
    expect(week[0].events[0].isSubmitted).toBe(true)
    expect(week[0].events[1].isSubmitted).toBe(false)
  })

  it('formats hour correctly', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'Test', deadline: '2026-04-06T09:30:00Z' }),
    ]
    const week = buildWeek(devoirs, monday)
    // Hour depends on timezone, just check format
    expect(week[0].events[0].hour).toMatch(/^\d{2}:\d{2}$/)
  })

  it('handles multiple devoirs on same day', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'A', deadline: '2026-04-07T10:00:00Z' }),
      makeDevoir({ id: 2, title: 'B', deadline: '2026-04-07T14:00:00Z' }),
      makeDevoir({ id: 3, title: 'C', deadline: '2026-04-07T18:00:00Z' }),
    ]
    const week = buildWeek(devoirs, monday)
    expect(week[1].events.length).toBe(3)
  })

  it('preserves devoir type', () => {
    const devoirs = [
      makeDevoir({ id: 1, title: 'Soutenance', deadline: '2026-04-06T10:00:00Z', type: 'soutenance' }),
    ]
    const week = buildWeek(devoirs, monday)
    expect(week[0].events[0].type).toBe('soutenance')
  })
})
