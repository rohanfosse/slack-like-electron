/**
 * Tests du schema Lumen et de l'inference de categorie.
 */
const { inferRepoKind, KIND_VALUES } = require('../../../server/services/lumenManifest')

// ── Categorisation v2.63 (inferRepoKind) ────────────────────────────────────

describe('inferRepoKind : heuristique de classification', () => {
  it('detecte readme', () => {
    expect(inferRepoKind('promo-readme')).toBe('readme')
    expect(inferRepoKind('readme-php')).toBe('readme')
    expect(inferRepoKind('README')).toBe('readme')
    expect(inferRepoKind('.github')).toBe('readme')
  })

  it('detecte prosit', () => {
    expect(inferRepoKind('prosit-mvc')).toBe('prosit')
    expect(inferRepoKind('prosits-php')).toBe('prosit')
    expect(inferRepoKind('p1-prosit-bdd')).toBe('prosit')
  })

  it('detecte workshop / atelier', () => {
    expect(inferRepoKind('workshop-1')).toBe('workshop')
    expect(inferRepoKind('atelier-react')).toBe('workshop')
  })

  it('detecte mini-projet (toutes les variantes orthographiques)', () => {
    expect(inferRepoKind('mini-projet-bdd')).toBe('miniproject')
    expect(inferRepoKind('miniproject-1')).toBe('miniproject')
    expect(inferRepoKind('mini_projet_php')).toBe('miniproject')
    expect(inferRepoKind('mini-project-react')).toBe('miniproject')
  })

  it('detecte cours / course', () => {
    expect(inferRepoKind('cours-php')).toBe('course')
    expect(inferRepoKind('course-react')).toBe('course')
  })

  it('detecte groupe etudiant', () => {
    expect(inferRepoKind('groupe-equipe-a')).toBe('group')
    expect(inferRepoKind('team-1')).toBe('group')
    expect(inferRepoKind('group-react')).toBe('group')
    expect(inferRepoKind('rendu-equipe-b')).toBe('group')
  })

  it('detecte projet (apres group pour ne pas confondre group-project)', () => {
    expect(inferRepoKind('projet-final')).toBe('project')
    expect(inferRepoKind('project-2024')).toBe('project')
  })

  it('detecte etudiant individuel (Nom-Prenom capitalise, v2.66)', () => {
    expect(inferRepoKind('Astruc-Sebastien')).toBe('student')
    expect(inferRepoKind('Bougette-Jean')).toBe('student')
    expect(inferRepoKind('Chahbouni-Ali')).toBe('student')
    expect(inferRepoKind('Rohan-Fosse')).toBe('student')
    expect(inferRepoKind('Mekhmoukhen-Laurys')).toBe('student')
  })

  it('ne detecte PAS comme student les patterns ambigus', () => {
    expect(inferRepoKind('astruc-sebastien')).toBe('course')
    expect(inferRepoKind('Sebastien')).toBe('course')
    expect(inferRepoKind('Eleve-2024')).toBe('course')
  })

  it('defaut prudent : course pour les noms ambigus', () => {
    expect(inferRepoKind('random-name')).toBe('course')
    expect(inferRepoKind('truc')).toBe('course')
  })

  it('robuste aux entrees invalides', () => {
    expect(inferRepoKind(null)).toBe('course')
    expect(inferRepoKind(undefined)).toBe('course')
    expect(inferRepoKind(42)).toBe('course')
  })

  it('toutes les valeurs retournees sont dans KIND_VALUES', () => {
    const samples = ['readme', 'prosit-x', 'workshop-1', 'mini-projet', 'cours', 'groupe-a', 'project', 'rand']
    for (const s of samples) {
      expect(KIND_VALUES).toContain(inferRepoKind(s))
    }
  })
})
