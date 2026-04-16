/**
 * useResponseTimer : suit le temps moyen de reponse d'une activite Live.
 * Heuristique : a chaque increment du compteur de reponses (via watch), on
 * timestampe `Date.now() - startedAt`. On maintient ensuite la moyenne mobile.
 *
 * Non-exact : plusieurs reponses simultanees partagent le meme timestamp.
 * Suffisant pour un indicateur pedagogique ("les etudiants repondent en ~12s").
 */
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'

export function useResponseTimer(
  startedAt: Ref<string | null | undefined>,
  responseCount: Ref<number>,
) {
  const deltas = ref<number[]>([])
  let lastCount = 0

  watch(responseCount, (count) => {
    if (!startedAt.value) return
    if (count <= lastCount) {
      // count a diminue (activite relancee) : on reset
      if (count === 0) { deltas.value = []; lastCount = 0 }
      return
    }
    const start = new Date(startedAt.value + (startedAt.value.endsWith('Z') ? '' : 'Z')).getTime()
    const delta = (Date.now() - start) / 1000
    const added = count - lastCount
    for (let i = 0; i < added; i++) deltas.value.push(delta)
    lastCount = count
  })

  watch(startedAt, () => {
    deltas.value = []
    lastCount = 0
  })

  const avgSeconds = computed<number | null>(() => {
    if (!deltas.value.length) return null
    const sum = deltas.value.reduce((a, b) => a + b, 0)
    return sum / deltas.value.length
  })

  const medianSeconds = computed<number | null>(() => {
    if (!deltas.value.length) return null
    const sorted = [...deltas.value].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  })

  function reset() { deltas.value = []; lastCount = 0 }

  return { avgSeconds, medianSeconds, sampleSize: computed(() => deltas.value.length), reset }
}
