// ─── IPC : Structure (promotions, canaux, étudiants) ─────────────────────────
const { handle, handleTeacher, handlePromo } = require('./helpers')
const queries = require('../../../server/db/index')
const { validated, createChannelPayload, createPromotionPayload, registerStudentPayload } = require('./validation')

function register() {
  handle('db:getPromotions',    ()           => queries.getPromotions())
  handlePromo('db:getChannels', (promoId) => promoId, (promoId) => queries.getChannels(promoId))
  handlePromo('db:getStudents', (promoId) => promoId, (promoId) => queries.getStudents(promoId))
  handleTeacher('db:getAllStudents',    ()           => queries.getAllStudents())

  // ── Promotions & canaux (teacher-only) ────────────────────────────────
  handleTeacher('db:createPromotion',          validated(createPromotionPayload, (payload) => queries.createPromotion(payload)))
  handleTeacher('db:deletePromotion',          (promoId)            => queries.deletePromotion(promoId))
  handleTeacher('db:createChannel',            validated(createChannelPayload, (payload) => queries.createChannel(payload)))
  handleTeacher('db:renameChannel',            (id, name)           => queries.renameChannel(id, name))
  handleTeacher('db:deleteChannel',            (id)                 => queries.deleteChannel(id))
  handleTeacher('db:renameCategory',           (promoId, old, next) => queries.renameCategory(promoId, old, next))
  handleTeacher('db:deleteCategory',           (promoId, category)  => queries.deleteCategory(promoId, category))
  handleTeacher('db:updateChannelMembers',     (payload)            => queries.updateChannelMembers(payload))
  handleTeacher('db:updateChannelCategory',    (channelId, category) => queries.updateChannelCategory(channelId, category))

  // ── Identité / login ───────────────────────────────────────────────────
  handle('db:getIdentities',        ()                 => queries.getIdentities())
  handle('db:loginWithCredentials', (email, password)  => queries.loginWithCredentials(email, password))
  handle('db:changePassword',       (userId, isTeacher, currentPwd, newPwd) => queries.changePassword(userId, isTeacher, currentPwd, newPwd))
  handle('db:exportPersonalData',   (studentId)        => queries.exportStudentData(studentId))

  // ── Inscription étudiant ──────────────────────────────────────────────
  handle('db:getStudentByEmail', (email)   => queries.getStudentByEmail(email))
  handle('db:registerStudent',   validated(registerStudentPayload, (payload) => queries.registerStudent(payload)))

  // ── Réinitialisation des données (teacher-only) ───────────────────────
  handleTeacher('db:resetAndSeed', () => { queries.resetAndSeed(); return null })

  // ── Profil étudiant ───────────────────────────────────────────────────
  handle('db:getStudentProfile', (studentId) => queries.getStudentProfile(studentId))
  handle('db:getStudentTravaux', (studentId) => queries.getStudentTravaux(studentId))

  // ── Vue Classe (teacher-only) ─────────────────────────────────────────
  handleTeacher('db:getClasseStats',     (promoId) => queries.getClasseStats(promoId))
  handleTeacher('db:updateStudentPhoto', (payload) => queries.updateStudentPhoto(payload.studentId, payload.photoData))

  // ── Intervenants (teacher-only) ───────────────────────────────────────
  handle('db:getIntervenants',    ()        => queries.getIntervenants())
  handleTeacher('db:createIntervenant',  (payload) => queries.createIntervenant(payload))
  handleTeacher('db:deleteIntervenant',  (id)      => queries.deleteIntervenant(id))
  handle('db:getTeacherChannels', (id)      => queries.getTeacherChannels(id))
  handleTeacher('db:setTeacherChannels', (payload) => queries.setTeacherChannels(payload))
}

module.exports = { register }
