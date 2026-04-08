/**
 * Tests unitaires pour la logique extraite des composants du panneau
 * "Projet d'exemple" de Lumen :
 * - Construction de l'arbre hierarchique depuis une liste plate de paths
 * - Tri dossiers-puis-fichiers par ordre alphabetique
 * - Detection des fichiers binaires par extension
 * - Mapping extension → langage hljs
 * - Format des tailles
 * - Validation des URLs GitHub
 */
import { describe, it, expect } from 'vitest'

// ── Reproductions des helpers des composants ────────────────────────────────
// On teste la logique en boite blanche plutot que de monter les composants
// (pas de @vue/test-utils dans le repo — suit le pattern des autres tests).

interface TreeFile { path: string; size: number }
interface TreeNode {
  name: string
  path: string
  isFile: boolean
  size: number
  children: TreeNode[]
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
    return a.name.localeCompare(b.name)
  })
  for (const n of nodes) if (!n.isFile) sortTree(n.children)
}

function buildTree(files: TreeFile[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean)
    let cursor = root
    for (let i = 0; i < segments.length; i++) {
      const name = segments[i]
      const isFile = i === segments.length - 1
      const fullPath = segments.slice(0, i + 1).join('/')
      let node = cursor.find(n => n.name === name)
      if (!node) {
        node = { name, path: fullPath, isFile, size: isFile ? file.size : 0, children: [] }
        cursor.push(node)
      }
      cursor = node.children
    }
  }
  sortTree(root)
  return root
}

const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'tiff',
  'pdf', 'zip', 'tar', 'gz', '7z', 'rar',
  'ttf', 'otf', 'woff', 'woff2',
  'mp3', 'mp4', 'wav', 'ogg', 'mov', 'avi',
  'exe', 'dll', 'so', 'dylib', 'bin',
])

function isBinaryByExtension(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return BINARY_EXTS.has(ext)
}

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python',
  rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
  html: 'xml', css: 'css', json: 'json', md: 'markdown',
}

function resolveLang(path: string): string | null {
  const name = path.split('/').pop() ?? ''
  if (name.toLowerCase() === 'dockerfile') return 'dockerfile'
  if (name.toLowerCase() === 'makefile') return 'makefile'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return LANG_MAP[ext] ?? null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function isValidGitHubUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.host !== 'github.com') return false
    const segments = u.pathname.replace(/^\/+|\/+$/g, '').split('/')
    return segments.length >= 2 && !!segments[0] && !!segments[1]
  } catch { return false }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('LumenProjectTree — buildTree', () => {
  it('construit un arbre plat pour des fichiers racine', () => {
    const tree = buildTree([
      { path: 'main.py', size: 100 },
      { path: 'utils.py', size: 50 },
    ])
    expect(tree).toHaveLength(2)
    expect(tree.every(n => n.isFile)).toBe(true)
    expect(tree[0].name).toBe('main.py')
    expect(tree[1].name).toBe('utils.py')
  })

  it('nesting dossiers + fichiers', () => {
    const tree = buildTree([
      { path: 'src/main.py', size: 100 },
      { path: 'src/lib/helpers.py', size: 40 },
      { path: 'README.md', size: 200 },
    ])
    expect(tree).toHaveLength(2)
    // Ordre : dossiers en premier, puis fichiers
    expect(tree[0].name).toBe('src')
    expect(tree[0].isFile).toBe(false)
    expect(tree[1].name).toBe('README.md')
    expect(tree[1].isFile).toBe(true)

    const src = tree[0]
    expect(src.children).toHaveLength(2)
    expect(src.children[0].name).toBe('lib') // dossier
    expect(src.children[1].name).toBe('main.py') // fichier
    expect(src.children[0].children[0].name).toBe('helpers.py')
  })

  it('deduplique les nodes intermediaires', () => {
    const tree = buildTree([
      { path: 'a/b/c.py', size: 1 },
      { path: 'a/b/d.py', size: 1 },
      { path: 'a/e.py', size: 1 },
    ])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('a')
    expect(tree[0].children).toHaveLength(2)
    // b (folder) en premier, e.py (fichier) apres
    expect(tree[0].children[0].name).toBe('b')
    expect(tree[0].children[0].children).toHaveLength(2)
    expect(tree[0].children[1].name).toBe('e.py')
  })

  it('preserve les paths complets dans chaque node', () => {
    const tree = buildTree([
      { path: 'src/lib/deep/file.py', size: 10 },
    ])
    expect(tree[0].path).toBe('src')
    expect(tree[0].children[0].path).toBe('src/lib')
    expect(tree[0].children[0].children[0].path).toBe('src/lib/deep')
    expect(tree[0].children[0].children[0].children[0].path).toBe('src/lib/deep/file.py')
  })

  it('retourne un arbre vide pour une liste vide', () => {
    expect(buildTree([])).toEqual([])
  })
})

