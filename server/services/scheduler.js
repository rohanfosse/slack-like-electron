/**
 * Scheduler : toutes les 30s, execute les taches planifiees.
 * Chaque tache est un module isole dans schedulerTasks/.
 */
const processScheduledMessages = require('./schedulerTasks/messages')
const processScheduledDevoirs  = require('./schedulerTasks/devoirs')
const processBookingReminders  = require('./schedulerTasks/reminders')

module.exports = function startScheduler(io, queries) {
  return setInterval(async () => {
    processScheduledMessages(io, queries)
    processScheduledDevoirs(io, queries)
    await processBookingReminders(io)
  }, 30000)
}
