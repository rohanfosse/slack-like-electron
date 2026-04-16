/**
 * bookingDate.ts — Shared date formatting utilities for booking UI.
 * Used by both useBooking (teacher) and usePublicBooking (tutor).
 */

/** Format an ISO date string to a short French date (e.g. "lun. 15 avr.") */
export function formatBookingDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Format an ISO datetime to a full French date (e.g. "lundi 15 avril 2026") */
export function formatBookingFullDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Extract HH:MM from a time string or ISO datetime */
export function formatBookingTime(timeStr: string): string {
  if (!timeStr) return ''
  // If it looks like an ISO datetime, extract the time
  if (timeStr.includes('T')) {
    const d = new Date(timeStr)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return timeStr.slice(0, 5)
}

/** Get the Monday of a given week offset from today */
export function getWeekStart(weekOffset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
