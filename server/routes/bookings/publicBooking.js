/**
 * Routes publiques Booking (page de reservation tuteur, sans auth Cursus).
 *   GET  /public/:token                   - infos event + student
 *   GET  /public/:token/slots             - creneaux dispos pour une semaine
 *   POST /public/:token/book              - reserve 1 creneau
 *   POST /public/:token/book-recurring    - reserve N semaines identiques
 */
const router  = require('express').Router()
const { z }   = require('zod')
const queries = require('../../db/index')
const { validate } = require('../../middleware/validate')
const wrap    = require('../../utils/wrap')
const log     = require('../../utils/logger')
const graph   = require('../../services/microsoftGraph')
const email   = require('../../services/email')
const { getValidMsToken } = require('../../utils/msToken')
const { generateSlots }   = require('../../utils/slots')
const { secureToken }     = require('../../utils/secureToken')
const { escHtml }         = require('../../utils/escHtml')
const { getDb }           = require('../../db/connection')
const {
  SERVER_URL, GRAPH_TIMEOUT_MS,
  publicBookingLimiter, publicBookingPerTokenLimiter, requireBookingToken,
  withTimeout,
} = require('./_shared')

const bookSchema = z.object({
  tutorName: z.string().min(1).max(200),
  tutorEmail: z.string().email(),
  startDatetime: z.string().datetime(),
})

const bookRecurringSchema = z.object({
  tutorName: z.string().min(1).max(200),
  tutorEmail: z.string().email(),
  startDatetime: z.string().datetime(),
  recurrenceWeeks: z.number().int().min(2).max(12),
})

// Horizon max d'une reservation (empeche les creneaux trop loin)
const MAX_BOOKING_HORIZON_DAYS = 365

// ── GET /public/:token ────────────────────────────────────────────────

router.get('/public/:token', publicBookingLimiter, publicBookingPerTokenLimiter, requireBookingToken, wrap((req) => {
  const data = req.bookingData
  return {
    eventTitle: data.event_title,
    description: data.description,
    durationMinutes: data.duration_minutes,
    teacherName: data.teacher_name,
    studentName: data.student_name,
    color: data.color,
    timezone: data.timezone || 'Europe/Paris',
  }
}))

// ── GET /public/:token/slots ──────────────────────────────────────────

router.get('/public/:token/slots', publicBookingLimiter, publicBookingPerTokenLimiter, requireBookingToken, async (req, res) => {
  try {
    const data = req.bookingData

    const rawOffset = Number(req.query.weekOffset || 0)
    const weekOffset = isNaN(rawOffset) ? 0 : Math.max(0, Math.min(52, Math.round(rawOffset)))
    const now = new Date()
    const dow = now.getDay()
    const daysSinceMonday = dow === 0 ? 6 : dow - 1
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - daysSinceMonday + weekOffset * 7)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const rules = queries.getAvailabilityRules(data.teacher_id)
    const existingBookings = queries.getBookingsForTeacher(
      data.teacher_id,
      { from: startOfWeek.toISOString(), to: endOfWeek.toISOString() },
    )

    let outlookBusy = []
    const msAccessToken = await getValidMsToken(data.teacher_id)
    if (msAccessToken) {
      try {
        outlookBusy = await withTimeout(
          graph.getCalendarBusy(msAccessToken, startOfWeek.toISOString(), endOfWeek.toISOString()),
          GRAPH_TIMEOUT_MS,
          'getCalendarBusy',
        )
      } catch (err) {
        log.warn('Outlook busy fetch failed', { error: err.message })
      }
    }

    const overrides = queries.getAvailabilityOverrides(
      data.event_type_id,
      startOfWeek.toISOString().slice(0, 10),
      endOfWeek.toISOString().slice(0, 10),
    )

    const slots = generateSlots({
      rules,
      bookings: existingBookings,
      outlookBusy,
      overrides,
      durationMinutes: data.duration_minutes,
      bufferMinutes: data.buffer_minutes || 0,
      weekStart: startOfWeek,
    })

    res.json({ ok: true, data: { slots, weekStart: startOfWeek.toISOString().slice(0, 10) } })
  } catch (err) {
    log.warn('slots_error', { error: err.message })
    res.status(400).json({ ok: false, error: 'Erreur lors du chargement des creneaux.' })
  }
})

