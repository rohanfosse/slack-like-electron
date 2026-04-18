/**
 * useLumenNewChapter : etat + actions pour creer un nouveau chapitre .md
 * dans un repo Lumen via l'IPC createLumenChapterFile. Le fichier est
 * cree avec un skeleton minimal (H1 + placeholder) dans le meme dossier
 * que les chapitres de la section cible.
 *
 * Apres creation, re-sync le repo (pour que l'auto-manifest decouvre le
 * nouveau fichier) puis emet `select` pour ouvrir immediatement le viewer.
 */
import { ref, computed, watch } from 'vue'
import { useLumenStore } from '@/stores/lumen'
import { useToast } from '@/composables/useToast'
import { slugifyTitleToFilename, type SectionGroup } from '@/utils/lumenRepoDisplay'
import type { LumenRepo } from '@/types'

interface NewChapterContext {
  repo: LumenRepo
  sectionTitle: string
  sectionDir: string
}

function dirOfSection(group: SectionGroup): string {
  const firstPath = group.chapters[0]?.path ?? ''
  const slash = firstPath.lastIndexOf('/')
  return slash === -1 ? '' : firstPath.slice(0, slash)
}

export function useLumenNewChapter(
  onCreated: (payload: { repoId: number; path: string }) => void,
) {
  const lumenStore = useLumenStore()
  const { showToast } = useToast()

  const open = ref(false)
  const ctx = ref<NewChapterContext | null>(null)
  const title = ref('')
  const filename = ref('')
  const message = ref('')
  const filenameManual = ref(false)
  const saving = ref(false)

  function openModal(repo: LumenRepo, group: SectionGroup): void {
    ctx.value = { repo, sectionTitle: group.title, sectionDir: dirOfSection(group) }
    title.value = ''
    filename.value = ''
    filenameManual.value = false
    message.value = ''
    open.value = true
  }

  function closeModal(): void {
    if (saving.value) return
    open.value = false
    ctx.value = null
  }

  function onFilenameInput(): void { filenameManual.value = true }

  watch(title, (t) => {
    if (filenameManual.value) return
    filename.value = slugifyTitleToFilename(t)
  })

  const path = computed<string>(() => {
    if (!ctx.value) return ''
    const dir = ctx.value.sectionDir
    const name = filename.value.trim()
    if (!name) return ''
    return dir ? `${dir}/${name}` : name
  })

  const canCreate = computed<boolean>(() =>
    !saving.value
    && title.value.trim().length > 0
    && /\.md$/i.test(filename.value)
    && path.value.length > 0,
  )

  async function save(): Promise<void> {
    if (!canCreate.value || !ctx.value) return
    const { repo } = ctx.value
    const finalPath = path.value
    const finalTitle = title.value.trim()
    const content = `# ${finalTitle}\n\nContenu du chapitre.\n`
    const commitMessage = message.value.trim() || `docs: add ${finalPath}`

    saving.value = true
    try {
      const resp = await window.api.createLumenChapterFile(repo.id, {
        path: finalPath, content, message: commitMessage,
      }) as { ok: boolean; error?: string }
      if (!resp?.ok) {
        showToast(resp?.error || 'Echec de la creation', 'error')
        return
      }
      showToast(`Chapitre cree : ${finalTitle}`, 'success')
      open.value = false
      ctx.value = null
      try {
        await lumenStore.syncReposForPromo(repo.promoId)
      } catch { /* re-sync best-effort */ }
      onCreated({ repoId: repo.id, path: finalPath })
    } catch (err) {
      showToast((err as { message?: string })?.message || 'Erreur reseau', 'error')
    } finally {
      saving.value = false
    }
  }

  return {
    open, ctx, title, filename, message, saving,
    path, canCreate,
    openModal, closeModal, onFilenameInput, save,
  }
}
