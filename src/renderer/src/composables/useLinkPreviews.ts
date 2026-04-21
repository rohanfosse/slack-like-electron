import { ref } from 'vue'
import { useApi } from '@/composables/useApi'

export interface LinkPreview {
  url: string
  title: string | null
  description: string | null
  image: string | null
  site_name: string | null
  status: number
}

/** Extrait les URLs http(s) d'un texte (dedup, max 5). Cote client. */
export function extractUrls(content: string): string[] {
  if (!content || typeof content !== 'string') return []
  // Exclure les URLs deja "consommees" par le markdown :
  //   ![](url)  => image
  //   [label](url) => lien
  //   📎 [label](url) => attachment
  // Ces cas ne doivent pas unfurler.
  const masked = content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')        // images markdown
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')          // liens markdown
    .replace(/`[^`]+`/g, ' ')                     // code inline

  const urls = new Set<string>()
  const regex = /https?:\/\/[^\s<>"'`]+/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(masked)) !== null) {
    const cleaned = m[0].replace(/[.,;:!?\])}>]+$/, '')
    if (cleaned.length > 2048) continue
    urls.add(cleaned)
    if (urls.size >= 5) break
  }
  return [...urls]
}

// Cache client partage entre toutes les instances du composable
const clientCache = new Map<string, LinkPreview | null>()
const pending = new Map<string, Promise<LinkPreview[]>>()

export function useLinkPreviews() {
  const { api } = useApi()

  async function resolve(urls: string[]): Promise<LinkPreview[]> {
    if (!urls.length) return []

    // Return cached + trigger fetch pour ceux qui manquent
    const missing = urls.filter(u => !clientCache.has(u))
    if (missing.length) {
      const key = missing.sort().join('|')
      let fetchPromise = pending.get(key)
      if (!fetchPromise) {
        fetchPromise = (async () => {
          const res = await api(() => window.api.resolveLinkPreviews(missing), { silent: true })
          const list = res ?? []
          const byUrl = new Map(list.map(p => [p.url, p]))
          for (const u of missing) clientCache.set(u, byUrl.get(u) ?? null)
          return list
        })()
        pending.set(key, fetchPromise)
        fetchPromise.finally(() => pending.delete(key))
      }
      await fetchPromise
    }

    return urls.map(u => clientCache.get(u)).filter((p): p is LinkPreview => !!p)
  }

  function imageUrl(url: string): string {
    return window.api.linkPreviewImageUrl(url)
  }

  return { resolve, imageUrl }
}

const _testing = { clientCache, pending }
export const __testing__ = _testing
