/**
 * Tests unitaires pour le modele Lumen post-pivot GitHub.
 * Couvre : github auth, promo org, repos CRUD, file cache,
 * chapter notes, chapter reads, stats.
 */
// Set JWT_SECRET avant le require des modules qui dependent de crypto
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only-32chars!!'
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/lumen')
})

afterAll(() => teardownTestDb())

describe('Lumen GitHub auth', () => {
  it('saveLumenGithubAuth + getLumenGithubAuth round-trip (chiffre en DB, clair en lecture)', () => {
    queries.saveLumenGithubAuth('student', 1, {
      githubLogin: 'alice',
      accessToken: 'ghp_abc_secret_token',
      scopes: 'repo,read:org',
    })
    const auth = queries.getLumenGithubAuth('student', 1)
    // L'API renvoie le token en clair
    expect(auth).toMatchObject({
      user_type: 'student',
      user_id: 1,
      github_login: 'alice',
      access_token: 'ghp_abc_secret_token',
      scopes: 'repo,read:org',
    })
    // Mais en base, le token est chiffre (prefixe enc:)
    const raw = getTestDb().prepare('SELECT access_token FROM lumen_github_auth WHERE user_id = ?').get(1)
    expect(raw.access_token.startsWith('enc:')).toBe(true)
    expect(raw.access_token).not.toBe('ghp_abc_secret_token')
  })

  it('migration lazy : un token legacy en clair est re-chiffre au premier get', () => {
    getTestDb().prepare('INSERT OR REPLACE INTO lumen_github_auth (user_type, user_id, github_login, access_token, scopes) VALUES (?,?,?,?,?)')
      .run('teacher', 42, 'bob', 'ghp_legacy_plain', 'repo')
    // Avant get : clair en DB
    const before = getTestDb().prepare('SELECT access_token FROM lumen_github_auth WHERE user_id = ?').get(42)
    expect(before.access_token).toBe('ghp_legacy_plain')
    // Read -> decrypt passthrough + migration
    const auth = queries.getLumenGithubAuth('teacher', 42)
    expect(auth.access_token).toBe('ghp_legacy_plain')
    // Apres get : chiffre en DB
    const after = getTestDb().prepare('SELECT access_token FROM lumen_github_auth WHERE user_id = ?').get(42)
    expect(after.access_token.startsWith('enc:')).toBe(true)
    // Deuxieme read : toujours clair
    expect(queries.getLumenGithubAuth('teacher', 42).access_token).toBe('ghp_legacy_plain')
  })

  it('upsert: second save updates in place', () => {
    queries.saveLumenGithubAuth('student', 1, { githubLogin: 'alice2', accessToken: 'ghp_new', scopes: 'repo' })
    const auth = queries.getLumenGithubAuth('student', 1)
    expect(auth.github_login).toBe('alice2')
    expect(auth.access_token).toBe('ghp_new')
  })

  it('deleteLumenGithubAuth removes the row', () => {
    queries.deleteLumenGithubAuth('student', 1)
    expect(queries.getLumenGithubAuth('student', 1)).toBeNull()
  })

  it('returns null for missing auth', () => {
    expect(queries.getLumenGithubAuth('teacher', 99999)).toBeNull()
  })
})

describe('Promo GitHub org', () => {
  it('setPromoGithubOrg + getPromoGithubOrg', () => {
    queries.setPromoGithubOrg(1, 'cesi-2026-promoA')
    expect(queries.getPromoGithubOrg(1)).toBe('cesi-2026-promoA')
  })

  it('trims whitespace', () => {
    queries.setPromoGithubOrg(1, '  cesi-2027  ')
    expect(queries.getPromoGithubOrg(1)).toBe('cesi-2027')
  })

  it('empty string stores NULL', () => {
    queries.setPromoGithubOrg(1, '')
    expect(queries.getPromoGithubOrg(1)).toBeNull()
  })
})

