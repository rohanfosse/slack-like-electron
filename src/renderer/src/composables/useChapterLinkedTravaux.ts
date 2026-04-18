/**
 * useChapterLinkedTravaux : devoirs lies au chapitre courant + etat du popover.
 *
 * Fetch a l'appel de `load()` (apres montage et a chaque changement de
 * chapitre). Le popover est ferme par defaut (ouvert via un chip header)
 * et se referme sur Esc ou clic exterieur (geres par l'appelant).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { LumenLinkedTravail, LumenRepo, LumenChapter } from '@/types'

export function useChapterLinkedTravaux(
  repo: Ref<LumenRepo>,
  chapter: Ref<LumenChapter>,
) {
  const travaux = ref<LumenLinkedTravail[]>([])
  const loading = ref(false)
  const linkModalOpen = ref(false)
  const popoverOpen = ref(false)
  const popoverRef = ref<HTMLElement | null>(null)

  function togglePopover(): void {
    popoverOpen.value = !popoverOpen.value
  }

  function closePopover(): void {
    popoverOpen.value = false
  }

  function onDocumentClick(ev: MouseEvent): void {
    if (!popoverOpen.value) return
    const target = ev.target as Node | null
    if (!popoverRef.value || !target) return
    if (!popoverRef.value.contains(target)) closePopover()
  }

  function onDocumentKey(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && popoverOpen.value) closePopover()
  }

  async function load() {
    if (!chapter.value?.path) return
    loading.value = true
    try {
      const resp = await window.api.getLumenTravauxForChapter(repo.value.id, chapter.value.path) as {
        ok: boolean
        data?: { travaux: LumenLinkedTravail[] }
      }
      travaux.value = resp?.ok && resp.data?.travaux ? resp.data.travaux : []
    } catch {
      travaux.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onDocumentKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onDocumentClick)
    document.removeEventListener('keydown', onDocumentKey)
  })

  return {
    travaux,
    loading,
    linkModalOpen,
    popoverOpen,
    popoverRef,
    togglePopover,
    closePopover,
    load,
  }
}
