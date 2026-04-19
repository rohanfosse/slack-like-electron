/**
 * Tests pour useGithubConnection — wrapper du lumenStore pour
 * Settings > Integrations (v2.167). Valide que les computed miroirs
 * sont reactifs + que les actions passent bien au store + toast.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const showToast = vi.fn()
const fetchGithubStatus   = vi.fn()
const connectGithub       = vi.fn()
const disconnectGithub    = vi.fn()

const githubStatus = ref<{ connected: boolean; login?: string; scopes?: string }>({ connected: false })

vi.mock('@/stores/lumen', () => ({
  useLumenStore: () => ({
    get githubStatus() { return githubStatus.value },
    set githubStatus(v) { githubStatus.value = v },
    fetchGithubStatus,
    connectGithub,
    disconnectGithub,
  }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

import { useGithubConnection } from '@/composables/useGithubConnection'

describe('useGithubConnection', () => {
  let gh: ReturnType<typeof useGithubConnection>

  beforeEach(() => {
    showToast.mockClear()
    fetchGithubStatus.mockReset()
    connectGithub.mockReset()
    disconnectGithub.mockReset()
    githubStatus.value = { connected: false }
    gh = useGithubConnection()
  })

  describe('computed miroirs', () => {
    it('expose connected=false / login=null au depart', () => {
      expect(gh.connected.value).toBe(false)
      expect(gh.login.value).toBeNull()
      expect(gh.scopes.value).toBe('')
    })

    it('reagit aux changements du lumenStore', () => {
      githubStatus.value = { connected: true, login: 'alice', scopes: 'repo,read:org' }
      expect(gh.connected.value).toBe(true)
      expect(gh.login.value).toBe('alice')
      expect(gh.scopes.value).toBe('repo,read:org')
    })

    it('status.scopes est "" quand absent du store', () => {
      githubStatus.value = { connected: true, login: 'bob' }
      expect(gh.scopes.value).toBe('')
    })
  })

  describe('refresh', () => {
    it('delegue au lumenStore.fetchGithubStatus', async () => {
      fetchGithubStatus.mockResolvedValue(undefined)
      await gh.refresh()
      expect(fetchGithubStatus).toHaveBeenCalledOnce()
    })
  })

  describe('connect', () => {
    it('refuse un token vide sans appeler le store', async () => {
      const res = await gh.connect('   ')
      expect(res.ok).toBe(false)
      expect(res.error).toMatch(/token/i)
      expect(connectGithub).not.toHaveBeenCalled()
    })

    it('appelle lumenStore.connectGithub avec le token trimme', async () => {
      connectGithub.mockResolvedValue({ ok: true })
      const res = await gh.connect('  ghp_realtoken  ')
      expect(connectGithub).toHaveBeenCalledWith('ghp_realtoken')
      expect(res.ok).toBe(true)
    })

    it('toast succes quand le store confirme la connexion', async () => {
      connectGithub.mockResolvedValue({ ok: true })
      await gh.connect('ghp_xxx')
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('connecte'), 'success')
    })

    it('propage l\'erreur du store sans toast succes', async () => {
      connectGithub.mockResolvedValue({ ok: false, error: 'Bad credentials' })
      const res = await gh.connect('ghp_invalid')
      expect(res.ok).toBe(false)
      expect(res.error).toBe('Bad credentials')
      expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'success')
    })
  })

  describe('disconnect', () => {
    it('delegue au store + toast succes', async () => {
      disconnectGithub.mockResolvedValue(undefined)
      await gh.disconnect()
      expect(disconnectGithub).toHaveBeenCalledOnce()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('deconnecte'), 'success')
    })
  })
})
