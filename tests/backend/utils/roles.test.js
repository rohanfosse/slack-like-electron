const { safeAuthorType, safeUserType } = require('../../../server/utils/roles')

describe('safeAuthorType', () => {
  it.each([
    ['student', 'student'],
    ['teacher', 'teacher'],
    ['ta',      'teacher'],
    ['admin',   'teacher'],
  ])('maps %s to %s', (input, expected) => {
    expect(safeAuthorType(input)).toBe(expected)
  })

  it('throws on unknown type', () => {
    expect(() => safeAuthorType('hacker')).toThrow('Type utilisateur invalide')
    expect(() => safeAuthorType('')).toThrow()
    expect(() => safeAuthorType(undefined)).toThrow()
  })
})

describe('safeUserType', () => {
  it.each([
    ['admin',   'admin'],
    ['teacher', 'teacher'],
    ['ta',      'ta'],
    ['student', 'student'],
  ])('preserves valid type %s', (input, expected) => {
    expect(safeUserType(input)).toBe(expected)
  })

  it('falls back to teacher for unknown type', () => {
    expect(safeUserType('unknown')).toBe('teacher')
    expect(safeUserType('')).toBe('teacher')
    expect(safeUserType(undefined)).toBe('teacher')
  })
})
