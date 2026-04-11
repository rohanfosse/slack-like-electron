/**
 * Routes API Lumen — liseuse de cours adossee a GitHub.
 *
 * Modele : 1 promo = 1 organisation GitHub, 1 projet pedagogique = 1 repo,
 * un fichier `cursus.yaml` a la racine decrit les chapitres. Lumen stocke
 * uniquement des metadonnees (orga lookup, manifest parse, cache de fichiers,
 * notes privees etudiant, tracking lecture) ; le contenu des cours vit
 * dans GitHub.
 */
const router = require('express').Router()
const { z } = require('zod')
const wrap = require('../utils/wrap')
const authMiddleware = require('../middleware/auth')
const { requireRole, requirePromo, requirePromoAdmin, promoFromParam } = require('../middleware/authorize')
const { validate } = require('../middleware/validate')
const { AppError, NotFoundError, ForbiddenError } = require('../utils/errors')
const { buildClientForUser, validateToken, mapOctokitError } = require('../services/githubClient')
const { syncPromoRepos, fetchChapterContent, getCachedChapter } = require('../services/lumenRepoSync')
const {
  // auth
  getLumenGithubAuth,
  saveLumenGithubAuth,
  deleteLumenGithubAuth,
  // promo org
  getPromoGithubOrg,
  setPromoGithubOrg,
  // repos
  getLumenReposForPromo,
  getLumenRepo,
  // notes
  getLumenChapterNote,
  upsertLumenChapterNote,
  deleteLumenChapterNote,
  getStudentLumenNotes,
  getStudentNotedChapters,
  // reads
  markLumenChapterRead,
  getStudentLumenReads,
  getLumenReadCountsForRepo,
  getLumenReadCountsForPromo,
  // stats
  getLumenStatsForPromo,
} = require('../db/models/lumen')

router.use(authMiddleware)

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalisation : les JWT enseignants stockent id en negatif. */
function userKey(req) {
  if (req.user?.type === 'teacher') return { userType: 'teacher', userId: Math.abs(req.user.id) }
  if (req.user?.type === 'student') return { userType: 'student', userId: req.user.id }
  return null
}

async function requireGithubClient(req) {
  const key = userKey(req)
  if (!key) throw new ForbiddenError('GitHub non autorise pour ce type de compte')
  const octokit = await buildClientForUser(key.userType, key.userId)
  if (!octokit) throw new AppError('Compte GitHub non connecte', 401)
  return octokit
}

function promoFromRepoParam(req) {
  const id = Number(req.params.id)
  if (!id) return null
  const repo = getLumenRepo(id)
  return repo?.promo_id ?? null
}

/** Lookup promoId depuis `:id` (cas des routes /promos/:id/...). */
function promoFromIdParam(req) {
  return Number(req.params.id) || null
}

function repoOrThrow(id) {
  const repo = getLumenRepo(id)
  if (!repo) throw new NotFoundError('Repo Lumen introuvable')
  return repo
}

function parseManifestField(repo) {
  if (!repo.manifest_json) return null
  try { return JSON.parse(repo.manifest_json) } catch { return null }
}

function serializeRepo(repo) {
  return {
    id: repo.id,
    promoId: repo.promo_id,
    owner: repo.owner,
    repo: repo.repo,
    fullName: `${repo.owner}/${repo.repo}`,
    defaultBranch: repo.default_branch,
    manifest: parseManifestField(repo),
    manifestError: repo.manifest_error ?? null,
    lastCommitSha: repo.last_commit_sha ?? null,
    lastSyncedAt: repo.last_synced_at ?? null,
    projectId: repo.project_id ?? null,
  }
}

async function handleOctokit(err) {
  const mapped = await mapOctokitError(err)
  return new AppError(mapped.message, mapped.status)
}

// ─── Schemas Zod ────────────────────────────────────────────────────────────

