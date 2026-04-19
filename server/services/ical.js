/**
 * Generation de fichiers iCalendar (.ics) conformes RFC 5545.
 * Partage entre la route JWT (/api/calendar/feed.ics) et la route publique
 * par token (/ical/:token.ics). Dates invalides ignorees silencieusement
 * plutot que d'emettre `NaNNaNNaN` (hardening v2.157.2).
 */
const queries = require('../db/index')
const log     = require('../utils/logger')

function escapeIcal(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

// RFC 5545 exige des lignes <= 75 octets avec continuation par CRLF + espace.
// On itere par codepoint (et non par octet) pour ne pas couper un caractere
// UTF-8 multi-octets au milieu — sinon l'iCal contient des U+FFFD en sortie.
function foldLine(line, max = 75) {
  if (Buffer.byteLength(line, 'utf8') <= max) return line
  const chunks = []
  let cur = ''
  let curBytes = 0
  for (const cp of line) {
    const b = Buffer.byteLength(cp, 'utf8')
    if (curBytes + b > max) {
      chunks.push(cur)
      cur = cp
      curBytes = b
    } else {
      cur += cp
      curBytes += b
    }
  }
  if (cur) chunks.push(cur)
  return chunks.join('\r\n ')
}

function formatIcalDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function formatIcalTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function generateIcal(events, calendarName) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cursus//Calendrier//FR',
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  const stamp = formatIcalTimestamp(new Date())

  for (const ev of events) {
    const dtstart = formatIcalDate(ev.date)
    if (!dtstart) continue
    const uid = `${ev.type}-${ev.id}@cursus.school`
    const summary = escapeIcal(ev.title || 'Sans titre')
    const description = escapeIcal(ev.description || '')
    const category = ev.category ? escapeIcal(ev.category) : ''

    lines.push('BEGIN:VEVENT')
    lines.push(foldLine(`UID:${uid}`))
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
    lines.push(`DTEND;VALUE=DATE:${dtstart}`)
    lines.push(foldLine(`SUMMARY:${summary}`))
    if (description) lines.push(foldLine(`DESCRIPTION:${description}`))
    if (category) lines.push(foldLine(`CATEGORIES:${category}`))
    lines.push(`DTSTAMP:${stamp}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function collectEvents(user) {
  const events = []

  try {
    if (user?.type === 'student') {
      const travaux = queries.getStudentTravaux(user.id) || []
      for (const t of travaux) {
        if (t.deadline) {
          events.push({ type: 'deadline', id: t.id, date: t.deadline, title: `[Echeance] ${t.title}`, description: t.description || '', category: t.category })
        }
      }
    } else {
      const schedule = queries.getTeacherSchedule() || []
      for (const t of schedule) {
        if (t.deadline) {
          events.push({ type: 'deadline', id: t.id, date: t.deadline, title: `[Echeance] ${t.title}`, description: '', category: t.category })
        }
      }
    }
  } catch (err) {
    log.warn('calendar_collect_events_error', { error: err.message })
  }

  try {
    const reminders = queries.getReminders(null) || []
    for (const r of reminders) {
      events.push({ type: 'reminder', id: r.id, date: r.date, title: `[Rappel] ${r.title}`, description: r.description || '', category: r.bloc })
    }
  } catch (err) {
    log.warn('calendar_collect_reminders_error', { error: err.message })
  }

  return events
}

module.exports = { generateIcal, collectEvents, escapeIcal, foldLine }