// ── POST /public/:token/book ──────────────────────────────────────────

router.post('/public/:token/book', publicBookingLimiter, publicBookingPerTokenLimiter, requireBookingToken, validate(bookSchema), async (req, res) => {
  try {
    const data = req.bookingData
    const { tutorName, tutorEmail, startDatetime } = req.body

    const startMs = new Date(startDatetime).getTime()
    const now = Date.now()
    if (startMs < now) return res.status(400).json({ ok: false, error: 'Le creneau est dans le passe.' })
    if (startMs > now + MAX_BOOKING_HORIZON_DAYS * 24 * 3600000) {
      return res.status(400).json({ ok: false, error: 'Le creneau est trop eloigne.' })
    }

    const endDatetime = new Date(startMs + data.duration_minutes * 60000).toISOString()

    const booking = queries.createBookingAtomic({
      eventTypeId: data.event_type_id,
      studentId:   data.student_id,
      teacherId:   data.teacher_id,
      tutorName, tutorEmail,
      startDatetime, endDatetime,
      bufferMinutes: data.buffer_minutes || 0,
    })
    if (!booking) {
      return res.status(409).json({ ok: false, error: 'Ce creneau vient d\'etre reserve. Veuillez en choisir un autre.' })
    }

    // Teams / Outlook (best-effort, wrappe timeout)
    let teamsJoinUrl = data.fallback_visio_url || null
    let outlookEventId = null
    const msAccessToken = await getValidMsToken(data.teacher_id)
    if (msAccessToken) {
      try {
        const result = await withTimeout(graph.createEventWithTeams(msAccessToken, {
          subject: `${escHtml(data.event_title)} - ${escHtml(data.student_name)} / ${escHtml(tutorName)}`,
          startDateTime: startDatetime,
          endDateTime: endDatetime,
          attendees: [
            { email: tutorEmail, name: tutorName },
            { email: data.student_email, name: data.student_name },
          ],
          body: `<p>Rendez-vous ${escHtml(data.event_title)}</p><p>Etudiant : ${escHtml(data.student_name)}</p><p>Tuteur entreprise : ${escHtml(tutorName)}</p>`,
        }), GRAPH_TIMEOUT_MS, 'createEventWithTeams')
        teamsJoinUrl = result.teamsJoinUrl || teamsJoinUrl
        outlookEventId = result.eventId
        if (teamsJoinUrl || outlookEventId) {
          queries.updateBookingTeamsInfo(booking.id, { teamsJoinUrl, outlookEventId })
        }
      } catch (err) {
        log.warn('Teams/Outlook creation failed', { error: err.message })
      }
    }

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${data.teacher_id}`).emit('booking:new', {
        bookingId: booking.id,
        tutorName, studentName: data.student_name,
        eventTitle: data.event_title, startDatetime,
      })
    }

    // Reminders 24h avant (atomique : 2 inserts en tx)
    const reminderAt = new Date(new Date(startDatetime).getTime() - 24 * 3600000).toISOString()
    if (new Date(reminderAt) > new Date()) {
      try {
        getDb().transaction(() => {
          queries.createBookingReminder(booking.id, 'email_tutor_24h', reminderAt)
          queries.createBookingReminder(booking.id, 'email_teacher_24h', reminderAt)
        })()
      } catch (err) {
        log.warn('booking_reminder_insert_failed', { bookingId: booking.id, error: err.message })
      }
    }

    const cancelUrl = `${SERVER_URL}/#/book/cancel/${booking.cancel_token}`
    let emailSent = true
    try {
      await email.sendBookingConfirmation({
        to: tutorEmail, tutorName,
        teacherName: data.teacher_name, studentName: data.student_name,
        eventTitle: data.event_title,
        startDatetime, endDatetime, teamsJoinUrl, cancelUrl,
      })
    } catch (err) {
      emailSent = false
      log.warn('booking_email_failed', { bookingId: booking.id, error: err.message })
    }

    log.info('booking_created', { bookingId: booking.id, teacherId: data.teacher_id, hasTeams: !!teamsJoinUrl })
    res.json({
      ok: true,
      data: { bookingId: booking.id, teamsJoinUrl, startDatetime, endDatetime, emailSent },
    })
  } catch (err) {
    log.warn('booking_error', { error: err.message })
    res.status(400).json({ ok: false, error: 'Erreur lors de la reservation.' })
  }
})

