/**
 * useChapterKind : detection du format d'un chapitre Lumen
 * (markdown / pdf / tex / ipynb) + detection Marp via frontmatter.
 *
 * Le `kind` vient du manifest auto-genere, sinon on infere depuis l'extension.
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import { parseChapterContent } from '@/utils/lumenFrontmatter'
import type { LumenChapter } from '@/types'

export type ChapterKind = 'markdown' | 'pdf' | 'tex' | 'ipynb'

export function inferKindFromPath(path: string): ChapterKind {
  const m = path.match(/\.([^./]+)$/)
  const ext = m ? m[1].toLowerCase() : ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'tex') return 'tex'
  if (ext === 'ipynb') return 'ipynb'
  return 'markdown'
}

export function useChapterKind(
  chapter: Ref<LumenChapter>,
  content: Ref<string | null | undefined>,
) {
  const kind = computed<ChapterKind>(() =>
    (chapter.value.kind as ChapterKind | undefined) ?? inferKindFromPath(chapter.value.path),
  )

  const isPdf = computed(() => kind.value === 'pdf')
  const isTex = computed(() => kind.value === 'tex')
  const isIpynb = computed(() => kind.value === 'ipynb')

  const parsed = computed(() =>
    kind.value === 'markdown'
      ? parseChapterContent(content.value ?? null)
      : { frontmatter: {}, body: '', isMarp: false },
  )
  const isMarp = computed(() => parsed.value.isMarp)

  return { kind, isPdf, isTex, isIpynb, isMarp, parsed }
}
