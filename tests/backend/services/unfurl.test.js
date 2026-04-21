// ─── Tests service unfurl : SSRF, normalisation, extraction ─────────────────
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars!!'
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

beforeAll(() => setupTestDb())
afterAll(() => teardownTestDb())

const { isPrivateIp, normalizeUrl, extractUrls, assertPublicHost } = require('../../../server/services/unfurl')

describe('isPrivateIp', () => {
  test.each([
    ['127.0.0.1', true],
    ['127.5.5.5', true],
    ['10.0.0.1', true],
    ['10.255.255.255', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    ['172.32.0.1', false],    // hors plage 16-31 => publique
    ['192.168.1.1', true],
    ['169.254.169.254', true], // AWS metadata endpoint
    ['100.64.0.1', true],     // CGNAT
    ['0.0.0.0', true],
    ['224.0.0.1', true],      // multicast
    ['8.8.8.8', false],       // public
    ['1.1.1.1', false],
    ['::1', true],
    ['::', true],
    ['fe80::1', true],
    ['fc00::1', true],
    ['ff02::1', true],
    ['::ffff:127.0.0.1', true], // IPv4 mapped sur loopback
    ['::ffff:8.8.8.8', false],
    ['2001:4860:4860::8888', false], // Google DNS v6
    ['not-an-ip', true],      // ambigu -> safe default
    ['', true],
    [null, true],
  ])('isPrivateIp(%s) === %s', (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected)
  })
})

describe('normalizeUrl', () => {
  test('accepte http/https', () => {
    expect(normalizeUrl('https://example.com/page')).toBe('https://example.com/page')
    expect(normalizeUrl('http://example.com/')).toBe('http://example.com/')
  })
  test('rejette les schemes autres', () => {
    expect(normalizeUrl('ftp://example.com')).toBeNull()
    expect(normalizeUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('data:text/html,<script>')).toBeNull()
  })
  test('strip fragment', () => {
    expect(normalizeUrl('https://example.com/page#anchor')).toBe('https://example.com/page')
  })
  test('strip utm_* params', () => {
    const n = normalizeUrl('https://example.com/?utm_source=test&utm_medium=x&keep=1')
    expect(n).toContain('keep=1')
    expect(n).not.toContain('utm_source')
    expect(n).not.toContain('utm_medium')
  })
  test('rejette URLs trop longues', () => {
    const long = 'https://example.com/' + 'a'.repeat(3000)
    expect(normalizeUrl(long)).toBeNull()
  })
  test('rejette entrees invalides', () => {
    expect(normalizeUrl(null)).toBeNull()
    expect(normalizeUrl(123)).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
  })
})

describe('extractUrls', () => {
  test('extrait les URLs http/https d un texte', () => {
    const urls = extractUrls('Visitez https://example.com et http://other.fr/path')
    expect(urls).toEqual(expect.arrayContaining([
      'https://example.com/',
      'http://other.fr/path',
    ]))
  })
  test('dedup', () => {
    const urls = extractUrls('https://a.fr et https://a.fr encore')
    expect(urls).toHaveLength(1)
  })
  test('max 5 URLs', () => {
    const text = Array.from({ length: 10 }, (_, i) => `https://site-${i}.fr`).join(' ')
    expect(extractUrls(text)).toHaveLength(5)
  })
  test('strip trailing ponctuation', () => {
    const urls = extractUrls('Regarde https://example.com/page.')
    expect(urls[0]).toBe('https://example.com/page')
  })
  test('vide si texte sans URL', () => {
    expect(extractUrls('pas de lien ici')).toEqual([])
    expect(extractUrls('')).toEqual([])
  })
})

describe('assertPublicHost', () => {
  test('rejette une IP privee directe', async () => {
    await expect(assertPublicHost('127.0.0.1')).rejects.toThrow(/privee/)
    await expect(assertPublicHost('10.0.0.1')).rejects.toThrow(/privee/)
    await expect(assertPublicHost('169.254.169.254')).rejects.toThrow(/privee/)
  })

  test('accepte une IP publique', async () => {
    const ips = await assertPublicHost('1.1.1.1')
    expect(ips).toContain('1.1.1.1')
  })

  // Note : on ne teste pas la resolution DNS en ligne pour ne pas dependre
  // d'Internet dans la CI. Les tests d'IPs directes couvrent la logique
  // principale.
})

describe('cache link_previews', () => {
  test('upsert puis lecture cache', () => {
    const { upsertLinkPreview, getLinkPreview } = require('../../../server/db/models/linkPreviews')
    upsertLinkPreview({
      url: 'https://test.com/page',
      title: 'Test', description: 'Desc',
      image: 'https://test.com/img.png', siteName: 'Test Site', status: 200,
    })
    const cached = getLinkPreview('https://test.com/page')
    expect(cached).not.toBeNull()
    expect(cached.title).toBe('Test')
    expect(cached.site_name).toBe('Test Site')
  })

  test('status 0 (failure) reste cache pour eviter retry boucle', () => {
    const { upsertLinkPreview, getLinkPreview } = require('../../../server/db/models/linkPreviews')
    upsertLinkPreview({ url: 'https://dead.example.com', status: 0 })
    const cached = getLinkPreview('https://dead.example.com')
    expect(cached).not.toBeNull()
    expect(cached.status).toBe(0)
  })

  test('purgeExpiredLinkPreviews supprime les entrees expirees', () => {
    const { upsertLinkPreview, purgeExpiredLinkPreviews, getLinkPreview } = require('../../../server/db/models/linkPreviews')
    upsertLinkPreview({ url: 'https://soon.com' })
    // Forcer une expiration dans le passe
    getTestDb().prepare(
      `UPDATE link_previews SET expires_at = datetime('now', '-1 hour') WHERE url = ?`
    ).run('https://soon.com')
    purgeExpiredLinkPreviews()
    expect(getLinkPreview('https://soon.com')).toBeNull()
  })
})
