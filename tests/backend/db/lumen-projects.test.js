/**
 * Tests de l'integration Lumen <-> Projects :
 * - normalizeProjectName / findProjectByNormalizedName (accents, casse, ambiguite)
 * - setLumenRepoProjectFromManifest (flow yaml)
 * - setLumenRepoProject (flow UI fallback)
 * - getLumenReposByProjectName (lookup cote frontend)
 * - getUnlinkedLumenReposForPromo (picker UI)
 */
const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let lumen
let projects

beforeAll(() => {
  setupTestDb()
  lumen = require('../../../server/db/models/lumen')
  projects = require('../../../server/db/models/projects')
})

afterAll(() => teardownTestDb())

describe('normalizeProjectName', () => {
  it('trim + lowercase + retire accents', () => {
    expect(projects.normalizeProjectName('  API Météo en Python  ')).toBe('api meteo en python')
  })

  it('gere les strings vides et null', () => {
    expect(projects.normalizeProjectName('')).toBe('')
    expect(projects.normalizeProjectName(null)).toBe('')
    expect(projects.normalizeProjectName(undefined)).toBe('')
  })

  it('preserve la ponctuation non-accentuee', () => {
    expect(projects.normalizeProjectName("L'Oreal - Projet 1")).toBe("l'oreal - projet 1")
  })
})

describe('findProjectByNormalizedName', () => {
  let promoId
  beforeAll(() => {
    const db = getTestDb()
    db.prepare('INSERT INTO promotions (name) VALUES (?)').run('TestPromo')
    promoId = db.prepare('SELECT id FROM promotions WHERE name = ?').get('TestPromo').id
    projects.createProject({ promoId, name: 'API Météo en Python', createdBy: 1 })
    projects.createProject({ promoId, name: 'Base de Données', createdBy: 1 })
  })

  it('match exact par nom', () => {
    const r = projects.findProjectByNormalizedName(promoId, 'API Météo en Python')
    expect(r.ok).toBe(true)
    expect(r.project.name).toBe('API Météo en Python')
  })

  it('match insensible a la casse', () => {
    const r = projects.findProjectByNormalizedName(promoId, 'api meteo EN python')
    expect(r.ok).toBe(true)
  })

  it('match en ignorant les accents', () => {
    const r = projects.findProjectByNormalizedName(promoId, 'Base de Donnees')
    expect(r.ok).toBe(true)
    expect(r.project.name).toBe('Base de Données')
  })

  it('match en trimm les espaces', () => {
    const r = projects.findProjectByNormalizedName(promoId, '   API Meteo en Python   ')
    expect(r.ok).toBe(true)
  })

  it('retourne not_found quand aucun match', () => {
    const r = projects.findProjectByNormalizedName(promoId, 'projet inexistant')
    expect(r.ok).toBe(false)
    expect(r.code).toBe('not_found')
  })

  it('retourne not_found pour string vide', () => {
    const r = projects.findProjectByNormalizedName(promoId, '')
    expect(r.ok).toBe(false)
    expect(r.code).toBe('not_found')
  })

  it('detecte une ambiguite (meme nom normalise deux fois)', () => {
    // Projet duplique dans la meme promo (legal car projects.name n'est pas UNIQUE)
    projects.createProject({ promoId, name: 'api meteo en python', createdBy: 1 })
    const r = projects.findProjectByNormalizedName(promoId, 'API Météo en Python')
    expect(r.ok).toBe(false)
    expect(r.code).toBe('ambiguous')
    expect(r.matches.length).toBeGreaterThanOrEqual(2)
  })

  it('scope par promo : un projet dans une autre promo n\'est pas matche', () => {
    const db = getTestDb()
    db.prepare('INSERT INTO promotions (name) VALUES (?)').run('AutrePromo')
    const otherPromoId = db.prepare('SELECT id FROM promotions WHERE name = ?').get('AutrePromo').id
    projects.createProject({ promoId: otherPromoId, name: 'API Météo en Python', createdBy: 1 })
    // Toujours ambigu dans la premiere promo (2 matches), pas 3
    const r = projects.findProjectByNormalizedName(promoId, 'API Météo en Python')
    expect(r.code).toBe('ambiguous')
    expect(r.matches.length).toBe(2)
  })
})

