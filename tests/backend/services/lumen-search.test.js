/**
 * Tests pour le FTS5 fulltext search Lumen (v59).
 * Couvre :
 *   - upsert idempotent (DELETE + INSERT)
 *   - prune par repo (cascade au sync)
 *   - search basique + accents (unicode61 + remove_diacritics)
 *   - visibility filtering par repoIds
 *   - snippet() avec tags <mark>
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only-32chars!!'
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  queries = require('../../../server/db/models/lumen')
})

afterAll(() => teardownTestDb())

beforeEach(() => {
  getTestDb().prepare('DELETE FROM lumen_chapter_fts').run()
})

describe('upsertLumenChapterFts', () => {
  it('insere un nouveau chapitre dans l\'index', () => {
    queries.upsertLumenChapterFts(1, 'README.md', 'Introduction', 'JavaScript est un langage de programmation')

    const results = queries.searchLumenChapters({
      repoIds: [1],
      query: '"javascript"',
      limit: 10,
    })
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      repo_id: 1,
      chapter_path: 'README.md',
      title: 'Introduction',
    })
  })

  it('idempotent : re-upsert remplace le contenu', () => {
    queries.upsertLumenChapterFts(1, 'README.md', 'Intro v1', 'Python est un langage')
    queries.upsertLumenChapterFts(1, 'README.md', 'Intro v2', 'Rust est un langage')

    // Query v1 ne match plus
    expect(queries.searchLumenChapters({ repoIds: [1], query: '"python"' })).toHaveLength(0)
    // Query v2 match
    const r = queries.searchLumenChapters({ repoIds: [1], query: '"rust"' })
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Intro v2')
  })

  it('multi-chapitres dans le meme repo', () => {
    queries.upsertLumenChapterFts(1, 'cours/01.md', 'Variables', 'Une variable stocke une valeur')
    queries.upsertLumenChapterFts(1, 'cours/02.md', 'Fonctions', 'Une fonction est reutilisable')

    const r = queries.searchLumenChapters({ repoIds: [1], query: '"variable"' })
    expect(r).toHaveLength(1)
    expect(r[0].chapter_path).toBe('cours/01.md')
  })
})

describe('pruneLumenChapterFtsForRepo', () => {
  it('supprime les chapitres non listes dans keepPaths', () => {
    queries.upsertLumenChapterFts(1, 'cours/01.md', 'Chap1', 'contenu A')
    queries.upsertLumenChapterFts(1, 'cours/02.md', 'Chap2', 'contenu B')
    queries.upsertLumenChapterFts(1, 'cours/03.md', 'Chap3', 'contenu C')

    queries.pruneLumenChapterFtsForRepo(1, ['cours/01.md', 'cours/03.md'])

    const all = getTestDb().prepare('SELECT chapter_path FROM lumen_chapter_fts WHERE repo_id = 1').all()
    const paths = all.map((r) => r.chapter_path).sort()
    expect(paths).toEqual(['cours/01.md', 'cours/03.md'])
  })

  it('keepPaths vide supprime tout le repo', () => {
    queries.upsertLumenChapterFts(1, 'cours/01.md', 'Chap1', 'contenu')
    queries.upsertLumenChapterFts(2, 'cours/01.md', 'Chap1', 'contenu')

    queries.pruneLumenChapterFtsForRepo(1, [])

    // Repo 1 vide, repo 2 preserve
    expect(queries.searchLumenChapters({ repoIds: [1], query: '"contenu"' })).toHaveLength(0)
    expect(queries.searchLumenChapters({ repoIds: [2], query: '"contenu"' })).toHaveLength(1)
  })
})

describe('searchLumenChapters', () => {
  beforeEach(() => {
    queries.upsertLumenChapterFts(1, 'cours/01.md', 'Heritage et polymorphisme', 'En POO le concept d heritage permet la reutilisation de code')
    queries.upsertLumenChapterFts(1, 'cours/02.md', 'Interfaces', 'Les interfaces definissent des contrats')
    queries.upsertLumenChapterFts(2, 'masque.md', 'Secret', 'Ce contenu est masque aux etudiants')
  })

  it('filtre sur repoIds : un repo non autorise ne ressort pas', () => {
    const r = queries.searchLumenChapters({ repoIds: [1], query: '"secret"' })
    expect(r).toHaveLength(0)

    // Mais si on autorise le repo 2 c'est visible
    const r2 = queries.searchLumenChapters({ repoIds: [1, 2], query: '"secret"' })
    expect(r2).toHaveLength(1)
    expect(r2[0].repo_id).toBe(2)
  })

  it('matches sur le titre ET le contenu', () => {
    const byTitle = queries.searchLumenChapters({ repoIds: [1, 2], query: '"heritage"' })
    expect(byTitle).toHaveLength(1)
    expect(byTitle[0].chapter_path).toBe('cours/01.md')

    const byContent = queries.searchLumenChapters({ repoIds: [1, 2], query: '"contrats"' })
    expect(byContent).toHaveLength(1)
    expect(byContent[0].chapter_path).toBe('cours/02.md')
  })

  it('accents : "herite" matche "heritage" (remove_diacritics)', () => {
    queries.upsertLumenChapterFts(1, 'cours/03.md', 'Accents', 'Les classes héritées gardent les méthodes')
    const r = queries.searchLumenChapters({ repoIds: [1], query: '"heritees"' })
    // remove_diacritics=2 : "héritées" devient "heritees" a l'indexation,
    // "heritees" en query matche
    expect(r.length).toBeGreaterThanOrEqual(1)
    expect(r.find((row) => row.chapter_path === 'cours/03.md')).toBeDefined()
  })

  it('snippet contient des tags <mark> autour du terme matchant', () => {
    const r = queries.searchLumenChapters({ repoIds: [1], query: '"contrats"' })
    expect(r).toHaveLength(1)
    expect(r[0].snippet).toContain('<mark>')
    expect(r[0].snippet).toContain('</mark>')
  })

  it('limit par defaut = 50, parametrable', () => {
    for (let i = 0; i < 12; i++) {
      queries.upsertLumenChapterFts(1, `cours/many-${i}.md`, `Titre ${i}`, 'alpha beta gamma')
    }
    expect(queries.searchLumenChapters({ repoIds: [1], query: '"alpha"', limit: 5 })).toHaveLength(5)
    expect(queries.searchLumenChapters({ repoIds: [1], query: '"alpha"' }).length).toBeGreaterThanOrEqual(12)
  })

  it('query vide ou repoIds vide : no-op', () => {
    expect(queries.searchLumenChapters({ repoIds: [], query: '"test"' })).toEqual([])
    expect(queries.searchLumenChapters({ repoIds: [1], query: '' })).toEqual([])
  })

  it('XSS-safe : un payload HTML stocke ressort echappe (snippet sanitize)', () => {
    queries.upsertLumenChapterFts(
      1, 'cours/xss.md', 'Titre <script>',
      'avant <img src=x onerror=alert(1)> apres token-cible',
    )
    const r = queries.searchLumenChapters({ repoIds: [1], query: '"token-cible"' })
    expect(r).toHaveLength(1)
    // Le titre est echappe
    expect(r[0].title).toBe('Titre &lt;script&gt;')
    // Le snippet contient le payload echappe (pas de < brut sauf pour <mark>)
    expect(r[0].snippet).not.toContain('<img')
    expect(r[0].snippet).not.toContain('<script')
    expect(r[0].snippet).toContain('&lt;img')
    // Mais le mark FTS5 est present comme tag valide
    expect(r[0].snippet).toContain('<mark>')
    expect(r[0].snippet).toContain('</mark>')
  })
})
