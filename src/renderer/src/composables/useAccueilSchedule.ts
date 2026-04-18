/**
 * useAccueilSchedule : filtre les evenements des prochaines 48h pour ne
 * garder que ceux d'aujourd'hui + helpers de classification (passe/actuel).
 *
 * Un evenement est "current" s'il est le premier futur dans la liste
 * d'aujourd'hui. Permet de mettre en avant le prochain rendez-vous.
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { AgendaItem } from '@/composables/useDashboardWidgets'

export function useAccueilSchedule(next48h: Ref<AgendaItem[]>) {
  const todayEvents = computed(() => {
    const todayStr = new Date().toDateString()
    return next48h.value.filter((item) => new Date(item.time).toDateString() === todayStr)
  })

  function isPastEvent(time: string): boolean {
    return new Date(time).getTime() < Date.now()
  }

  function isCurrentEvent(time: string, index: number): boolean {
    const t = new Date(time).getTime()
    const now = Date.now()
    if (t > now) {
      return index === todayEvents.value.findIndex((e) => new Date(e.time).getTime() > now)
    }
    return false
  }

  return { todayEvents, isPastEvent, isCurrentEvent }
}
