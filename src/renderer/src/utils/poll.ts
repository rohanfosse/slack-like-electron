/**
 * Sondages embarques dans messages.content.
 *
 * Format : la premiere ligne du message contient un marqueur JSON :
 *   ::poll::{"v":1,"q":"...","o":["A","B"],"multi":false,"anon":false}
 *
 * Les votes ne vivent PAS dans content : ils sont persistes cote serveur
 * dans la colonne messages.poll_votes (JSON) et remontes via le payload
 * message (champ optionnel `poll_votes`).
 *
 * Le parsing est tolerant : un JSON invalide retourne null et le message
 * est rendu normalement (le marqueur devient du texte brut).
 */

export const POLL_MARKER = '::poll::'
export const POLL_VERSION = 1
export const POLL_MAX_OPTIONS = 10
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_QUESTION_LEN = 300
export const POLL_MAX_OPTION_LEN = 120

export interface PollDefinition {
  v: number
  q: string
  o: string[]
  multi: boolean
  anon?: boolean
}

export interface PollVotes {
  totals: number[]
  voters: Record<string, number[]>
}

/** Extrait la definition poll si le message commence par le marqueur. */
export function parsePoll(content: string | null | undefined): PollDefinition | null {
  if (!content) return null
  const firstLine = content.split('\n', 1)[0] ?? ''
  if (!firstLine.startsWith(POLL_MARKER)) return null
  const json = firstLine.slice(POLL_MARKER.length).trim()
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const p = parsed as Record<string, unknown>
    if (typeof p.q !== 'string') return null
    if (!Array.isArray(p.o)) return null
    const options = p.o.map((x) => (typeof x === 'string' ? x : String(x))).slice(0, POLL_MAX_OPTIONS)
    if (options.length < POLL_MIN_OPTIONS) return null
    return {
      v: typeof p.v === 'number' ? p.v : POLL_VERSION,
      q: p.q.slice(0, POLL_MAX_QUESTION_LEN),
      o: options,
      multi: !!p.multi,
      anon: !!p.anon,
    }
  } catch {
    return null
  }
}

/** Serialise une definition poll en ligne marqueur + contenu residuel optionnel. */
export function serializePoll(def: PollDefinition, trailing = ''): string {
  const payload: PollDefinition = {
    v: POLL_VERSION,
    q: def.q.slice(0, POLL_MAX_QUESTION_LEN).trim(),
    o: def.o.slice(0, POLL_MAX_OPTIONS).map((s) => s.slice(0, POLL_MAX_OPTION_LEN).trim()).filter(Boolean),
    multi: !!def.multi,
    anon: !!def.anon,
  }
  const head = `${POLL_MARKER}${JSON.stringify(payload)}`
  const tail = trailing.trim()
  return tail ? `${head}\n\n${tail}` : head
}

/** Retire le marqueur de la 1re ligne pour rendre le contenu "humain". */
export function contentWithoutPoll(content: string): string {
  const idx = content.indexOf('\n')
  if (idx < 0) return ''
  return content.slice(idx + 1).replace(/^\n+/, '')
}

/** Total agrege des votes sur un poll. */
export function totalVotes(votes: PollVotes | null | undefined): number {
  if (!votes) return 0
  return votes.totals.reduce((a, b) => a + b, 0)
}

/** Retourne la liste des indices d'options selectionnes par un voter. */
export function voterChoices(votes: PollVotes | null | undefined, userKey: string | number): number[] {
  if (!votes) return []
  const k = String(userKey)
  return Array.isArray(votes.voters[k]) ? votes.voters[k] : []
}
