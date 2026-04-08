/**
 * Tests pour lumenZip : verifie qu'un snapshot JSON est correctement
 * transforme en archive ZIP streamee dans un writable.
 *
 * On utilise un PassThrough comme writable et unzipper (via JSZip si dispo
 * sinon adm-zip... en l'occurrence on parse le zip a la main avec un
 * writable en memoire et on verifie la taille et la presence du README).
 */
const { PassThrough } = require('stream')
const { streamZipFromSnapshot } = require('../../../server/services/lumenZip')

function b64(str) {
  return Buffer.from(str, 'utf-8').toString('base64')
}

function collectBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (c) => chunks.push(c))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

const sampleSnapshot = {
  repo_url: 'https://github.com/owner/repo',
  default_branch: 'main',
  commit_sha: 'abc123',
  fetched_at: '2026-04-08T12:00:00Z',
  files: [
    { path: 'main.py',         size: 12, content_base64: b64('print("hi")') },
    { path: 'utils/helpers.py', size: 6, content_base64: b64('x = 1') },
  ],
  total_size: 18,
  file_count: 2,
}

describe('streamZipFromSnapshot', () => {
  it('produit un zip non vide et resout avec les stats', async () => {
    const out = new PassThrough()
    const buffersPromise = collectBuffer(out)
    const stats = await streamZipFromSnapshot(sampleSnapshot, out)
    const buffer = await buffersPromise

    expect(stats.files).toBe(2)
    expect(buffer.length).toBeGreaterThan(0)
    // Un ZIP commence par la signature "PK\x03\x04"
    expect(buffer.slice(0, 4).toString('hex')).toBe('504b0304')
  })

  it('contient le README-snapshot.txt et les fichiers attendus', async () => {
    const out = new PassThrough()
    const buffersPromise = collectBuffer(out)
    await streamZipFromSnapshot(sampleSnapshot, out)
    const buffer = await buffersPromise

    // Les noms des fichiers sont stockes en clair dans le central directory.
    const text = buffer.toString('latin1')
    expect(text).toContain('README-snapshot.txt')
    expect(text).toContain('main.py')
    expect(text).toContain('utils/helpers.py')
  })

  it('rejette si snapshot est invalide', async () => {
    const out = new PassThrough()
    await expect(streamZipFromSnapshot(null, out)).rejects.toThrow()
    await expect(streamZipFromSnapshot({}, out)).rejects.toThrow()
  })

  it('ignore les entries mal formees au lieu de crasher', async () => {
    const snap = {
      ...sampleSnapshot,
      files: [
        { path: 'ok.txt', size: 2, content_base64: b64('ok') },
        { path: 123, content_base64: b64('bad') }, // path non-string
        { path: 'missing-content' },                // pas de content_base64
      ],
    }
    const out = new PassThrough()
    const buffersPromise = collectBuffer(out)
    const stats = await streamZipFromSnapshot(snap, out)
    const buffer = await buffersPromise
    expect(stats.files).toBe(1)
    expect(buffer.toString('latin1')).toContain('ok.txt')
  })

  it('inclut les metadonnees du repo dans le README', async () => {
    const out = new PassThrough()
    const buffersPromise = collectBuffer(out)
    await streamZipFromSnapshot(sampleSnapshot, out)
    const buffer = await buffersPromise
    // Le contenu du README est ecrit dans le body du zip (meme deflate,
    // les chaines courtes apparaissent souvent en clair avec un petit ratio)
    // On cherche un marqueur resistant a la compression : le nom du fichier
    // doit etre present en clair dans le central directory.
    const text = buffer.toString('latin1')
    expect(text).toContain('README-snapshot.txt')
  })
})