describe('setLumenRepoProjectFromManifest + setLumenRepoProject', () => {
  let promoId
  let projectId
  let repoId

  beforeAll(() => {
    const db = getTestDb()
    db.prepare('INSERT INTO promotions (name) VALUES (?)').run('LinkPromo')
    promoId = db.prepare('SELECT id FROM promotions WHERE name = ?').get('LinkPromo').id
    projectId = projects.createProject({ promoId, name: 'Projet Link', createdBy: 1 })
    const repo = lumen.upsertLumenRepo({ promoId, owner: 'cesi', repo: 'linked-repo' })
    repoId = repo.id
  })

  it('setLumenRepoProjectFromManifest ecrit project_id quand cursusProject est present', () => {
    lumen.setLumenRepoProjectFromManifest(repoId, {
      projectId,
      hasCursusProjectField: true,
    })
    const repo = lumen.getLumenRepo(repoId)
    expect(repo.project_id).toBe(projectId)
  })

  it('setLumenRepoProjectFromManifest remet NULL quand cursusProject present mais pas de match', () => {
    lumen.setLumenRepoProjectFromManifest(repoId, {
      projectId: null,
      hasCursusProjectField: true,
    })
    const repo = lumen.getLumenRepo(repoId)
    expect(repo.project_id).toBeNull()
  })

  it('setLumenRepoProjectFromManifest ne touche PAS project_id quand cursusProject absent', () => {
    lumen.setLumenRepoProject(repoId, projectId)
    lumen.setLumenRepoProjectFromManifest(repoId, {
      projectId: null,
      hasCursusProjectField: false,
    })
    const repo = lumen.getLumenRepo(repoId)
    expect(repo.project_id).toBe(projectId)
  })

  it('setLumenRepoProject ecrit directement la valeur (UI fallback)', () => {
    lumen.setLumenRepoProject(repoId, null)
    expect(lumen.getLumenRepo(repoId).project_id).toBeNull()
    lumen.setLumenRepoProject(repoId, projectId)
    expect(lumen.getLumenRepo(repoId).project_id).toBe(projectId)
  })
})

describe('getLumenReposByProjectName', () => {
  let promoId
  let projectId

  beforeAll(() => {
    const db = getTestDb()
    db.prepare('INSERT INTO promotions (name) VALUES (?)').run('QueryPromo')
    promoId = db.prepare('SELECT id FROM promotions WHERE name = ?').get('QueryPromo').id
    projectId = projects.createProject({ promoId, name: 'Mon Projet Python', createdBy: 1 })
    const r1 = lumen.upsertLumenRepo({ promoId, owner: 'cesi', repo: 'repo-a' })
    const r2 = lumen.upsertLumenRepo({ promoId, owner: 'cesi', repo: 'repo-b' })
    const r3 = lumen.upsertLumenRepo({ promoId, owner: 'cesi', repo: 'repo-c-unlinked' })
    lumen.setLumenRepoProject(r1.id, projectId)
    lumen.setLumenRepoProject(r2.id, projectId)
    // r3 reste unlinked
  })

  it('liste les repos lies (par nom normalise)', () => {
    const repos = lumen.getLumenReposByProjectName(promoId, 'mon projet python')
    expect(repos.length).toBe(2)
    expect(repos.every((r) => r.project_id === projectId)).toBe(true)
  })

  it('retourne [] si le projet n\'existe pas', () => {
    const repos = lumen.getLumenReposByProjectName(promoId, 'inexistant')
    expect(repos).toEqual([])
  })

  it('retourne [] sur un nom vide', () => {
    expect(lumen.getLumenReposByProjectName(promoId, '')).toEqual([])
    expect(lumen.getLumenReposByProjectName(promoId, '   ')).toEqual([])
  })
})

describe('getUnlinkedLumenReposForPromo', () => {
  it('retourne les repos sans project_id dans la promo', () => {
    const db = getTestDb()
    db.prepare('INSERT INTO promotions (name) VALUES (?)').run('UnlinkedPromo')
    const promoId = db.prepare('SELECT id FROM promotions WHERE name = ?').get('UnlinkedPromo').id
    const projectId = projects.createProject({ promoId, name: 'P', createdBy: 1 })
    const r1 = lumen.upsertLumenRepo({ promoId, owner: 'o', repo: 'unlinked-1' })
    const r2 = lumen.upsertLumenRepo({ promoId, owner: 'o', repo: 'linked' })
    lumen.setLumenRepoProject(r2.id, projectId)
    lumen.upsertLumenRepo({ promoId, owner: 'o', repo: 'unlinked-2' })

    const unlinked = lumen.getUnlinkedLumenReposForPromo(promoId)
    expect(unlinked.length).toBe(2)
    expect(unlinked.every((r) => r.project_id === null)).toBe(true)
    expect(unlinked.map((r) => r.repo).sort()).toEqual(['unlinked-1', 'unlinked-2'])
  })
})
