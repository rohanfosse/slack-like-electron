// ─── IPC : Projets — CRUD + travaux/documents + assignation TA ───────────────
const { handle, handleTeacher } = require('./helpers')
const queries = require('../../../server/db/index')

function register() {
  // ── CRUD Projets ──────────────────────────────────────────────────────
  handle('projects:getByPromo',  (promoId) => queries.getProjectsByPromo(promoId))
  handle('projects:getById',     (id)      => queries.getProjectById(id))
  handleTeacher('projects:create',  (data) => queries.createProject(data))
  handleTeacher('projects:update',  (id, data) => queries.updateProject(id, data))
  handleTeacher('projects:delete',  (id)   => queries.deleteProject(id))

  // ── Liaison travaux ───────────────────────────────────────────────────
  handleTeacher('projects:addTravail',    (projectId, travailId) => queries.addTravailToProject(projectId, travailId))
  handleTeacher('projects:removeTravail', (projectId, travailId) => queries.removeTravailFromProject(projectId, travailId))
  handle('projects:getTravaux',   (projectId) => queries.getProjectTravaux(projectId))

  // ── Liaison documents ─────────────────────────────────────────────────
  handleTeacher('projects:addDocument', (projectId, documentId) => queries.addDocumentToProject(projectId, documentId))
  handle('projects:getDocuments', (projectId) => queries.getProjectDocuments(projectId))

  // ── Assignation TA ────────────────────────────────────────────────────
  handleTeacher('projects:assignTa',   (teacherId, projectId) => queries.assignTaToProject(teacherId, projectId))
  handleTeacher('projects:unassignTa', (teacherId, projectId) => queries.unassignTaFromProject(teacherId, projectId))
  handle('projects:getTas',       (projectId) => queries.getProjectTas(projectId))
  handle('projects:getTaProjects', (teacherId) => queries.getTaProjects(teacherId))

  // ── Liaison enseignant-promo ──────────────────────────────────────────
  handle('projects:getTeacherPromos',      (teacherId) => queries.getTeacherPromos(teacherId))
  handleTeacher('projects:assignTeacherToPromo', (teacherId, promoId) => queries.assignTeacherToPromo(teacherId, promoId))
}

module.exports = { register }
