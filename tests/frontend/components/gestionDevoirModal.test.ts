/**
 * Tests unitaires pour la logique extraite de GestionDevoirModal :
 * - Calcul du statut du devoir
 * - Distribution des notes
 * - Liste unifiee rendus/en attente
 * - Parsing de la description structuree
 * - Meta extraction (salle, duree, session, etc.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Devoir, Depot } from '@/types'

// ── Helpers reproduisant la logique des composants ────────────────────────────

function computeDevoirStatus(
  travail: Pick<Devoir, 'is_published' | 'deadline'>,
  counts: { submitted: number; total: number },
) {
  if (!travail.is_published) return { label: 'Brouillon', cls: 'status-draft' }
  if (counts.total > 0 && counts.submitted >= counts.total) return { label: 'Complet', cls: 'status-complete' }
  if (new Date(travail.deadline).getTime() < Date.now()) return { label: 'Expire', cls: 'status-expired' }
  return { label: 'Publie', cls: 'status-published' }
}

function computeGradeDistribution(depots: Pick<Depot, 'note'>[]) {
  const GRADE_ORDER = ['A', 'B', 'C', 'D', 'NA']
  const counts: Record<string, number> = {}
  for (const d of depots) {
    if (d.note) counts[d.note] = (counts[d.note] ?? 0) + 1
  }
  return GRADE_ORDER.filter(g => counts[g]).map(g => ({ grade: g, count: counts[g] }))
}

function computeDepotsCounts(depots: Pick<Depot, 'submitted_at' | 'note'>[]) {
  const submitted = depots.filter(d => d.submitted_at)
  return {
    submitted: submitted.length,
    noted: depots.filter(d => d.note != null).length,
    pending: depots.filter(d => !d.submitted_at).length,
    total: depots.length,
  }
}

function parseDevoirDescription(desc: string | null) {
  if (!desc) return null
  const fields: { label: string; value: string; iconKey: string }[] = []
  const sessionMatch = desc.match(/\*\*Session\s+(\w+)\*\*/)
  if (sessionMatch) fields.push({ label: 'Session', value: sessionMatch[1], iconKey: 'calendar' })
  const dureeMatch = desc.match(/Durée\s*:\s*(\d+)\s*min/i)
  if (dureeMatch) fields.push({ label: 'Duree', value: dureeMatch[1] + ' min', iconKey: 'clock' })
  const formatMatch = desc.match(/Format\s*:\s*(.+)/i)
  if (formatMatch) fields.push({ label: 'Format', value: formatMatch[1].trim(), iconKey: 'filetext' })
  if (/Calculatrice autorisée/i.test(desc)) fields.push({ label: 'Calculatrice', value: 'Autorisee', iconKey: 'calculator' })
  else if (/Calculatrice non/i.test(desc)) fields.push({ label: 'Calculatrice', value: 'Non autorisee', iconKey: 'calculator' })
  const resMatch = desc.match(/(?:Aucune ressource|Ressources?\s*:\s*(.+))/i)
  if (resMatch) fields.push({ label: 'Ressources', value: resMatch[1] || 'Aucune', iconKey: 'bookopen' })
  const salleMatch = desc.match(/Salle\s*:\s*(.+)/i)
  if (salleMatch) fields.push({ label: 'Salle', value: salleMatch[1].trim(), iconKey: 'mappin' })
  return fields.length > 0 ? fields : null
}

function extractDevoirMeta(desc: string, room: string | null, aavs: string | null, type: string) {
  return {
    salle:        desc.match(/Salle\s*:\s*(.+)/i)?.[1]?.trim() ?? room ?? null,
    duree:        desc.match(/Durée\s*:\s*(\d+)\s*min/i)?.[1] ?? null,
    session:      desc.match(/\*\*Session\s+(\w+)\*\*/)?.[1] ?? null,
    calculatrice: /Calculatrice autorisée/i.test(desc),
    ressources:   desc.match(/Ressources?\s*:\s*(.+)/i)?.[1]?.trim() ?? (/Aucune ressource/i.test(desc) ? 'Aucune' : null),
    aavs,
    isEvent:      type === 'soutenance' || type === 'cctl' || type === 'etude_de_cas',
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeDevoirStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns Brouillon when not published', () => {
    const result = computeDevoirStatus(
      { is_published: false, deadline: '2026-04-15T23:59:00Z' },
      { submitted: 0, total: 10 },
    )
    expect(result).toEqual({ label: 'Brouillon', cls: 'status-draft' })
  })

  it('returns Complet when all submitted', () => {
    const result = computeDevoirStatus(
      { is_published: true, deadline: '2026-04-15T23:59:00Z' },
      { submitted: 10, total: 10 },
    )
    expect(result).toEqual({ label: 'Complet', cls: 'status-complete' })
  })

  it('returns Expire when deadline passed', () => {
    const result = computeDevoirStatus(
      { is_published: true, deadline: '2026-03-28T23:59:00Z' },
      { submitted: 5, total: 10 },
    )
    expect(result).toEqual({ label: 'Expire', cls: 'status-expired' })
  })

  it('returns Publie when active and incomplete', () => {
    const result = computeDevoirStatus(
      { is_published: true, deadline: '2026-04-15T23:59:00Z' },
      { submitted: 5, total: 10 },
    )
    expect(result).toEqual({ label: 'Publie', cls: 'status-published' })
  })

  it('Complet takes priority over Expire', () => {
    const result = computeDevoirStatus(
      { is_published: true, deadline: '2026-03-28T23:59:00Z' },
      { submitted: 10, total: 10 },
    )
    expect(result).toEqual({ label: 'Complet', cls: 'status-complete' })
  })

  it('Brouillon takes priority over everything', () => {
    const result = computeDevoirStatus(
      { is_published: false, deadline: '2026-03-28T23:59:00Z' },
      { submitted: 10, total: 10 },
    )
    expect(result).toEqual({ label: 'Brouillon', cls: 'status-draft' })
  })
})

