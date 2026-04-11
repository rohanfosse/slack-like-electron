/**
 * Synchronisation des repos d'une promo GitHub vers la base locale Lumen.
 *
 * Cycle de sync d'une promo :
 *   1. Lister les repos de l'organisation (`GET /orgs/:org/repos`)
 *   2. Pour chaque repo : upsert dans `lumen_repos`
 *   3. Pour chaque repo : fetch `cursus.yaml`, parser, valider, stocker
 *      dans `lumen_repos.manifest_json` + `last_commit_sha`
 *   4. Prune : supprimer les lignes DB qui ne sont plus dans l'org
 *
 * Fetch d'un chapitre a la demande :
 *   1. Verifier le cache (`lumen_file_cache`) par sha
 *   2. Si absent ou sha different, fetch raw via Octokit
 *   3. Stocker dans le cache et retourner le contenu
 */
const { parseManifest, MANIFEST_FILENAME } = require('./lumenManifest')
const {
  upsertLumenRepo,
  updateLumenRepoManifest,
  pruneLumenReposForPromo,
  getLumenCachedFile,
  upsertLumenCachedFile,
} = require('../db/models/lumen')

/**
 * Liste tous les repos d'une organisation GitHub (paginated).
 */
async function listOrgRepos(octokit, org) {
  const repos = []
  for await (const { data } of octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
    org,
    type: 'all',
    per_page: 100,
  })) {
    for (const r of data) {
      if (r.archived || r.disabled) continue
      repos.push({ owner: r.owner.login, repo: r.name, defaultBranch: r.default_branch ?? 'main' })
    }
  }
  return repos
}

/**
 * Fetch le contenu d'un fichier texte depuis un repo GitHub.
 * Renvoie { content, sha } ou null si 404.
 */
async function fetchFile(octokit, { owner, repo, path, ref }) {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref })
    if (Array.isArray(data) || data.type !== 'file') return null
    const content = Buffer.from(data.content, data.encoding ?? 'base64').toString('utf8')
    return { content, sha: data.sha }
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

/**
 * Recupere le SHA du dernier commit sur la branche par defaut du repo.
 */
async function getLatestCommitSha(octokit, { owner, repo, defaultBranch }) {
  try {
    const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch: defaultBranch })
    return data.commit?.sha ?? null
  } catch {
    return null
  }
}

/**
 * Sync un repo individuel : fetch manifest + commit sha, met a jour la DB.
 */
async function syncRepo(octokit, dbRepo) {
  const { owner, repo, default_branch: defaultBranch, id } = dbRepo
  const commitSha = await getLatestCommitSha(octokit, { owner, repo, defaultBranch })

  const manifestFile = await fetchFile(octokit, { owner, repo, path: MANIFEST_FILENAME, ref: defaultBranch })
  if (!manifestFile) {
    updateLumenRepoManifest(id, {
      manifestJson: null,
      manifestError: `Fichier ${MANIFEST_FILENAME} absent a la racine du repo`,
      lastCommitSha: commitSha,
    })
    return { ok: false, error: 'manifest_missing' }
  }

  const parsed = parseManifest(manifestFile.content)
  if (!parsed.ok) {
    updateLumenRepoManifest(id, {
      manifestJson: null,
      manifestError: parsed.error,
      lastCommitSha: commitSha,
    })
    return { ok: false, error: parsed.error }
  }

  updateLumenRepoManifest(id, {
    manifestJson: JSON.stringify(parsed.manifest),
    manifestError: null,
    lastCommitSha: commitSha,
  })
  return { ok: true, manifest: parsed.manifest }
}

/**
 * Synchronise tous les repos d'une organisation pour une promo donnee.
 * Les appels GitHub sont parallelises par batch de 5 pour eviter de
 * taper le rate limit secondaire tout en restant bien plus rapide que
 * le mode sequentiel (O(n) round-trips → ceil(n/5)).
 * @returns {Promise<{synced: number, errors: Array<{repo: string, error: string}>}>}
 */
const SYNC_CONCURRENCY = 5

async function syncPromoRepos(octokit, { promoId, org }) {
  const orgRepos = await listOrgRepos(octokit, org)

  const dbRepos = orgRepos.map((r) => upsertLumenRepo({
    promoId,
    owner: r.owner,
    repo: r.repo,
    defaultBranch: r.defaultBranch,
  }))
  const keepIds = dbRepos.map((r) => r.id)

  const errors = []
  for (let i = 0; i < dbRepos.length; i += SYNC_CONCURRENCY) {
    const batch = dbRepos.slice(i, i + SYNC_CONCURRENCY)
    const results = await Promise.all(batch.map((repo) =>
      syncRepo(octokit, repo).catch((err) => ({ ok: false, error: err.message ?? 'sync_failed' })),
    ))
    results.forEach((result, j) => {
      if (!result.ok) {
        errors.push({ repo: `${batch[j].owner}/${batch[j].repo}`, error: result.error })
      }
    })
  }

  pruneLumenReposForPromo(promoId, keepIds)
  return { synced: orgRepos.length, errors }
}

/**
 * Fetch un chapitre (fichier .md) avec cache par sha.
 * Si le cache contient deja le meme sha, on retourne directement le contenu
 * stocke. Sinon on fetch et on met a jour le cache.
 */
async function fetchChapterContent(octokit, dbRepo, path) {
  const { id: repoId, owner, repo, default_branch: ref } = dbRepo
  const file = await fetchFile(octokit, { owner, repo, path, ref })
  if (!file) return null

  const cached = getLumenCachedFile(repoId, path)
  if (!cached || cached.sha !== file.sha) {
    upsertLumenCachedFile(repoId, path, file.sha, file.content)
  }
  return { content: file.content, sha: file.sha }
}

/**
 * Retourne un chapitre depuis le cache seulement (utilise en fallback offline
 * ou quand Octokit n'est pas disponible).
 */
function getCachedChapter(repoId, path) {
  const cached = getLumenCachedFile(repoId, path)
  if (!cached) return null
  return { content: cached.content, sha: cached.sha, fetchedAt: cached.fetched_at, cached: true }
}

module.exports = {
  listOrgRepos,
  fetchFile,
  getLatestCommitSha,
  syncRepo,
  syncPromoRepos,
  fetchChapterContent,
  getCachedChapter,
}