// ── POST /public/:token/book-recurring ────────────────────────────────

router.post('/public/:token/book-recurring', publicBookingLimiter, publicBookingPerTokenLimiter, requireBookingToken, validate(bookRecurringSchema), async (req, res) => {
  try {
    const data = req.bookingData
    const { tutorName, tutorEmail, startDatetime, recurrenceWeeks } = req.body
    const durationMs = data.duration_minutes * 60000
    const recurrenceGroupId = secureToken()
    const db = getDb()
    const bufferMs = Math.max(0, Number(data.buffer_minutes) || 0) * 60000

    const tx = db.transaction(() => {
      const created = []
      for (let w = 0; w < recurrenceWeeks; w++) {
        const start = new Date(new Date(startDatetime).getTime() + w * 7 * 24 * 3600000)
        const end = new Date(start.getTime() + durationMs)
        const winStart = new Date(start.getTime() - bufferMs).toISOString()
        const winEnd   = new Date(end.getTime() + bufferMs).toISOString()

        const conflicts = db.prepare(`
          SELECT id FROM bookings WHERE teacher_id = ? AND status = 'confirmed'
          AND start_datetime < ? AND end_datetime > ?
        `).all(data.teacher_id, winEnd, winStart)

        if (conflicts.length > 0) {
          throw Object.assign(new Error(`Conflit semaine ${w + 1} : creneau deja pris`), { statusCode: 409 })
        }

        const cancelToken = secureToken()
        const result = db.prepare(`
          INSERT INTO bookings (event_type_id, student_id, teacher_id, tutor_name, tutor_email,
            start_datetime, end_datetime, cancel_token, recurrence_group_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(data.event_type_id, data.student_id, data.teacher_id,
          tutorName, tutorEmail, start.toISOString(), end.toISOString(), cancelToken, recurrenceGroupId)
        created.push(db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid))
      }
      return created
    })

    const createdBookings = tx()

    const first = createdBookings[0]
    const cancelUrl = `${SERVER_URL}/#/book/cancel/${first.cancel_token}`
    try {
      await email.sendBookingConfirmation({
        to: tutorEmail, tutorName,
        teacherName: data.teacher_name, studentName: data.student_name,
        eventTitle: `${data.event_title} (x${recurrenceWeeks} semaines)`,
        startDatetime: first.start_datetime, endDatetime: first.end_datetime,
        teamsJoinUrl: null, cancelUrl,
      })
    } catch (err) {
      log.warn('booking_recurring_email_failed', { bookingId: first.id, error: err.message })
    }

    log.info('booking_recurring_created', { count: createdBookings.length, teacherId: data.teacher_id, groupId: recurrenceGroupId })
    res.json({
      ok: true,
      data: {
        count: createdBookings.length,
        recurrenceGroupId,
        firstBooking: { id: first.id, startDatetime: first.start_datetime, endDatetime: first.end_datetime },
      },
    })
  } catch (err) {
    log.warn('recurring_booking_error', { error: err.message })
    const status = err.statusCode || (err.message?.includes('Conflit') ? 409 : 400)
    res.status(status).json({ ok: false, error: err.message || 'Erreur lors de la reservation recurrente.' })
  }
})

module.exports = router