describe('computeGradeDistribution', () => {
  it('counts grades in correct order', () => {
    const depots = [
      { note: 'A' }, { note: 'A' }, { note: 'B' },
      { note: 'C' }, { note: 'D' }, { note: null },
    ]
    expect(computeGradeDistribution(depots)).toEqual([
      { grade: 'A', count: 2 },
      { grade: 'B', count: 1 },
      { grade: 'C', count: 1 },
      { grade: 'D', count: 1 },
    ])
  })

  it('returns empty array when no grades', () => {
    expect(computeGradeDistribution([{ note: null }, { note: null }])).toEqual([])
  })

  it('handles NA grades', () => {
    const depots = [{ note: 'NA' }, { note: 'A' }]
    expect(computeGradeDistribution(depots)).toEqual([
      { grade: 'A', count: 1 },
      { grade: 'NA', count: 1 },
    ])
  })
})

describe('computeDepotsCounts', () => {
  it('correctly counts submitted, noted, pending', () => {
    const depots = [
      { submitted_at: '2026-03-20T10:00:00Z', note: 'A' },
      { submitted_at: '2026-03-21T10:00:00Z', note: null },
      { submitted_at: null, note: null },
      { submitted_at: null, note: null },
    ] as Pick<Depot, 'submitted_at' | 'note'>[]

    const result = computeDepotsCounts(depots)
    expect(result).toEqual({ submitted: 2, noted: 1, pending: 2, total: 4 })
  })

  it('handles empty depot list', () => {
    expect(computeDepotsCounts([])).toEqual({ submitted: 0, noted: 0, pending: 0, total: 0 })
  })
})

describe('parseDevoirDescription', () => {
  it('parses structured CCTL description', () => {
    const desc = '**Session Initiale**\nDurée : 30 min\nFormat : QCM\nCalculatrice autorisée\nAucune ressource\nSalle : B204'
    const result = parseDevoirDescription(desc)!
    expect(result).toHaveLength(6)
    expect(result[0]).toEqual({ label: 'Session', value: 'Initiale', iconKey: 'calendar' })
    expect(result[1]).toEqual({ label: 'Duree', value: '30 min', iconKey: 'clock' })
    expect(result[2]).toEqual({ label: 'Format', value: 'QCM', iconKey: 'filetext' })
    expect(result[3]).toEqual({ label: 'Calculatrice', value: 'Autorisee', iconKey: 'calculator' })
    expect(result[4]).toEqual({ label: 'Ressources', value: 'Aucune', iconKey: 'bookopen' })
    expect(result[5]).toEqual({ label: 'Salle', value: 'B204', iconKey: 'mappin' })
  })

  it('returns null for empty description', () => {
    expect(parseDevoirDescription(null)).toBeNull()
    expect(parseDevoirDescription('')).toBeNull()
  })

  it('returns null for unstructured description', () => {
    expect(parseDevoirDescription('Juste un texte libre sans structure')).toBeNull()
  })

  it('parses partial descriptions', () => {
    const result = parseDevoirDescription('Salle : A102')!
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Salle')
    expect(result[0].value).toBe('A102')
  })

  it('detects non-authorized calculator', () => {
    const result = parseDevoirDescription('Calculatrice non autorisée')!
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('Non autorisee')
  })
})

describe('extractDevoirMeta', () => {
  it('extracts all meta from structured description', () => {
    const desc = '**Session Rattrapage**\nDurée : 45 min\nSalle : C301\nCalculatrice autorisée\nRessources : Notes de cours'
    const meta = extractDevoirMeta(desc, null, 'AAV1\nAAV2', 'cctl')
    expect(meta.salle).toBe('C301')
    expect(meta.duree).toBe('45')
    expect(meta.session).toBe('Rattrapage')
    expect(meta.calculatrice).toBe(true)
    expect(meta.ressources).toBe('Notes de cours')
    expect(meta.aavs).toBe('AAV1\nAAV2')
    expect(meta.isEvent).toBe(true)
  })

  it('falls back to room prop when no salle in description', () => {
    const meta = extractDevoirMeta('Texte libre', 'B204', null, 'livrable')
    expect(meta.salle).toBe('B204')
    expect(meta.isEvent).toBe(false)
  })

  it('identifies event types correctly', () => {
    expect(extractDevoirMeta('', null, null, 'soutenance').isEvent).toBe(true)
    expect(extractDevoirMeta('', null, null, 'cctl').isEvent).toBe(true)
    expect(extractDevoirMeta('', null, null, 'etude_de_cas').isEvent).toBe(true)
    expect(extractDevoirMeta('', null, null, 'livrable').isEvent).toBe(false)
    expect(extractDevoirMeta('', null, null, 'memoire').isEvent).toBe(false)
  })

  it('detects "Aucune ressource" as explicit value', () => {
    const meta = extractDevoirMeta('Aucune ressource', null, null, 'cctl')
    expect(meta.ressources).toBe('Aucune')
  })
})
