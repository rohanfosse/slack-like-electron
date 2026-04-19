/**
 * useGithubConnection — wrapper du lumenStore pour Settings > Integrations.
 *
 * La connexion est partagee entre Lumen et Settings : un seul token GitHub
 * par user, deconnecter ici casse Lumen aussi (voulu).
 */
import { computed } from 'vue'
import { useLumenStore } from '@/stores/lumen'
import { useToast } from '@/composables/useToast'

export function useGithubConnection() {
  const lumenStore = useLumenStore()
  const { showToast } = useToast()

  const status    = computed(() => lumenStore.githubStatus)
  const connected = computed(() => lumenStore.githubStatus.connected === true)
  const login     = computed(() => lumenStore.githubStatus.login ?? null)
  const scopes    = computed(() => lumenStore.githubStatus.scopes ?? '')

  async function refresh(): Promise<void> {
    await lumenStore.fetchGithubStatus()
  }

  async function connect(token: string): Promise<{ ok: boolean; error?: string }> {
    const trimmed = token.trim()
    if (!trimmed) return { ok: false, error: 'Colle ton token GitHub.' }
    const res = await lumenStore.connectGithub(trimmed)
    if (res.ok) {
      showToast('Compte GitHub connecte', 'success')
    }
    return res
  }

  async function disconnect(): Promise<void> {
    await lumenStore.disconnectGithub()
    showToast('Compte GitHub deconnecte', 'success')
  }

  return { status, connected, login, scopes, refresh, connect, disconnect }
}
