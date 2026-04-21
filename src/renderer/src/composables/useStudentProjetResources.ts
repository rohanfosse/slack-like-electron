/**
 * useStudentProjetResources : charge les documents projet + les canaux
 * de la categorie correspondante. Recharge quand projectKey ou promoId
 * change.
 *
 * Robustesse (v2.214) :
 *   - catch separes docs + channels : une panne d'un cote ne bloque pas l'autre
 *   - exposition d'un drapeau `error` pour indiquer visuellement un echec
 *   - toast silencieux par defaut (on ne veut pas spammer si API pas dispo
 *     pendant une reconnexion, mais on log et on expose l'etat)
 */
import { ref, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import type { AppDocument, Channel } from '@/types'

export function useStudentProjetResources(
  projectKey: Ref<string>,
  promoId: Ref<number>,
) {
  const documents = ref<AppDocument[]>([])
  const channels = ref<Channel[]>([])
  const loading = ref(false)
  const error = ref<{ docs: boolean; channels: boolean }>({ docs: false, channels: false })

  async function loadDocuments(): Promise<void> {
    try {
      const res = await window.api.getProjectDocuments(promoId.value, projectKey.value)
      if (res?.ok) {
        documents.value = res.data ?? []
        error.value.docs = false
      } else {
        documents.value = []
        error.value.docs = true
      }
    } catch (e) {
      console.warn('[useStudentProjetResources] loadDocuments a echoue', e)
      documents.value = []
      error.value.docs = true
    }
  }

  async function loadChannels(): Promise<void> {
    try {
      const res = await window.api.getChannels(promoId.value)
      const all = res?.ok ? (res.data as Channel[]) : []
      if (res?.ok) {
        channels.value = all.filter((c) => c.category?.trim() === projectKey.value)
        error.value.channels = false
      } else {
        channels.value = []
        error.value.channels = true
      }
    } catch (e) {
      console.warn('[useStudentProjetResources] loadChannels a echoue', e)
      channels.value = []
      error.value.channels = true
    }
  }

  async function load(): Promise<void> {
    loading.value = true
    try {
      // En parallele : si l'un echoue, l'autre termine quand meme
      await Promise.all([loadDocuments(), loadChannels()])
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
  watch([projectKey, promoId], load)

  return { documents, channels, loading, error, load }
}