describe('Lumen repos', () => {
  let repoId

  it('upsertLumenRepo creates new', () => {
    const repo = queries.upsertLumenRepo({
      promoId: 1, owner: 'cesi-2026', repo: 'projet-01-python', defaultBranch: 'main',
    })
    repoId = repo.id
    expect(repo.owner).toBe('cesi-2026')
    expect(repo.repo).toBe('projet-01-python')
    expect(repo.default_branch).toBe('main')
    expect(repo.manifest_json).toBeNull()
  })

  it('upsertLumenRepo is idempotent on (promo, owner, repo)', () => {
    const again = queries.upsertLumenRepo({
      promoId: 1, owner: 'cesi-2026', repo: 'projet-01-python', defaultBranch: 'develop',
    })
    expect(again.id).toBe(repoId)
    expect(again.default_branch).toBe('develop')
  })

  it('updateLumenRepoManifest stores valid manifest', () => {
    queries.updateLumenRepoManifest(repoId, {
      manifestJson: JSON.stringify({ project: 'Python 101', chapters: [{ path: 'c1.md', title: 'Intro' }] }),
      manifestError: null,
      lastCommitSha: 'abc123',
    })
    const repo = queries.getLumenRepo(repoId)
    expect(repo.last_commit_sha).toBe('abc123')
    expect(repo.manifest_error).toBeNull()
    expect(JSON.parse(repo.manifest_json).project).toBe('Python 101')
  })

  it('updateLumenRepoManifest records parse error', () => {
    queries.updateLumenRepoManifest(repoId, {
      manifestJson: null,
      manifestError: 'YAML invalide',
      lastCommitSha: 'def456',
    })
    const repo = queries.getLumenRepo(repoId)
    expect(repo.manifest_json).toBeNull()
    expect(repo.manifest_error).toBe('YAML invalide')
    expect(repo.last_commit_sha).toBe('def456')
  })

  it('getLumenReposForPromo returns all promo repos', () => {
    queries.upsertLumenRepo({ promoId: 1, owner: 'cesi-2026', repo: 'projet-02' })
    const list = queries.getLumenReposForPromo(1)
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.every((r) => r.promo_id === 1)).toBe(true)
  })

  it('pruneLumenReposForPromo removes repos not in keepIds', () => {
    queries.pruneLumenReposForPromo(1, [repoId])
    const list = queries.getLumenReposForPromo(1)
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(repoId)
  })

  it('pruneLumenReposForPromo with empty keepIds wipes all', () => {
    queries.pruneLumenReposForPromo(1, [])
    expect(queries.getLumenReposForPromo(1).length).toBe(0)
  })
})

describe('Lumen file cache', () => {
  let repoId

  beforeAll(() => {
    const repo = queries.upsertLumenRepo({ promoId: 1, owner: 'cesi', repo: 'cache-test' })
    repoId = repo.id
  })

  it('upsertLumenCachedFile + getLumenCachedFile', () => {
    queries.upsertLumenCachedFile(repoId, 'cours/01.md', 'sha1', '# Hello')
    const cached = queries.getLumenCachedFile(repoId, 'cours/01.md')
    expect(cached.sha).toBe('sha1')
    expect(cached.content).toBe('# Hello')
  })

  it('upsert updates content when sha differs', () => {
    queries.upsertLumenCachedFile(repoId, 'cours/01.md', 'sha2', '# World')
    const cached = queries.getLumenCachedFile(repoId, 'cours/01.md')
    expect(cached.sha).toBe('sha2')
    expect(cached.content).toBe('# World')
  })

  it('returns null for unknown path', () => {
    expect(queries.getLumenCachedFile(repoId, 'missing.md')).toBeNull()
  })

  it('clearLumenFileCacheForRepo removes all', () => {
    queries.clearLumenFileCacheForRepo(repoId)
    expect(queries.getLumenCachedFile(repoId, 'cours/01.md')).toBeNull()
  })

  it('pruneLumenFileCacheForRepo removes files not in keepPaths', () => {
    queries.upsertLumenCachedFile(repoId, 'a.md', 's1', '# A')
    queries.upsertLumenCachedFile(repoId, 'b.md', 's2', '# B')
    queries.upsertLumenCachedFile(repoId, 'c.md', 's3', '# C')
    queries.pruneLumenFileCacheForRepo(repoId, ['a.md', 'c.md'])
    expect(queries.getLumenCachedFile(repoId, 'a.md')).not.toBeNull()
    expect(queries.getLumenCachedFile(repoId, 'b.md')).toBeNull()
    expect(queries.getLumenCachedFile(repoId, 'c.md')).not.toBeNull()
  })

  it('pruneLumenFileCacheForRepo with empty keepPaths is a noop (manifest invalide)', () => {
    queries.upsertLumenCachedFile(repoId, 'd.md', 's4', '# D')
    queries.pruneLumenFileCacheForRepo(repoId, [])
    expect(queries.getLumenCachedFile(repoId, 'd.md')).not.toBeNull()
  })
})

