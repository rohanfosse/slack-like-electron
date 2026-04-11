/**
 * Tests du parser de manifest cursus.yaml (Lumen).
 * Verifie l'acceptation des formats valides et le rejet clair des formats
 * invalides, pour que l'UI puisse afficher des messages actionnables.
 */
const { parseManifest } = require('../../../server/services/lumenManifest')

describe('parseManifest : entrees valides', () => {
  it('manifest minimal (project + chapters)', () => {
    const yaml = `
project: "Projet 01 Python"
chapters:
  - title: Intro
    path: cours/01-intro.md
`
    const r = parseManifest(yaml)
    expect(r.ok).toBe(true)
    expect(r.manifest.project).toBe('Projet 01 Python')
    expect(r.manifest.chapters).toHaveLength(1)
    expect(r.manifest.chapters[0].path).toBe('cours/01-intro.md')
  })

  it('manifest complet avec metadata et ressources', () => {
    const yaml = `
project: "Projet avance"
module: "Fondamentaux"
author: "Rohan Fosse"
summary: "Cours d introduction"
chapters:
  - title: Intro
    path: cours/01.md
    duration: 30
    prerequis: []
  - title: Variables
    path: cours/02.md
    duration: 45
    prerequis: ["01-intro"]
resources:
  - path: ressources/cheat.pdf
    kind: pdf
    title: Cheatsheet
`
    const r = parseManifest(yaml)
    expect(r.ok).toBe(true)
    expect(r.manifest.module).toBe('Fondamentaux')
    expect(r.manifest.author).toBe('Rohan Fosse')
    expect(r.manifest.chapters).toHaveLength(2)
    expect(r.manifest.chapters[1].duration).toBe(45)
    expect(r.manifest.resources).toHaveLength(1)
  })
})

describe('parseManifest : entrees invalides', () => {
  it('rejette une chaine vide', () => {
    const r = parseManifest('')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/vide/i)
  })

  it('rejette un YAML mal forme', () => {
    const r = parseManifest('project:\n  [unbalanced')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/YAML invalide/i)
  })

  it('rejette l absence de project', () => {
    const r = parseManifest(`
chapters:
  - title: Intro
    path: c1.md
`)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/project/i)
  })

  it('rejette l absence de chapters', () => {
    const r = parseManifest(`project: X`)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/chapters/i)
  })

  it('rejette un chapitre sans .md', () => {
    const r = parseManifest(`
project: X
chapters:
  - title: Intro
    path: cours/01.txt
`)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/md/i)
  })

  it('rejette un chapitre sans titre', () => {
    const r = parseManifest(`
project: X
chapters:
  - path: cours/01.md
`)
    expect(r.ok).toBe(false)
  })

  it('rejette des champs inconnus dans chapter (strict)', () => {
    const r = parseManifest(`
project: X
chapters:
  - title: Intro
    path: cours/01.md
    fakeField: oops
`)
    expect(r.ok).toBe(false)
  })

  it('rejette des chapters de type non-array', () => {
    const r = parseManifest(`
project: X
chapters: not-an-array
`)
    expect(r.ok).toBe(false)
  })
})
