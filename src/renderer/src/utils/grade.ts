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

/** Retourne la couleur CSS correspondant a la note */
export function gradeColor(note: string): string {
  const letter = note.trim().toUpperCase().charAt(0)
  if (letter === 'A') return '#4ade80'
  if (letter === 'B') return '#60a5fa'
  if (letter === 'C') return '#f59e0b'
  if (letter === 'D') return '#ef4444'
  return 'var(--text-muted)'
}
