/**
 * useCalendarFeed — URL d'abonnement iCal publique.
 *
 * L'URL renvoyee par le backend contient un token secret : a traiter comme
 * un mot de passe, d'ou le bouton "Regenerer" en cas de fuite.
 *
 * Etat module-level pour que plusieurs composants restent synchronises.
 */
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

interface FeedData {
  token: string | null
  url: string | null
  createdAt?: string
}

const token     = ref<string | null>(null)
const url       = ref<string | null>(null)
const createdAt = ref<string | null>(null)
const loading   = ref(false)

export function useCalendarFeed() {
  const { api } = useApi()
  const { showToast } = useToast()

  async function refresh(): Promise<void> {
    const data = await api<FeedData>(
      () => window.api.getCalendarFeedToken(),
      { silent: true },
    )
    if (data) {
      token.value = data.token
      url.value = data.url
      createdAt.value = data.createdAt ?? null
    }
  }

  async function rotate(): Promise<void> {
    loading.value = true
    try {
      const data = await api<{ token: string; url: string; createdAt?: string }>(
        () => window.api.rotateCalendarFeedToken(),
      )
      if (data) {
        token.value = data.token
        url.value = data.url
        createdAt.value = data.createdAt ?? null
        showToast('Lien d\'abonnement genere', 'success')
      }
    } finally {
      loading.value = false
    }
  }

  async function revoke(): Promise<void> {
    loading.value = true
    try {
      const data = await api<{ revoked: boolean }>(
        () => window.api.revokeCalendarFeedToken(),
      )
      if (data?.revoked) {
        token.value = null
        url.value = null
        createdAt.value = null
        showToast('Abonnement revoque', 'success')
      }
    } finally {
      loading.value = false
    }
  }

  async function copyUrl(): Promise<void> {
    if (!url.value) return
    try {
      await navigator.clipboard.writeText(url.value)
      showToast('URL copiee', 'success')
    } catch {
      showToast('Impossible de copier — selectionne manuellement', 'error')
    }
  }

  return { token, url, createdAt, loading, refresh, rotate, revoke, copyUrl }
}
