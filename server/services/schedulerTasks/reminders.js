/**
 * schedulerTasks/reminders.js — Envoi des rappels de booking 24h avant.
 */
const log = require('../../utils/logger')
const { getDueReminders, markReminderSent } = require('../../db/models/bookings')
const email = require('../email')

module.exports = async function processBookingReminders(io) {
  try {
    const dueReminders = getDueReminders()
    for (const r of dueReminders) {
      try {
        if (r.type === 'email_tutor_24h') {
          await email.sendBookingReminder({
            to: r.tutor_email,
            tutorName: r.tutor_name,
            teacherName: r.teacher_name,
            eventTitle: r.event_title,
            startDatetime: r.start_datetime,
            teamsJoinUrl: r.teams_join_url,
          })
        }
        if (r.type === 'email_teacher_24h') {
          io.to(`user:${r.teacher_id}`).emit('booking:reminder', {
            bookingId: r.booking_id,
            tutorName: r.tutor_name,
            eventTitle: r.event_title,
            startDatetime: r.start_datetime,
          })
        }
        markReminderSent(r.id)
        log.info('booking_reminder_sent', { id: r.id, type: r.type, bookingId: r.booking_id })
      } catch (err) {
        log.error('booking_reminder_failed', { id: r.id, error: err.message })
      }
    }
  } catch (err) {
    log.error('booking_reminders_failed', { error: err.message })
  }
}
