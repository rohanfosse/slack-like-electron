/**
 * useChapterEdit : edition inline d'un chapitre Lumen (markdown ou tex).
 *
 * Preview HTML en live (rendu via renderMarkdown / renderTex selon le kind),
 * sauvegarde via PUT atomique (sha oldSha -> newSha).
 * Le parent doit fournir isTeacher + chapterKind/isMarp pour calculer canEdit.
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import { renderTex } from '@/utils/texRenderer'
import { useToast } from '@/composables/useToast'
import { useLumenStore } from '@/stores/lumen'
import type { LumenChapter, LumenRepo } from '@/types'

export interface UseChapterEditArgs {
  repo: Ref<LumenRepo>
  chapter: Ref<LumenChapter>
  content: Ref<string | null | undefined>
  contentSha: Ref<string | null | undefined>
  isTeacher: Ref<boolean>
  chapterKind: Ref<'markdown' | 'pdf' | 'tex' | 'ipynb'>
  isMarp: Ref<boolean>
}

export function useChapterEdit(args: UseChapterEditArgs) {
  const { showToast } = useToast()
  const lumenStore = useLumenStore()

  const editMode = ref(false)
  const draft = ref('')
  const message = ref('')
  const saving = ref(false)
  const previewOpen = ref(true)

  const previewHtml = computed(() => {
    if (!previewOpen.value || !draft.value) return ''
    if (args.chapterKind.value === 'tex') return renderTex(draft.value)
    return renderMarkdown(draft.value, { chapterPath: args.chapter.value.path })
  })

  const canEdit = computed(() =>
    args.isTeacher.value
    && (args.chapterKind.value === 'markdown' || args.chapterKind.value === 'tex')
    && !args.isMarp.value
    && args.content.value != null
    && Boolean(args.contentSha.value),
  )

  function enter(): void {
    if (!canEdit.value) return
    if (args.content.value == null) return
    draft.value = args.content.value
    message.value = ''
    editMode.value = true
  }

  function exit(): void {
    if (saving.value) return
    editMode.value = false
  }

  async function save(): Promise<void> {
    if (saving.value) return
    if (!args.contentSha.value) {
      showToast('SHA du fichier introuvable, recharge le chapitre', 'error')
      return
    }
    saving.value = true
    try {
      const commitMessage = message.value.trim() || `docs: edit ${args.chapter.value.path}`
      const resp = await window.api.updateLumenChapterFile(args.repo.value.id, {
        path: args.chapter.value.path,
        content: draft.value,
        sha: args.contentSha.value,
        message: commitMessage,
      }) as { ok: boolean; error?: string }
      if (!resp?.ok) {
        showToast(resp?.error || 'Echec de la sauvegarde', 'error')
        return
      }
      showToast('Chapitre enregistre', 'success')
      editMode.value = false
      await lumenStore.fetchChapterContent(args.repo.value.id, args.chapter.value.path)
    } catch (err) {
      showToast((err as { message?: string })?.message || 'Erreur reseau', 'error')
    } finally {
      saving.value = false
    }
  }

  return { editMode, draft, message, saving, previewOpen, previewHtml, canEdit, enter, exit, save }
}
