/**
 * Utilitaires de coloration des notes (A-D).
 * Centralise la logique dupliquee entre WidgetGrades et WidgetLastFeedback.
 */

/** Retourne la classe CSS correspondant a la note (grade--green, grade--blue, etc.) */
export function gradeBadgeClass(note: string): string {
  const letter = note.trim().toUpperCase().charAt(0)
  if (letter === 'A') return 'grade--green'
  if (letter === 'B') return 'grade--blue'
  if (letter === 'C') return 'grade--orange'
  return 'grade--red'
}

/** Retourne la couleur CSS correspondant a la note lettre */
export function gradeColor(note: string): string {
  const letter = note.trim().toUpperCase().charAt(0)
  if (letter === 'A') return '#4ade80'
  if (letter === 'B') return '#60a5fa'
  if (letter === 'C') return '#f59e0b'
  if (letter === 'D') return '#ef4444'
  return 'var(--text-muted)'
}

/** Retourne la classe CSS pour une note numerique (barreme /20) */
export function numericGradeClass(note: string | null | undefined): string {
  const n = parseFloat(note ?? '')
  if (isNaN(n)) return 'grade-letter'
  if (n >= 16) return 'grade-a'
  if (n >= 12) return 'grade-b'
  if (n >= 8) return 'grade-c'
  return 'grade-d'
}
