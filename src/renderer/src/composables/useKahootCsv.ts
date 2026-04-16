/**
 * Parseur CSV Kahoot-style pour import en masse de questions QCM.
 *
 * Format attendu (separateur ; ou ,) :
 *   Question;Reponse1;Reponse2;Reponse3;Reponse4;Temps;Bonne reponse
 *
 * - Question : le texte (obligatoire)
 * - Reponse1..4 : au moins 2 non vides (obligatoire)
 * - Temps : entier secondes (defaut 30 ; accepte 10,20,30,60,90,120)
 * - Bonne reponse : index 1-based parmi les 4. Plusieurs possibles via "1,3" ou "1|3"
 *
 * La ligne d'en-tete est detectee automatiquement (si la premiere colonne
 * correspond a "question" sans accent et insensible a la casse).
 */

export interface KahootRow {
  question: string
  answers: string[]
  timerSeconds: number
  correctIndices: number[]
}

export interface KahootParseResult {
  rows: KahootRow[]
  errors: { line: number; message: string }[]
  separator: ';' | ','
}

const ALLOWED_TIMERS = [10, 15, 20, 30, 45, 60, 90, 120]

function detectSeparator(text: string): ';' | ',' {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  return (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
}

/** Split CSV line respectant les guillemets (simple, suffisant pour Kahoot-style). */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function isHeaderLine(cells: string[]): boolean {
  const first = (cells[0] ?? '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return first === 'question' || first === 'questions'
}

function parseCorrect(raw: string, answersCount: number): number[] | null {
  const parts = raw.split(/[,|]/).map(p => p.trim()).filter(Boolean)
  if (!parts.length) return null
  const indices: number[] = []
  for (const p of parts) {
    const n = Number(p)
    if (!Number.isInteger(n) || n < 1 || n > answersCount) return null
    indices.push(n - 1)
  }
  return Array.from(new Set(indices))
}

function normalizeTimer(raw: string): number {
  const n = Number(String(raw).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return 30
  // Snap au plus proche autorise pour coller a l'UI existante
  let best = ALLOWED_TIMERS[0]
  let bestDiff = Math.abs(n - best)
  for (const t of ALLOWED_TIMERS) {
    const d = Math.abs(n - t)
    if (d < bestDiff) { best = t; bestDiff = d }
  }
  return best
}

export function parseKahootCsv(text: string): KahootParseResult {
  const errors: { line: number; message: string }[] = []
  const rows: KahootRow[] = []
  const separator = detectSeparator(text)

  const lines = text.split(/\r?\n/)
    .map((l, i) => ({ raw: l, lineNo: i + 1 }))
    .filter(({ raw }) => raw.trim().length > 0)

  if (!lines.length) {
    errors.push({ line: 0, message: 'Fichier vide.' })
    return { rows, errors, separator }
  }

  let startIdx = 0
  const firstCells = splitCsvLine(lines[0].raw, separator)
  if (isHeaderLine(firstCells)) startIdx = 1

  for (let i = startIdx; i < lines.length; i++) {
    const { raw, lineNo } = lines[i]
    const cells = splitCsvLine(raw, separator)
    if (cells.length < 3) {
      errors.push({ line: lineNo, message: 'Ligne trop courte (attend question + reponses).' })
      continue
    }
    const question = cells[0].trim()
    if (!question) {
      errors.push({ line: lineNo, message: 'Question vide.' })
      continue
    }
    // Heuristique : si on a au moins 4 cellules ET que les 2 dernieres ressemblent a
    // timer (numerique pur) + bonne reponse (index ou liste d'index), on les extrait.
    // Sinon tout ce qui suit la question est considere comme reponses.
    const tail1 = cells[cells.length - 1] ?? ''
    const tail2 = cells[cells.length - 2] ?? ''
    const looksLikeCorrect = /^\s*\d+(\s*[,|]\s*\d+)*\s*$/.test(tail1)
    const looksLikeTimer = /^\s*\d+\s*s?\s*$/.test(tail2)
    const hasTimerAndCorrect = cells.length >= 4 && looksLikeTimer && looksLikeCorrect

    const rawAnswers = hasTimerAndCorrect
      ? cells.slice(1, cells.length - 2)
      : cells.slice(1)
    const answers = rawAnswers.map(a => a.trim()).filter(Boolean).slice(0, 4)
    if (answers.length < 2) {
      errors.push({ line: lineNo, message: 'Au moins deux reponses non vides sont requises.' })
      continue
    }

    const timerRaw = hasTimerAndCorrect ? tail2 : '30'
    const correctRaw = hasTimerAndCorrect ? tail1 : '1'

    const timerSeconds = normalizeTimer(timerRaw)
    const correctIndices = parseCorrect(correctRaw, answers.length)
    if (!correctIndices) {
      errors.push({ line: lineNo, message: `Bonne reponse invalide (attend un index 1-${answers.length}, ex: "1" ou "1,3").` })
      continue
    }

    rows.push({
      question: question.slice(0, 200),
      answers: answers.map(a => a.slice(0, 100)),
      timerSeconds,
      correctIndices,
    })
  }

  return { rows, errors, separator }
}
