import { describe, expect, it } from 'vitest'
import { parseKahootCsv } from '@/composables/useKahootCsv'

describe('parseKahootCsv', () => {
  it('parses a Kahoot-style CSV with header', () => {
    const csv = `Question;Reponse1;Reponse2;Reponse3;Reponse4;Temps;Bonne reponse
Capitale de la France ?;Paris;Londres;Rome;Berlin;20;1
2+2 = ?;3;4;5;6;10;2`
    const { rows, errors, separator } = parseKahootCsv(csv)
    expect(separator).toBe(';')
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0].question).toBe('Capitale de la France ?')
    expect(rows[0].answers).toEqual(['Paris', 'Londres', 'Rome', 'Berlin'])
    expect(rows[0].timerSeconds).toBe(20)
    expect(rows[0].correctIndices).toEqual([0])
    expect(rows[1].correctIndices).toEqual([1])
    expect(rows[1].timerSeconds).toBe(10)
  })

  it('supports multiple correct answers "1,3"', () => {
    const csv = `Question;A;B;C;D;Temps;Bonne reponse
Lesquels sont pairs ?;2;3;4;5;30;"1,3"`
    const { rows, errors } = parseKahootCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows[0].correctIndices).toEqual([0, 2])
  })

  it('detects comma separator if more present', () => {
    const csv = `Question,A,B,Temps,Bonne reponse
Q,X,Y,20,1`
    const { rows, separator, errors } = parseKahootCsv(csv)
    expect(separator).toBe(',')
    expect(errors).toHaveLength(0)
    expect(rows[0].answers).toEqual(['X', 'Y'])
    expect(rows[0].correctIndices).toEqual([0])
  })

  it('flags rows with invalid correct index', () => {
    const csv = `Question;A;B;Temps;Bonne reponse
Q;X;Y;30;5`
    const { rows, errors } = parseKahootCsv(csv)
    expect(rows).toHaveLength(0)
    expect(errors[0].message).toMatch(/Bonne reponse invalide/)
  })

  it('flags rows with fewer than 2 non-empty answers', () => {
    const csv = `Question;A;B;C;D;Temps;Bonne reponse
Q;Seule;;;;30;1`
    const { rows, errors } = parseKahootCsv(csv)
    expect(rows).toHaveLength(0)
    expect(errors[0].message).toMatch(/deux reponses/)
  })

  it('snaps timer to the nearest allowed value', () => {
    const csv = `Question;A;B;Temps;Bonne reponse
Q;X;Y;17;1`
    const { rows } = parseKahootCsv(csv)
    expect(rows[0].timerSeconds).toBe(15) // 17 closer to 15 than 20
  })

  it('handles rows without explicit timer/correct (fallback to 30s, first correct)', () => {
    const csv = `Question;A;B;C
Q;X;Y;Z`
    const { rows, errors } = parseKahootCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows[0].timerSeconds).toBe(30)
    expect(rows[0].correctIndices).toEqual([0])
  })

  it('handles quoted fields with embedded semicolons', () => {
    const csv = `Question;A;B;Temps;Bonne reponse
"Est-ce que 1 < 2 ; vrai ?";Oui;Non;20;1`
    const { rows } = parseKahootCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].question).toBe('Est-ce que 1 < 2 ; vrai ?')
  })

  it('returns empty result on empty file', () => {
    const { rows, errors } = parseKahootCsv('')
    expect(rows).toHaveLength(0)
    expect(errors[0].message).toMatch(/vide/)
  })
})
