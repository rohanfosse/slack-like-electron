/**
 * useAccueilActivityFeed : agrege les derniers rendus par devoir en flux
 * "N rendus pour <devoir>" + temps relatif depuis le plus recent.
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import { relativeTime } from '@/utils/date'
import type { Depot } from '@/types'

export interface ActivityGroup {
  id: string
  type: 'rendus' | 'message'
  label: string
  count: number
  timeAgo: string
}

export function useAccueilActivityFeed(recentRendus: Ref<Depot[]>) {
  const items = computed<ActivityGroup[]>(() => {
    const groups = new Map<number, { title: string; count: number; latest: number }>()
    for (const r of recentRendus.value) {
      const existing = groups.get(r.travail_id)
      const ts = new Date(r.submitted_at ?? 0).getTime()
      if (existing) {
        existing.count++
        existing.latest = Math.max(existing.latest, ts)
      } else {
        groups.set(r.travail_id, {
          title: r.travail_title ?? `Devoir #${r.travail_id}`,
          count: 1,
          latest: ts,
        })
      }
    }
    const out: ActivityGroup[] = []
    for (const [id, g] of groups) {
      out.push({
        id: `rendus-${id}`,
        type: 'rendus',
        label: `${g.count} rendu${g.count > 1 ? 's' : ''} pour ${g.title}`,
        count: g.count,
        timeAgo: relativeTime(g.latest),
      })
    }
    return out.slice(0, 5)
  })

  return { items }
}
