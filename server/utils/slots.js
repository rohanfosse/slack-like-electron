/**
 * slots.js — Pure slot generation algorithm.
 * Computes available booking slots for a given week based on
 * availability rules, existing bookings, Outlook busy blocks, and buffer time.
 */

/**
 * @param {Object} opts
 * @param {Array<{ day_of_week: number; start_time: string; end_time: string }>} opts.rules
 * @param {Array<{ start_datetime: string; end_datetime: string }>} opts.bookings
 * @param {Array<{ start: string; end: string }>} opts.outlookBusy
 * @param {number} opts.durationMinutes
 * @param {number} opts.bufferMinutes
 * @param {Date} opts.weekStart - Monday 00:00
 * @param {Array<{ override_date: string; start_time?: string; end_time?: string; is_blocked: number }>} [opts.overrides]
 * @param {number} [opts.daysCount=7] - Number of days to generate (7 = full week)
 * @returns {Array<{ start: string; end: string; date: string; time: string }>}
 */
function generateSlots({ rules, bookings, outlookBusy, durationMinutes, bufferMinutes, weekStart, overrides, daysCount = 7 }) {
  const durationMs = durationMinutes * 60000
  const bufferMs = (bufferMinutes || 0) * 60000
  const nowMs = Date.now()

  // Pre-parse busy intervals
  const bookingIntervals = bookings.map(b => ({
    start: new Date(b.start_datetime).getTime(),
    end: new Date(b.end_datetime).getTime(),
  }))
  const outlookIntervals = outlookBusy.map(b => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }))

  const slots = []

  // Index overrides by date
  const overridesByDate = {}
  for (const o of (overrides || [])) {
    (overridesByDate[o.override_date] ??= []).push(o)
  }

  for (let day = 0; day < daysCount; day++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + day)
    const dayOfWeek = date.getDay()
    const dateIso = date.toISOString().slice(0, 10)

    // Check if entire day is blocked by an override
    const dayOverrides = overridesByDate[dateIso] || []
    const dayBlocked = dayOverrides.some(o => o.is_blocked && !o.start_time)
    if (dayBlocked) continue

    // Merge regular rules with date-specific override additions
    let dayRules = rules.filter(r => r.day_of_week === dayOfWeek)

    // Add override-specific slots (non-blocked, with times)
    for (const o of dayOverrides) {
      if (!o.is_blocked && o.start_time && o.end_time) {
        dayRules = [...dayRules, { start_time: o.start_time, end_time: o.end_time, day_of_week: dayOfWeek }]
      }
    }

    // Remove time-specific blocks
    const blockedTimes = dayOverrides
      .filter(o => o.is_blocked && o.start_time)
      .map(o => ({ start: o.start_time, end: o.end_time }))

    for (const rule of dayRules) {
      const [sh, sm] = rule.start_time.split(':').map(Number)
      const [eh, em] = rule.end_time.split(':').map(Number)

      const ruleStart = new Date(date)
      ruleStart.setHours(sh, sm, 0, 0)
      const ruleEnd = new Date(date)
      ruleEnd.setHours(eh, em, 0, 0)
      let slotStartMs = ruleStart.getTime()
      const ruleEndMs = ruleEnd.getTime()

      while (slotStartMs + durationMs <= ruleEndMs) {
        const slotEndMs = slotStartMs + durationMs

        if (slotStartMs <= nowMs) {
          slotStartMs = slotEndMs + bufferMs
          continue
        }

        // Check time-specific blocks from overrides
        const slotTime = `${String(new Date(slotStartMs).getHours()).padStart(2, '0')}:${String(new Date(slotStartMs).getMinutes()).padStart(2, '0')}`
        const isBlockedSlot = blockedTimes.some(bt => bt.start <= slotTime && bt.end > slotTime)

        const hasConflict = isBlockedSlot ||
          bookingIntervals.some(b => (b.start - bufferMs) < slotEndMs && (b.end + bufferMs) > slotStartMs) ||
          outlookIntervals.some(b => b.start < slotEndMs && b.end > slotStartMs)

        if (!hasConflict) {
          const s = new Date(slotStartMs)
          slots.push({
            start: s.toISOString(),
            end: new Date(slotEndMs).toISOString(),
            date: date.toISOString().slice(0, 10),
            time: `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`,
          })
        }

        slotStartMs = slotEndMs + bufferMs
      }
    }
  }

  return slots
}

module.exports = { generateSlots }
