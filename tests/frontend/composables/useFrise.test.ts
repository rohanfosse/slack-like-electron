import { describe, it, expect } from 'vitest'
import {
  buildProjectColorMap, flattenMilestones, groupByDay, positionGroups,
  type FriseMilestone, type FrisePromo, type EnrichedMilestone, type DayGroup,
} from '@/composables/useFrise'

// ── Helpers ──────────────────────────────────────────────────────────────────
function ms(overrides: Partial<FriseMilestone> = {}): FriseMilestone {
  return { id: 1, title: 'TP1', type: 'livrable', deadline: '2030-06-01', published: true, done: false, ...overrides }
}

function promo(projects: { key: string; milestones: FriseMilestone[] }[]): FrisePromo {
  return {
    name: 'Promo A', color: '#4A90D9',
    projects: projects.map(p => ({ ...p, label: p.key, icon: null })),
  }
}

// ═══════════════════════════════════════════
//  buildProjectColorMap
// ═══════════════════════════════════════════
describe('buildProjectColorMap', () => {
  it('assigns unique colors to different projects', () => {
    const promos = [promo([
      { key: 'Web', milestones: [ms()] },
      { key: 'Data', milestones: [ms()] },
    ])]
    const map = buildProjectColorMap(promos)
    expect(map.size).toBe(2)
    expect(map.get('Web')).not.toBe(map.get('Data'))
  })

  it('returns empty map for no promos', () => {
    expect(buildProjectColorMap([]).size).toBe(0)
  })

  it('handles projects across multiple promos', () => {
    const promos = [
      promo([{ key: 'Web', milestones: [ms()] }]),
      promo([{ key: 'Data', milestones: [ms()] }]),
    ]
    const map = buildProjectColorMap(promos)
    expect(map.size).toBe(2)
  })

  it('deduplicates same project key across promos', () => {
    const promos = [
      promo([{ key: 'Web', milestones: [ms()] }]),
      promo([{ key: 'Web', milestones: [ms()] }]),
    ]
    const map = buildProjectColorMap(promos)
    expect(map.size).toBe(1)
  })
})

// ═══════════════════════════════════════════
//  flattenMilestones
// ═══════════════════════════════════════════
describe('flattenMilestones', () => {
  it('enriches milestones with project info and color', () => {
    const promos = [promo([{ key: 'Web', milestones: [ms({ id: 1 }), ms({ id: 2 })] }])]
    const colorMap = new Map([['Web', '#FF0000']])
    const result = flattenMilestones(promos, colorMap, false)
    expect(result.length).toBe(2)
    expect(result[0].projectKey).toBe('Web')
    expect(result[0].color).toBe('#FF0000')
  })

  it('excludes past milestones by default', () => {
    const promos = [promo([{ key: 'Web', milestones: [
      ms({ id: 1, deadline: '2020-01-01' }),
      ms({ id: 2, deadline: '2099-12-31' }),
    ]}])]
    const colorMap = new Map([['Web', '#000']])
    const result = flattenMilestones(promos, colorMap)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(2)
  })

  it('includes past milestones when excludePast=false', () => {
    const promos = [promo([{ key: 'Web', milestones: [ms({ deadline: '2020-01-01' })] }])]
    const colorMap = new Map([['Web', '#000']])
    expect(flattenMilestones(promos, colorMap, false).length).toBe(1)
  })

  it('sorts by deadline ascending', () => {
    const promos = [promo([{ key: 'Web', milestones: [
      ms({ id: 2, deadline: '2099-12-31' }),
      ms({ id: 1, deadline: '2099-06-01' }),
    ]}])]
    const colorMap = new Map([['Web', '#000']])
    const result = flattenMilestones(promos, colorMap)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
  })

  it('defaults to #6366F1 (indigo landing) for unknown project', () => {
    const promos = [promo([{ key: 'Unknown', milestones: [ms({ deadline: '2099-01-01' })] }])]
    const colorMap = new Map<string, string>()
    const result = flattenMilestones(promos, colorMap)
    expect(result[0].color).toBe('#6366F1')
  })
})

