// ─── IPC : Travaux, dépôts, groupes, rubrics ─────────────────────────────────
const { handle, handleTeacher, handlePromo } = require('./helpers')
const queries = require('../../../server/db/index')
const { validated, createTravailPayload, addDepotPayload, setNotePayload, setFeedbackPayload } = require('./validation')

function register() {
  // ── Travaux ─────────────────────────────────────────────────────────────
  handle('db:getTravaux',       (channelId) => queries.getTravaux(channelId))
  handle('db:getTravailById',   (travailId) => queries.getTravailById(travailId))
  handleTeacher('db:createTravail',    validated(createTravailPayload, (payload) => queries.createTravail(payload)))
  handle('db:getTravauxSuivi',  (travailId) => queries.getTravauxSuivi(travailId))

  // ── Dépôts ────────────────────────────────────────────────────────────
  handle('db:getDepots',   (travailId) => queries.getDepots(travailId))
  handle('db:addDepot',    validated(addDepotPayload, (payload) => queries.addDepot(payload)))
  handleTeacher('db:setNote',     validated(setNotePayload, (payload) => queries.setNote(payload)))
  handleTeacher('db:setFeedback', validated(setFeedbackPayload, (payload) => queries.setFeedback(payload)))

  // ── Groupes ───────────────────────────────────────────────────────────
  handlePromo('db:getGroups', (promoId) => promoId, (promoId) => queries.getGroups(promoId))
  handleTeacher('db:createGroup',     (payload)  => queries.createGroup(payload))
  handleTeacher('db:deleteGroup',     (groupId)  => queries.deleteGroup(groupId))
  handle('db:getGroupMembers', (groupId)  => queries.getGroupMembers(groupId))
  handleTeacher('db:setGroupMembers', (payload)  => queries.setGroupMembers(payload))

  // ── Groupes par projet ────────────────────────────────────────────────
  handle('db:getTravailGroupMembers', (travailId) => queries.getTravailGroupMembers(travailId))
  handleTeacher('db:setTravailGroupMember',  (payload)   => queries.setTravailGroupMember(payload))

  // ── Brouillon / publication (teacher-only) ────────────────────────────
  handleTeacher('db:updateTravailPublished', (payload) => queries.updateTravailPublished(payload))
  handleTeacher('db:updateTravailScheduled', (payload) => queries.updateTravail(payload.travailId, { scheduledPublishAt: payload.scheduledAt ?? null }))

  // ── Ressources ────────────────────────────────────────────────────────
  handle('db:getRessources',  (travailId) => queries.getRessources(travailId))
  handleTeacher('db:addRessource',   (payload)   => queries.addRessource(payload))
  handleTeacher('db:deleteRessource',(id)        => queries.deleteRessource(id))

  // ── Échéancier prof (teacher-only) ────────────────────────────────────
  handleTeacher('db:getTeacherSchedule',     ()         => queries.getTeacherSchedule())
  handlePromo('db:getTravailCategories', (promoId) => promoId, (promoId) => queries.getTravailCategories(promoId))

  // ── Gantt + rendus ────────────────────────────────────────────────────
  handlePromo('db:getGanttData', (promoId) => promoId, (promoId) => queries.getGanttData(promoId ?? null))
  handlePromo('db:getAllRendus',  (promoId) => promoId, (promoId) => queries.getAllRendus(promoId ?? null))

  // ── Action de masse (teacher-only) ────────────────────────────────────
  handleTeacher('db:markNonSubmittedAsD', (travailId) => queries.markNonSubmittedAsD(travailId))

  // ── Rubrics (teacher-only sauf lecture) ────────────────────────────────
  handle('db:getRubric',      (travailId) => queries.getRubric(travailId))
  handleTeacher('db:upsertRubric',   (payload)   => queries.upsertRubric(payload))
  handleTeacher('db:deleteRubric',   (travailId) => queries.deleteRubric(travailId))
  handle('db:getDepotScores', (depotId)   => queries.getDepotScores(depotId))
  handleTeacher('db:setDepotScores', (payload)   => queries.setDepotScores(payload))
}

module.exports = { register }