const tokenSchema = z.object({ token: z.string().min(10).max(200) }).strict()
const orgSchema = z.object({ org: z.string().min(1).max(100).nullable() }).strict()
const chapterPathSchema = z.object({ path: z.string().min(1).max(500) }).strict()
const noteSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(10_000),
}).strict()

// ─── GitHub auth ────────────────────────────────────────────────────────────

router.get('/github/me', wrap(async (req) => {
  const key = userKey(req)
  if (!key) return { connected: false }
  const auth = getLumenGithubAuth(key.userType, key.userId)
  if (!auth) return { connected: false }
  return { connected: true, login: auth.github_login, scopes: auth.scopes ?? '' }
}))

router.post('/github/connect', validate(tokenSchema), wrap(async (req) => {
  const key = userKey(req)
  if (!key) throw new ForbiddenError('GitHub non autorise pour ce type de compte')
  let info
  try {
    info = await validateToken(req.body.token)
  } catch (err) {
    throw await handleOctokit(err)
  }
  saveLumenGithubAuth(key.userType, key.userId, {
    githubLogin: info.login,
    accessToken: req.body.token,
    scopes: info.scopes,
  })
  return { login: info.login, name: info.name, avatarUrl: info.avatarUrl }
}))

router.delete('/github/disconnect', wrap(async (req) => {
  const key = userKey(req)
  if (!key) return { disconnected: false }
  deleteLumenGithubAuth(key.userType, key.userId)
  return { disconnected: true }
}))

// ─── Promo GitHub org mapping (admin/teacher seulement) ─────────────────────

router.get('/promos/:id/github-org', requirePromo(promoFromIdParam), wrap(async (req) => {
  const promoId = Number(req.params.id)
  return { org: getPromoGithubOrg(promoId) }
}))

router.put(
  '/promos/:id/github-org',
  requireRole('teacher', 'admin'),
  requirePromoAdmin(promoFromIdParam),
  validate(orgSchema),
  wrap(async (req) => {
    const promoId = Number(req.params.id)
    setPromoGithubOrg(promoId, req.body.org)
    return { org: getPromoGithubOrg(promoId) }
  }),
)

// ─── Repos : lister / sync ──────────────────────────────────────────────────

router.get(
  '/repos/promo/:promoId',
  requirePromo(promoFromParam),
  wrap(async (req) => {
    const promoId = Number(req.params.promoId)
    const repos = getLumenReposForPromo(promoId).map(serializeRepo)
    return { repos, org: getPromoGithubOrg(promoId) }
  }),
)

router.post(
  '/repos/sync/promo/:promoId',
  requirePromo(promoFromParam),
  wrap(async (req) => {
    const promoId = Number(req.params.promoId)
    const org = getPromoGithubOrg(promoId)
    if (!org) throw new AppError('Aucune organisation GitHub configuree pour cette promo', 400)
    const octokit = await requireGithubClient(req)
    let result
    try {
      result = await syncPromoRepos(octokit, { promoId, org })
    } catch (err) {
      throw await handleOctokit(err)
    }
    const repos = getLumenReposForPromo(promoId).map(serializeRepo)
    return { synced: result.synced, errors: result.errors, repos }
  }),
)

router.get(
  '/repos/:id',
  requirePromo(promoFromRepoParam),
  wrap(async (req) => {
    const repo = repoOrThrow(Number(req.params.id))
    return serializeRepo(repo)
  }),
)

// ─── Chapitres : contenu markdown ───────────────────────────────────────────

