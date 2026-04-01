/**
 * Polling GitHub CI status pour les depots de type link vers GitHub.
 * Debounced : max 5 requetes en parallele, cache les resultats.
 */
import { ref, watch, type Ref } from 'vue'
import type { Depot } from '@/types'

export type CiState = 'success' | 'failure' | 'pending' | 'unknown'

export const CI_ICON: Record<CiState, string> = {
  success: '\u2705', failure: '\u274C', pending: '\uD83D\uDD04', unknown: '\u2753',
}

export const CI_TITLE: Record<CiState, string> = {
  success: 'CI : succes', failure: 'CI : echec', pending: 'CI : en cours', unknown: 'CI : statut inconnu',
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null
    const parts = u.pathname.replace(/^\//, '').split('/')
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch { return null }
}

export function useGithubCiStatus(depots: Ref<Depot[]>) {
  const ciStatus = ref<Record<string, CiState>>({})

  async function fetchCiStatus(url: string) {
    const gh = parseGithubRepo(url)
    if (!gh) return
    if (ciStatus.value[url] !== undefined) return
    ciStatus.value = { ...ciStatus.value, [url]: 'pending' }
    try {
      const apiUrl = `https://api.github.com/repos/${gh.owner}/${gh.repo}/commits/HEAD/status`
      const res = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json' } })
      if (!res.ok) { ciStatus.value = { ...ciStatus.value, [url]: 'unknown' }; return }
      const json = await res.json() as { state: string }
      const state: CiState = json.state === 'success' ? 'success' : json.state === 'failure' || json.state === 'error' ? 'failure' : 'pending'
      ciStatus.value = { ...ciStatus.value, [url]: state }
    } catch {
      ciStatus.value = { ...ciStatus.value, [url]: 'unknown' }
    }
  }

  // Fetch CI for all GitHub link depots (debounced via immediate: true)
  watch(depots, (list) => {
    const githubLinks = list
      .filter(d => d.type === 'link')
      .map(d => d.content)
      .filter(url => parseGithubRepo(url))
      .slice(0, 5) // Limit to 5 to avoid rate limiting
    for (const url of githubLinks) fetchCiStatus(url)
  }, { immediate: true })

  return { ciStatus, parseGithubRepo, CI_ICON, CI_TITLE }
}
