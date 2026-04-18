/**
 * Fonctions pures pour l'affichage d'un repo Lumen dans la sidebar :
 * extraction de prefixe numerique, nom affichable, groupement par section,
 * tri deterministe, format duree.
 */
import type { LumenChapter, LumenRepo } from '@/types'

export interface SectionGroup {
  title: string
  chapters: LumenChapter[]
  /** Somme des durees des chapitres de cette section (minutes). 0 si aucun. */
  totalDuration: number
}

/**
 * Extrait le prefixe numerique d'un nom de repo. Ex:
 *   "0-Mathematiques" -> 0, "4-Programmation-Web" -> 4,
 *   "Astruc-Sebastien" -> Infinity
 * Permet de trier les blocs CESI dans l'ordre pedagogique (0, 1, 2, 3, 4…)
 * plutot qu'en lexical ("10-foo" avant "2-bar").
 */
export function extractRepoNumericPrefix(repo: LumenRepo): number {
  const name = repo.repo ?? repo.fullName.split('/').pop() ?? ''
  const m = name.match(/^(\d+)[-_.]/)
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

/**
 * Affiche un nom de repo plus humain en retirant le prefixe numerique :
 * "0-Mathematiques" -> "Mathematiques", "4-Programmation-Web" -> "Programmation Web".
 * Si le manifest expose un `project` lisible, on le garde tel quel.
 */
export function displayRepoName(repo: LumenRepo): string {
  if (repo.manifest?.project) return repo.manifest.project
  const name = repo.repo ?? repo.fullName.split('/').pop() ?? repo.fullName
  return name.replace(/^\d+[-_.]/, '').replace(/[-_]+/g, ' ')
}

/**
 * Decompose un titre de section "A · B · C" en { parent: "A · B", child: "C" }.
 * Utilise pour afficher le parent en prefixe muted plus petit et le child
 * en label principal — evite la repetition visuelle dans la sidebar.
 */
export function splitSectionTitle(title: string): { parent: string; child: string } {
  const idx = title.lastIndexOf(' · ')
  if (idx === -1) return { parent: '', child: title }
  return { parent: title.slice(0, idx), child: title.slice(idx + 3) }
}

/**
 * Cle de tri pour une section : prefixe numerique en premier (ex: "02 Labs"
 * -> num=2), sinon Infinity. Tie-break alphabetique.
 */
export function sectionSortKey(title: string): { num: number; title: string } {
  const m = title.match(/^(\d+)/)
  return {
    num: m ? Number(m[1]) : Number.POSITIVE_INFINITY,
    title: title.toLowerCase(),
  }
}

/**
 * Groupe une liste de chapitres par section. Les sections sont triees par
 * leur prefixe numerique (si present) puis alphabetiquement. Les chapitres
 * sans champ `section` tombent dans un bucket "Chapitres".
 */
export function groupBySection(chapters: LumenChapter[]): SectionGroup[] {
  const map = new Map<string, LumenChapter[]>()
  for (const ch of chapters) {
    const key = ch.section?.trim() || 'Chapitres'
    const existing = map.get(key)
    if (existing) existing.push(ch)
    else map.set(key, [ch])
  }
  return Array.from(map.entries())
    .map(([title, chs]) => ({
      title,
      chapters: chs,
      totalDuration: chs.reduce((sum, c) => sum + (c.duration ?? 0), 0),
    }))
    .sort((a, b) => {
      const ka = sectionSortKey(a.title)
      const kb = sectionSortKey(b.title)
      if (ka.num !== kb.num) return ka.num - kb.num
      return ka.title.localeCompare(kb.title)
    })
}

/**
 * Format une duree en minutes vers "1h30", "45 min", "2h", "5 min".
 * Retourne null si la duree est 0 ou negative.
 */
export function formatDuration(minutes: number): string | null {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/**
 * Slugifie un titre en nom de fichier markdown :
 *  "Introduction aux routeurs" -> "introduction-aux-routeurs.md"
 * Chaine vide si le titre ne contient rien d'alphanumerique.
 */
export function slugifyTitleToFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) return ''
  return `${slug}.md`
}