router.get(
  '/repos/:id/content',
  requirePromo(promoFromRepoParam),
  wrap(async (req) => {
    const repo = repoOrThrow(Number(req.params.id))
    const path = String(req.query.path ?? '').trim()
    if (!path) throw new AppError('Parametre path requis', 400)

    // Securite : empeche de fetcher un fichier arbitraire du repo via
    // Lumen — seuls les chapitres declares dans cursus.yaml sont servis.
    const manifest = parseManifestField(repo)
    const inManifest = manifest?.chapters?.some((c) => c.path === path)
    if (!inManifest) throw new NotFoundError('Chapitre non declare dans cursus.yaml')

    const key = userKey(req)
    const octokit = key ? await buildClientForUser(key.userType, key.userId) : null
    if (octokit) {
      try {
        const file = await fetchChapterContent(octokit, repo, path)
        if (!file) throw new NotFoundError('Fichier introuvable dans le repo')
        return { content: file.content, sha: file.sha, cached: false }
      } catch (err) {
        if (err.statusCode) throw err
        const cached = getCachedChapter(repo.id, path)
        if (cached) return cached
        throw await handleOctokit(err)
      }
    }

    const cached = getCachedChapter(repo.id, path)
    if (!cached) throw new AppError('Compte GitHub non connecte et pas de cache disponible', 401)
    return cached
  }),
)

// ─── Reads tracking ─────────────────────────────────────────────────────────

router.post(
  '/repos/:id/read',
  requireRole('student'),
  requirePromo(promoFromRepoParam),
  validate(chapterPathSchema),
  wrap(async (req) => {
    const repoId = Number(req.params.id)
    markLumenChapterRead(req.user.id, repoId, req.body.path)
    return { ok: true }
  }),
)

router.get(
  '/my-reads',
  requireRole('student'),
  wrap(async (req) => {
    return { reads: getStudentLumenReads(req.user.id) }
  }),
)

router.get(
  '/repos/:id/read-counts',
  requireRole('teacher', 'admin'),
  requirePromoAdmin(promoFromRepoParam),
  wrap(async (req) => {
    const repoId = Number(req.params.id)
    return { counts: getLumenReadCountsForRepo(repoId) }
  }),
)

router.get(
  '/read-counts/promo/:promoId',
  requireRole('teacher', 'admin'),
  requirePromoAdmin(promoFromParam),
  wrap(async (req) => {
    const promoId = Number(req.params.promoId)
    return { counts: getLumenReadCountsForPromo(promoId) }
  }),
)

// ─── Notes privees etudiant ─────────────────────────────────────────────────

router.get(
  '/repos/:id/note',
  requireRole('student'),
  requirePromo(promoFromRepoParam),
  wrap(async (req) => {
    const repoId = Number(req.params.id)
    const path = String(req.query.path ?? '').trim()
    if (!path) throw new AppError('Parametre path requis', 400)
    const note = getLumenChapterNote(req.user.id, repoId, path)
    return { note: note ?? null }
  }),
)

router.put(
  '/repos/:id/note',
  requireRole('student'),
  requirePromo(promoFromRepoParam),
  validate(noteSchema),
  wrap(async (req) => {
    const repoId = Number(req.params.id)
    const note = upsertLumenChapterNote(req.user.id, repoId, req.body.path, req.body.content)
    return { note }
  }),
)

router.delete(
  '/repos/:id/note',
  requireRole('student'),
  requirePromo(promoFromRepoParam),
  validate(chapterPathSchema),
  wrap(async (req) => {
    const repoId = Number(req.params.id)
    deleteLumenChapterNote(req.user.id, repoId, req.body.path)
    return { ok: true }
  }),
)

router.get(
  '/my-notes',
  requireRole('student'),
  wrap(async (req) => {
    return { notes: getStudentLumenNotes(req.user.id) }
  }),
)

router.get(
  '/my-noted-chapters',
  requireRole('student'),
  wrap(async (req) => {
    return { items: getStudentNotedChapters(req.user.id) }
  }),
)

// ─── Stats ──────────────────────────────────────────────────────────────────

router.get(
  '/stats/promo/:promoId',
  requireRole('teacher', 'admin'),
  requirePromoAdmin(promoFromParam),
  wrap(async (req) => {
    return getLumenStatsForPromo(Number(req.params.promoId))
  }),
)

module.exports = router
