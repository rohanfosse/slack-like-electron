/**
 * Tests pour utils/documentIcons — couvre les nouvelles fonctions introduites
 * en v2.169 lors de l'unification de TYPE_ICON_MAP (DocumentsView) avec
 * docIconType/iconColors/iconLabels (useDocumentsData).
 *
 * Les tests historiques de `docIconType` / `iconColor` / `iconLabel` /
 * `TYPE_FILTERS` vivent dans tests/frontend/composables/useDocumentsData.test.ts
 * (maintenus pour leur nommage d'origine). Ici on teste ce qui est nouveau :
 *   - iconComponent(type)
 *   - getDocumentIcon(doc) one-shot
 */
import { describe, it, expect } from 'vitest'
import {
  iconComponent,
  getDocumentIcon,
  type DocIconType,
} from '@/utils/documentIcons'
import type { AppDocument } from '@/types'

const ALL_TYPES: DocIconType[] = [
  'image', 'pdf', 'video', 'link', 'file', 'spreadsheet',
  'moodle', 'github', 'linkedin', 'web', 'package',
  'grille', 'note-peda', 'fiche-validation',
]

function makeDoc(overrides: Partial<AppDocument> = {}): AppDocument {
  return {
    id: 1,
    promo_id: 1,
    channel_id: null,
    project: null,
    name: 'test.pdf',
    type: 'file',
    content: 'test.pdf',
    category: null,
    description: null,
    author_name: 'Prof',
    author_type: 'teacher',
    created_at: '2026-04-19T10:00:00Z',
    travail_id: null,
    travail_title: null,
    channel_name: null,
    file_size: null,
    ...overrides,
  } as AppDocument
}

describe('iconComponent', () => {
  it('retourne un composant Vue pour chaque DocIconType', () => {
    for (const t of ALL_TYPES) {
      const component = iconComponent(t)
      expect(component).toBeDefined()
      // Un composant Vue est soit une fonction, soit un objet (defineComponent)
      expect(['function', 'object']).toContain(typeof component)
    }
  })

  it('retourne des composants differents pour des types differents', () => {
    expect(iconComponent('pdf')).not.toBe(iconComponent('image'))
    expect(iconComponent('github')).not.toBe(iconComponent('linkedin'))
    expect(iconComponent('link')).not.toBe(iconComponent('file'))
  })
})

describe('getDocumentIcon', () => {
  it('retourne les 4 proprietes { type, color, label, component }', () => {
    const icon = getDocumentIcon(makeDoc({ content: 'report.pdf' }))
    expect(icon).toHaveProperty('type')
    expect(icon).toHaveProperty('color')
    expect(icon).toHaveProperty('label')
    expect(icon).toHaveProperty('component')
  })

  it('resout un PDF en type "pdf" + couleur rouge + label "PDF"', () => {
    const icon = getDocumentIcon(makeDoc({ content: 'annexe.pdf' }))
    expect(icon.type).toBe('pdf')
    expect(icon.color).toBe('#E74C3C')
    expect(icon.label).toBe('PDF')
    expect(icon.component).toBeDefined()
  })

  it('resout une image en type "image"', () => {
    const icon = getDocumentIcon(makeDoc({ content: 'schema.png' }))
    expect(icon.type).toBe('image')
    expect(icon.label).toBe('Image')
  })

  it('resout une video en type "video"', () => {
    const icon = getDocumentIcon(makeDoc({ content: 'demo.mp4' }))
    expect(icon.type).toBe('video')
    expect(icon.label).toBe('Vidéo')
  })

  it('resout un xlsx en type "spreadsheet"', () => {
    const icon = getDocumentIcon(makeDoc({ content: 'notes.xlsx' }))
    expect(icon.type).toBe('spreadsheet')
    expect(icon.label).toBe('Tableur')
  })

  it('resout un lien GitHub en type "github" + couleur GitHub', () => {
    const icon = getDocumentIcon(makeDoc({ type: 'link', category: 'GitHub', content: 'https://github.com/foo/bar' }))
    expect(icon.type).toBe('github')
    expect(icon.color).toBe('#6e7681')
  })

  it('resout un lien Moodle en type "moodle"', () => {
    const icon = getDocumentIcon(makeDoc({ type: 'link', category: 'Moodle', content: 'https://moodle.cesi.fr' }))
    expect(icon.type).toBe('moodle')
  })

  it('resout un lien Note Peda en type "note-peda"', () => {
    const icon = getDocumentIcon(makeDoc({ type: 'link', category: 'Note Péda' }))
    expect(icon.type).toBe('note-peda')
  })

  it('resout un lien sans categorie en type "link"', () => {
    const icon = getDocumentIcon(makeDoc({ type: 'link', category: null, content: 'https://example.com' }))
    expect(icon.type).toBe('link')
  })

  it('resout un fichier avec extension inconnue en type "file"', () => {
    const icon = getDocumentIcon(makeDoc({ content: 'archive.xyz' }))
    expect(icon.type).toBe('file')
    expect(icon.label).toBe('Fichier')
  })

  it('retourne toujours un component non null pour un input valide', () => {
    const testCases = [
      makeDoc({ content: 'a.pdf' }),
      makeDoc({ content: 'a.png' }),
      makeDoc({ content: 'a.unknown' }),
      makeDoc({ type: 'link', category: 'GitHub' }),
      makeDoc({ type: 'link', category: null }),
    ]
    for (const doc of testCases) {
      const icon = getDocumentIcon(doc)
      expect(icon.component).toBeDefined()
      expect(icon.component).not.toBeNull()
    }
  })
})
