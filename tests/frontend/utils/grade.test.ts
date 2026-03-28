import { describe, it, expect } from 'vitest'
import { gradeBadgeClass, gradeColor } from '../../../src/renderer/src/utils/grade'

describe('gradeBadgeClass', () => {
  it('returns grade--green for A', () => {
    expect(gradeBadgeClass('A')).toBe('grade--green')
  })

  it('returns grade--blue for B', () => {
    expect(gradeBadgeClass('B')).toBe('grade--blue')
  })

  it('returns grade--orange for C', () => {
    expect(gradeBadgeClass('C')).toBe('grade--orange')
  })

  it('returns grade--red for D', () => {
    expect(gradeBadgeClass('D')).toBe('grade--red')
  })

  it('returns grade--red for unknown letter', () => {
    expect(gradeBadgeClass('F')).toBe('grade--red')
  })

  it('handles lowercase input', () => {
    expect(gradeBadgeClass('a')).toBe('grade--green')
    expect(gradeBadgeClass('b')).toBe('grade--blue')
  })

  it('handles whitespace around input', () => {
    expect(gradeBadgeClass(' A ')).toBe('grade--green')
    expect(gradeBadgeClass('  C')).toBe('grade--orange')
  })

  it('handles full grade strings like "A+"', () => {
    expect(gradeBadgeClass('A+')).toBe('grade--green')
    expect(gradeBadgeClass('B-')).toBe('grade--blue')
  })
})

describe('gradeColor', () => {
  it('returns green hex for A', () => {
    expect(gradeColor('A')).toBe('#4ade80')
  })

  it('returns blue hex for B', () => {
    expect(gradeColor('B')).toBe('#60a5fa')
  })

  it('returns orange hex for C', () => {
    expect(gradeColor('C')).toBe('#f59e0b')
  })

  it('returns red hex for D', () => {
    expect(gradeColor('D')).toBe('#ef4444')
  })

  it('returns muted CSS var for unknown grade', () => {
    expect(gradeColor('Z')).toBe('var(--text-muted)')
  })

  it('handles lowercase', () => {
    expect(gradeColor('a')).toBe('#4ade80')
  })

  it('handles whitespace', () => {
    expect(gradeColor(' B ')).toBe('#60a5fa')
  })
})
