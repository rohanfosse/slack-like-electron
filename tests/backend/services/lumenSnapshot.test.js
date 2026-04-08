/**
 * Tests unitaires pour le service lumenSnapshot.
 * Mock de fetch global pour simuler l'API GitHub sans sortie reseau.
 */
const svc = require('../../../server/services/lumenSnapshot')
const { SnapshotError, ErrorCodes } = svc

// ─── Helpers pour construire des reponses fetch factices ───────────────────

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key) => headers[key.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body),
  })
}

function errorResponse(status, { headers = {} } = {}) {
  return Promise.resolve({
    ok: false,
    status,
    headers: {
      get: (key) => headers[key.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve({ message: 'error' }),
  })
}

function b64(str) {
  return Buffer.from(str, 'utf-8').toString('base64')
}

// ─── parseGitHubUrl ─────────────────────────────────────────────────────────

describe('parseGitHubUrl', () => {
  it('accepte un URL simple owner/repo', () => {
    expect(svc.parseGitHubUrl('https://github.com/owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('accepte un URL avec trailing slash', () => {
    expect(svc.parseGitHubUrl('https://github.com/owner/repo/')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('accepte un URL avec extension .git', () => {
    expect(svc.parseGitHubUrl('https://github.com/owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('accepte un URL avec sous-chemins supplementaires (ignores)', () => {
    expect(svc.parseGitHubUrl('https://github.com/owner/repo/tree/main/src')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('rejette une URL vide', () => {
    expect(() => svc.parseGitHubUrl('')).toThrow(SnapshotError)
  })

  it('rejette une URL non-HTTPS', () => {
    expect(() => svc.parseGitHubUrl('http://github.com/owner/repo'))
      .toThrow(expect.objectContaining({ code: ErrorCodes.INVALID_URL }))
  })

  it('rejette un host non-github', () => {
    expect(() => svc.parseGitHubUrl('https://gitlab.com/owner/repo'))
      .toThrow(expect.objectContaining({ code: ErrorCodes.INVALID_URL }))
  })

  it('rejette une URL sans owner/repo', () => {
    expect(() => svc.parseGitHubUrl('https://github.com/owner'))
      .toThrow(expect.objectContaining({ code: ErrorCodes.INVALID_URL }))
  })

  it('rejette une URL malformee', () => {
    expect(() => svc.parseGitHubUrl('not a url'))
      .toThrow(expect.objectContaining({ code: ErrorCodes.INVALID_URL }))
  })
})

// ─── validateTreeAgainstLimits ──────────────────────────────────────────────

describe('validateTreeAgainstLimits', () => {
  it('accepte un arbre sous les limites', () => {
    const tree = [
      { path: 'a.py', sha: 'aaa', size: 100 },
      { path: 'b.py', sha: 'bbb', size: 200 },
    ]
    expect(svc.validateTreeAgainstLimits(tree)).toBe(300)
  })

  it('rejette > 200 fichiers', () => {
    const tree = Array.from({ length: 201 }, (_, i) => ({ path: `f${i}.py`, sha: `${i}`, size: 10 }))
    expect(() => svc.validateTreeAgainstLimits(tree))
      .toThrow(expect.objectContaining({ code: ErrorCodes.TOO_MANY_FILES }))
  })

  it('rejette un fichier individuel > 512 Ko', () => {
    const tree = [{ path: 'big.bin', sha: 'x', size: 513 * 1024 }]
    expect(() => svc.validateTreeAgainstLimits(tree))
      .toThrow(expect.objectContaining({ code: ErrorCodes.FILE_SIZE_EXCEEDED }))
  })

  it('rejette un total > 5 Mo', () => {
    const tree = Array.from({ length: 12 }, (_, i) => ({ path: `f${i}`, sha: `${i}`, size: 500 * 1024 }))
    expect(() => svc.validateTreeAgainstLimits(tree))
      .toThrow(expect.objectContaining({ code: ErrorCodes.TOTAL_SIZE_EXCEEDED }))
  })
})

// ─── buildSnapshot (integration avec fetch mocke) ──────────────────────────

describe('buildSnapshot', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockNominalFlow() {
    // 1. GET /repos/:owner/:repo → metadata
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ default_branch: 'main', size: 10 })
    )
    // 2. GET /repos/:owner/:repo/git/trees/main?recursive=1
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        truncated: false,
        tree: [
          { path: 'main.py', type: 'blob', sha: 'sha-main', size: 5 },
          { path: 'utils.py', type: 'blob', sha: 'sha-utils', size: 3 },
          { path: 'docs',    type: 'tree', sha: 'sha-docs',  size: 0 }, // doit etre filtre
        ],
      })
    )
    // 3. GET /repos/:owner/:repo/git/blobs/sha-main
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ encoding: 'base64', content: b64('hello') })
    )
    // 4. GET /repos/:owner/:repo/git/blobs/sha-utils
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ encoding: 'base64', content: b64('bye') })
    )
    // 5. GET /repos/:owner/:repo/commits/main
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ sha: 'abc123def456' })
    )
  }

  it('produit un snapshot complet (cas nominal)', async () => {
    mockNominalFlow()
    const snapshot = await svc.buildSnapshot('https://github.com/owner/repo')

    expect(snapshot).toMatchObject({
      repo_url: 'https://github.com/owner/repo',
      default_branch: 'main',
      commit_sha: 'abc123def456',
      file_count: 2,
      total_size: 8,
    })
    expect(snapshot.files).toHaveLength(2)
    expect(snapshot.files[0]).toMatchObject({ path: 'main.py', size: 5 })
    expect(snapshot.files[0].content_base64).toBe(b64('hello'))
    expect(snapshot.fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('n inclut pas les entries type=tree', async () => {
    mockNominalFlow()
    const snapshot = await svc.buildSnapshot('https://github.com/owner/repo')
    expect(snapshot.files.find(f => f.path === 'docs')).toBeUndefined()
  })

  it('propage REPO_NOT_FOUND sur 404', async () => {
    fetchMock.mockImplementationOnce(() => errorResponse(404))
    await expect(svc.buildSnapshot('https://github.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.REPO_NOT_FOUND })
  })

  it('propage RATE_LIMIT sur 403 avec remaining=0', async () => {
    fetchMock.mockImplementationOnce(() =>
      errorResponse(403, {
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '9999999999' },
      })
    )
    await expect(svc.buildSnapshot('https://github.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.RATE_LIMIT })
  })

  it('propage FETCH_ERROR sur 500', async () => {
    fetchMock.mockImplementationOnce(() => errorResponse(500))
    await expect(svc.buildSnapshot('https://github.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.FETCH_ERROR })
  })

  it('refuse un arbre tronque par GitHub', async () => {
    fetchMock.mockImplementationOnce(() => jsonResponse({ default_branch: 'main' }))
    fetchMock.mockImplementationOnce(() => jsonResponse({ truncated: true, tree: [] }))
    await expect(svc.buildSnapshot('https://github.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.TOO_MANY_FILES })
  })

  it('refuse un projet > 200 fichiers', async () => {
    const tree = Array.from({ length: 201 }, (_, i) => ({
      path: `f${i}.txt`, type: 'blob', sha: `s${i}`, size: 1,
    }))
    fetchMock.mockImplementationOnce(() => jsonResponse({ default_branch: 'main' }))
    fetchMock.mockImplementationOnce(() => jsonResponse({ truncated: false, tree }))
    await expect(svc.buildSnapshot('https://github.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.TOO_MANY_FILES })
  })

  it('rejette les URL non-github', async () => {
    await expect(svc.buildSnapshot('https://gitlab.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.INVALID_URL })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mappe un AbortError en TIMEOUT', async () => {
    fetchMock.mockImplementationOnce(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })
    await expect(svc.buildSnapshot('https://github.com/owner/repo'))
      .rejects.toMatchObject({ code: ErrorCodes.TIMEOUT })
  })

  it('mappe httpStatusFor correctement pour chaque code', () => {
    expect(svc.httpStatusFor[ErrorCodes.INVALID_URL]).toBe(400)
    expect(svc.httpStatusFor[ErrorCodes.REPO_NOT_FOUND]).toBe(404)
    expect(svc.httpStatusFor[ErrorCodes.RATE_LIMIT]).toBe(429)
    expect(svc.httpStatusFor[ErrorCodes.TOO_MANY_FILES]).toBe(413)
    expect(svc.httpStatusFor[ErrorCodes.TIMEOUT]).toBe(504)
    expect(svc.httpStatusFor[ErrorCodes.FETCH_ERROR]).toBe(502)
  })
})