// ═══════════════════════════════════════════
//  groupByDay
// ═══════════════════════════════════════════
describe('groupByDay', () => {
  function enriched(overrides: Partial<EnrichedMilestone> = {}): EnrichedMilestone {
    return { id: 1, title: 'TP', type: 'livrable', deadline: '2030-06-01T10:00:00Z', published: true, done: false, projectKey: 'Web', projectLabel: 'Web', color: '#000', ...overrides }
  }

  it('groups milestones on same date', () => {
    const milestones = [
      enriched({ id: 1, deadline: '2030-06-01T08:00:00Z' }),
      enriched({ id: 2, deadline: '2030-06-01T14:00:00Z' }),
      enriched({ id: 3, deadline: '2030-06-02T10:00:00Z' }),
    ]
    const groups = groupByDay(milestones)
    expect(groups.length).toBe(2)
    expect(groups[0].items.length).toBe(2)
    expect(groups[1].items.length).toBe(1)
  })

  it('returns empty for no milestones', () => {
    expect(groupByDay([]).length).toBe(0)
  })

  it('single milestone per day = single item group', () => {
    const groups = groupByDay([enriched()])
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(1)
    expect(groups[0].hasMultipleProjects).toBe(false)
  })

  it('detects multiple projects in same day', () => {
    const milestones = [
      enriched({ id: 1, deadline: '2030-06-01T10:00:00Z', projectKey: 'Web' }),
      enriched({ id: 2, deadline: '2030-06-01T10:00:00Z', projectKey: 'Data' }),
    ]
    const groups = groupByDay(milestones)
    expect(groups[0].hasMultipleProjects).toBe(true)
  })

  it('uses first item color as mainColor', () => {
    const milestones = [
      enriched({ id: 1, deadline: '2030-06-01T10:00:00Z', color: '#FF0000' }),
      enriched({ id: 2, deadline: '2030-06-01T10:00:00Z', color: '#00FF00' }),
    ]
    const groups = groupByDay(milestones)
    expect(groups[0].mainColor).toBe('#FF0000')
  })

  it('sorts groups by deadline', () => {
    const milestones = [
      enriched({ id: 2, deadline: '2030-07-01T10:00:00Z' }),
      enriched({ id: 1, deadline: '2030-06-01T10:00:00Z' }),
    ]
    const groups = groupByDay(milestones)
    expect(groups[0].dateKey).toBe('2030-06-01')
    expect(groups[1].dateKey).toBe('2030-07-01')
  })
})

// ═══════════════════════════════════════════
//  positionGroups
// ═══════════════════════════════════════════
describe('positionGroups', () => {
  function dayGroup(dateKey: string, deadline: string): DayGroup {
    return { dateKey, deadline, items: [], mainColor: '#000', hasMultipleProjects: false }
  }

  it('calculates pct from milestoneLeftFn', () => {
    const groups = [dayGroup('2030-06-01', '2030-06-01')]
    const fn = () => '42%'
    const result = positionGroups(groups, fn)
    expect(result[0].pct).toBe(42)
  })

  it('offsets close groups vertically', () => {
    const groups = [
      dayGroup('2030-06-01', '2030-06-01'),
      dayGroup('2030-06-02', '2030-06-02'),
    ]
    // Both at same position
    const fn = () => '50%'
    const result = positionGroups(groups, fn)
    // First stays at 0, second gets offset
    expect(result[0].offsetY).toBe(0)
    expect(result[1].offsetY).not.toBe(0)
  })

  it('resets offset when groups are far apart', () => {
    const groups = [
      dayGroup('2030-01-01', '2030-01-01'),
      dayGroup('2030-12-31', '2030-12-31'),
    ]
    let call = 0
    const fn = () => { call++; return call === 1 ? '10%' : '90%' }
    const result = positionGroups(groups, fn)
    expect(result[0].offsetY).toBe(0)
    expect(result[1].offsetY).toBe(0)
  })

  it('handles empty groups', () => {
    expect(positionGroups([], () => '0%')).toEqual([])
  })

  it('sorts by position', () => {
    const groups = [
      dayGroup('2030-12-01', '2030-12-01'),
      dayGroup('2030-01-01', '2030-01-01'),
    ]
    let call = 0
    const fn = () => { call++; return call === 1 ? '80%' : '20%' }
    const result = positionGroups(groups, fn)
    expect(result[0].pct).toBeLessThan(result[1].pct)
  })
})
