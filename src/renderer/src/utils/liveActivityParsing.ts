/**
 * Parsers purs pour extraire les champs structures d'une LiveActivity
 * stockee en DB (options / correct_answers serialises en JSON). Chaque
 * helper retourne des valeurs par defaut en cas d'activite absente, de
 * type inattendu ou de JSON invalide — pas d'exception levee.
 *
 * Les valeurs par defaut sont alignees sur les defaults du form.
 */
import type { LiveActivity } from '@/types'

function tryParse<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  try {
    const v = JSON.parse(raw as string)
    return v as T
  } catch {
    return fallback
  }
}

/** QCM : options libellees (fallback 2 chaines vides). */
export function parseOptions(data?: LiveActivity | null): string[] {
  if (!data?.options) return ['', '']
  const arr = tryParse<unknown>(data.options, null)
  return Array.isArray(arr) ? (arr as string[]) : ['', '']
}

/** QCM : indices des bonnes reponses (fallback []). */
export function parseCorrectAnswers(data?: LiveActivity | null): number[] {
  if (!data?.correct_answers) return []
  const arr = tryParse<unknown>(data.correct_answers, null)
  return Array.isArray(arr) ? (arr as number[]) : []
}

/** Reponse courte : liste des reponses acceptees (fallback [""]). */
export function parseAcceptedAnswers(data?: LiveActivity | null): string[] {
  if (!data || data.type !== 'reponse_courte' || !data.correct_answers) return ['']
  const arr = tryParse<unknown>(data.correct_answers, null)
  return Array.isArray(arr) ? (arr as string[]) : ['']
}

/** Vrai/Faux : 0 pour Vrai, 1 pour Faux (fallback 0). */
export function parseVraiFauxCorrect(data?: LiveActivity | null): 0 | 1 {
  if (!data || data.type !== 'vrai_faux' || !data.correct_answers) return 0
  const arr = tryParse<unknown[]>(data.correct_answers, [])
  return arr[0] === 1 ? 1 : 0
}

/** Association : paires { left, right } (fallback 2 paires vides). */
export function parsePairs(data?: LiveActivity | null): { left: string; right: string }[] {
  const fallback = [{ left: '', right: '' }, { left: '', right: '' }]
  if (!data || data.type !== 'association' || !data.correct_answers) return fallback
  const arr = tryParse<unknown>(data.correct_answers, null)
  return Array.isArray(arr) ? (arr as { left: string; right: string }[]) : fallback
}

/** Estimation : cible + marge (fallback vide + 0). */
export function parseEstimation(data?: LiveActivity | null): { target: string; margin: string } {
  if (!data || data.type !== 'estimation' || !data.correct_answers) return { target: '', margin: '0' }
  const obj = tryParse<{ target?: unknown; margin?: unknown }>(data.correct_answers, {})
  return {
    target: String(obj.target ?? ''),
    margin: String(obj.margin ?? '0'),
  }
}

/** Texte a trous : texte complet + liste des mots {{...}} extraits. */
export function parseTexteATrous(data?: LiveActivity | null): { text: string; blanks: string[] } {
  if (!data || data.type !== 'texte_a_trous') return { text: '', blanks: [] }
  const text = data.title ?? ''
  const blanks = tryParse<unknown>(data.correct_answers, [])
  return { text, blanks: Array.isArray(blanks) ? (blanks as string[]) : [] }
}

/** Options Pulse (sondage, priorite, matrice) — fallback 2 chaines vides. */
export function parsePulseOptions(data?: LiveActivity | null): string[] {
  if (!data?.options) return ['', '']
  const arr = tryParse<unknown>(data.options, null)
  return Array.isArray(arr) ? (arr as string[]) : ['', '']
}

/** Board : colonnes (fallback aux 3 colonnes classiques). */
export function parseBoardColumns(data?: LiveActivity | null): string[] {
  const fallback = ['Idees', 'A approfondir', 'A ecarter']
  if (!data || data.type !== 'board' || !data.options) return fallback
  const arr = tryParse<unknown>(data.options, null)
  return Array.isArray(arr) ? (arr as string[]) : fallback
}