describe('LumenProjectFileViewer — detection binaire', () => {
  it('detecte les extensions binaires communes', () => {
    expect(isBinaryByExtension('logo.png')).toBe(true)
    expect(isBinaryByExtension('doc.pdf')).toBe(true)
    expect(isBinaryByExtension('archive.zip')).toBe(true)
    expect(isBinaryByExtension('font.woff2')).toBe(true)
    expect(isBinaryByExtension('app.exe')).toBe(true)
  })

  it('ne considere pas les fichiers texte comme binaires', () => {
    expect(isBinaryByExtension('main.py')).toBe(false)
    expect(isBinaryByExtension('index.html')).toBe(false)
    expect(isBinaryByExtension('README.md')).toBe(false)
    expect(isBinaryByExtension('config.json')).toBe(false)
  })

  it('gere l absence d extension', () => {
    expect(isBinaryByExtension('Makefile')).toBe(false)
    expect(isBinaryByExtension('LICENSE')).toBe(false)
  })

  it('est insensible a la casse', () => {
    expect(isBinaryByExtension('IMG.PNG')).toBe(true)
    expect(isBinaryByExtension('DOC.PDF')).toBe(true)
  })
})

describe('LumenProjectFileViewer — resolveLang', () => {
  it('mappe les extensions communes au langage hljs', () => {
    expect(resolveLang('main.py')).toBe('python')
    expect(resolveLang('app.js')).toBe('javascript')
    expect(resolveLang('component.ts')).toBe('typescript')
    expect(resolveLang('page.html')).toBe('xml')
    expect(resolveLang('style.css')).toBe('css')
    expect(resolveLang('data.json')).toBe('json')
  })

  it('reconnait Dockerfile et Makefile sans extension', () => {
    expect(resolveLang('Dockerfile')).toBe('dockerfile')
    expect(resolveLang('dockerfile')).toBe('dockerfile')
    expect(resolveLang('Makefile')).toBe('makefile')
  })

  it('retourne null pour une extension inconnue', () => {
    expect(resolveLang('file.xyz')).toBeNull()
    expect(resolveLang('README')).toBeNull()
  })

  it('utilise uniquement l extension finale', () => {
    expect(resolveLang('src/lib/utils.py')).toBe('python')
  })
})

describe('formatSize', () => {
  it('bytes < 1 Ko', () => {
    expect(formatSize(0)).toBe('0 o')
    expect(formatSize(512)).toBe('512 o')
    expect(formatSize(1023)).toBe('1023 o')
  })

  it('Ko entre 1 Ko et 1 Mo', () => {
    expect(formatSize(1024)).toBe('1 Ko')
    expect(formatSize(1500)).toBe('1 Ko')
    expect(formatSize(50 * 1024)).toBe('50 Ko')
  })

  it('Mo au-dela', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 Mo')
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 Mo')
  })
})

describe('isValidGitHubUrl', () => {
  it('accepte les URLs HTTPS github.com/owner/repo', () => {
    expect(isValidGitHubUrl('https://github.com/owner/repo')).toBe(true)
    expect(isValidGitHubUrl('https://github.com/owner/repo/')).toBe(true)
    expect(isValidGitHubUrl('https://github.com/owner/repo/tree/main')).toBe(true)
  })

  it('refuse HTTP non-securise', () => {
    expect(isValidGitHubUrl('http://github.com/owner/repo')).toBe(false)
  })

  it('refuse les autres hosts', () => {
    expect(isValidGitHubUrl('https://gitlab.com/owner/repo')).toBe(false)
    expect(isValidGitHubUrl('https://bitbucket.org/owner/repo')).toBe(false)
  })

  it('refuse les URLs sans repo', () => {
    expect(isValidGitHubUrl('https://github.com/owner')).toBe(false)
    expect(isValidGitHubUrl('https://github.com/')).toBe(false)
  })

  it('refuse les strings non-URL', () => {
    expect(isValidGitHubUrl('pas une url')).toBe(false)
    expect(isValidGitHubUrl('')).toBe(false)
  })
})
