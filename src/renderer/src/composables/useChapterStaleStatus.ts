/**
 * useChapterStaleStatus : indique si le contenu affiche est potentiellement
 * obsolete (cache local OU repo non sync depuis > 1 heure).
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import { relativeTime } from '@/utils/date'
import type { LumenRepo } from '@/types'

const STALE_THRESHOLD_MS = 60 * 60 * 1000

/**
 * SQLite `datetime('now')` renvoie "YYYY-MM-DD HH:MM:SS" (separateur espace,
 * sans timezone). Safari / WebKit retourne NaN sur les strings non-ISO.
 * On normalise au format ISO avec 'Z' pour la portabilite.
 */
export function parseSqlTimestamp(raw: string | null): number | null {
  if (!raw) return null
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const withTz = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const ts = new Date(withTz).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function useChapterStaleStatus(
  repo: Ref<LumenRepo>,
  cached: Ref<boolean | undefined>,
) {
  const isStale = computed<boolean>(() => {
    if (cached.value) return true
    const syncedAt = parseSqlTimestamp(repo.value.lastSyncedAt)
    if (syncedAt === null) return false
    return Date.now() - syncedAt > STALE_THRESHOLD_MS
  })

  const relativeSyncedAt = computed(() => {
    const syncedAt = parseSqlTimestamp(repo.value.lastSyncedAt)
    if (syncedAt === null) return 'jamais'
    return relativeTime(syncedAt)
  })

  return { isStale, relativeSyncedAt }
}