describe('Lumen chapter notes', () => {
  let repoId
  const studentId = 1

  beforeAll(() => {
    const repo = queries.upsertLumenRepo({ promoId: 1, owner: 'cesi', repo: 'notes-test' })
    repoId = repo.id
  })

  it('upsert + get', () => {
    const note = queries.upsertLumenChapterNote(studentId, repoId, 'c1.md', 'Mes notes privees')
    expect(note.content).toBe('Mes notes privees')
    expect(note.student_id).toBe(studentId)
  })

  it('update in place', () => {
    queries.upsertLumenChapterNote(studentId, repoId, 'c1.md', 'Updated')
    const note = queries.getLumenChapterNote(studentId, repoId, 'c1.md')
    expect(note.content).toBe('Updated')
  })

  it('caps content at 10k chars', () => {
    const huge = 'x'.repeat(20_000)
    queries.upsertLumenChapterNote(studentId, repoId, 'c2.md', huge)
    const note = queries.getLumenChapterNote(studentId, repoId, 'c2.md')
    expect(note.content.length).toBe(10_000)
  })

  it('getStudentLumenNotes excludes empty notes', () => {
    queries.upsertLumenChapterNote(studentId, repoId, 'c3.md', '')
    const notes = queries.getStudentLumenNotes(studentId)
    const paths = notes.map((n) => n.path)
    expect(paths).not.toContain('c3.md')
    expect(paths).toContain('c1.md')
  })

  it('deleteLumenChapterNote removes it', () => {
    queries.deleteLumenChapterNote(studentId, repoId, 'c1.md')
    expect(queries.getLumenChapterNote(studentId, repoId, 'c1.md')).toBeNull()
  })
})

describe('Lumen chapter reads', () => {
  let repoId
  const studentId = 1

  beforeAll(() => {
    const repo = queries.upsertLumenRepo({ promoId: 1, owner: 'cesi', repo: 'reads-test' })
    repoId = repo.id
  })

  it('markLumenChapterRead is idempotent', () => {
    queries.markLumenChapterRead(studentId, repoId, 'c1.md')
    queries.markLumenChapterRead(studentId, repoId, 'c1.md')
    const reads = queries.getStudentLumenReads(studentId)
    const count = reads.filter((r) => r.repo_id === repoId && r.path === 'c1.md').length
    expect(count).toBe(1)
  })

  it('getLumenReadCountsForRepo counts distinct students per path', () => {
    queries.markLumenChapterRead(studentId, repoId, 'c2.md')
    const counts = queries.getLumenReadCountsForRepo(repoId)
    const c2 = counts.find((c) => c.path === 'c2.md')
    expect(c2.readers).toBe(1)
  })

  it('getLumenStatsForPromo aggregates', () => {
    const stats = queries.getLumenStatsForPromo(1)
    expect(stats.repos).toBeGreaterThanOrEqual(1)
    expect(typeof stats.reads).toBe('number')
  })
})
