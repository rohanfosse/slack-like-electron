/**
 * useRexAsyncSubmit : state + submit handlers pour le mode "async" de Rex
 * (la session reste ouverte X jours apres la fin, l'etudiant peut repondre
 * a plusieurs activites a son rythme).
 *
 * Contrairement au mode sync, les inputs sont par-activite (Record<actId, …>)
 * pour ne pas perdre les saisies en passant d'une activite a l'autre.
 *
 * `expand(act)` initialise les inputs de l'activite si necessaire et toggle
 * son expansion (accordion single-open).
 */
import { ref } from 'vue'
import { useRexStore } from '@/stores/rex'
import type { RexActivity } from '@/types'

export function useRexAsyncSubmit() {
  const rex = useRexStore()

  const respondedIds = ref<Set<number>>(new Set())
  const expandedId = ref<number | null>(null)

  const textInputs = ref<Record<number, string>>({})
  const wordInputs = ref<Record<number, string[]>>({})
  const ratingInputs = ref<Record<number, number>>({})
  const sondageInputs = ref<Record<number, number | null>>({})
  const humeurInputs = ref<Record<number, string | null>>({})
  const prioriteInputs = ref<Record<number, number[]>>({})
  const matriceInputs = ref<Record<number, Record<string, number>>>({})

  function initInputs(act: RexActivity) {
    if (!(act.id in textInputs.value))    textInputs.value[act.id] = ''
    if (!(act.id in ratingInputs.value))  ratingInputs.value[act.id] = 0
    if (!(act.id in wordInputs.value))    wordInputs.value[act.id] = Array.from({ length: act.max_words || 2 }, () => '')
    if (!(act.id in sondageInputs.value)) sondageInputs.value[act.id] = null
    if (!(act.id in humeurInputs.value))  humeurInputs.value[act.id] = null
    if (act.type === 'priorite' && !(act.id in prioriteInputs.value)) {
      try {
        const items = JSON.parse(act.options as string || '[]')
        prioriteInputs.value[act.id] = Array.from({ length: items.length }, (_, i) => i)
      } catch { prioriteInputs.value[act.id] = [] }
    }
    if (act.type === 'matrice' && !(act.id in matriceInputs.value)) {
      try {
        const criteria = JSON.parse(act.options as string || '[]')
        const ratings: Record<string, number> = {}
        for (const c of criteria) ratings[c] = 0
        matriceInputs.value[act.id] = ratings
      } catch { matriceInputs.value[act.id] = {} }
    }
  }

  function expand(act: RexActivity) {
    initInputs(act)
    expandedId.value = expandedId.value === act.id ? null : act.id
  }

  function markResponded(actId: number) {
    respondedIds.value = new Set([...respondedIds.value, actId])
  }

  async function submitText(actId: number) {
    const text = textInputs.value[actId]?.trim()
    if (!text) return
    const ok = await rex.submitResponse(actId, { text })
    if (ok) markResponded(actId)
  }

  async function submitWords(actId: number) {
    const filtered = (wordInputs.value[actId] ?? []).map((w) => w.trim()).filter(Boolean)
    if (!filtered.length) return
    const ok = await rex.submitResponse(actId, { words: filtered })
    if (ok) markResponded(actId)
  }

  async function submitRating(actId: number) {
    const rating = ratingInputs.value[actId]
    if (!rating || rating <= 0) return
    const ok = await rex.submitResponse(actId, { rating })
    if (ok) markResponded(actId)
  }

  async function submitSondage(actId: number) {
    const sel = sondageInputs.value[actId]
    if (sel === null || sel === undefined) return
    const ok = await rex.submitResponse(actId, { answer: String(sel) })
    if (ok) markResponded(actId)
  }

  async function submitHumeur(actId: number) {
    const emoji = humeurInputs.value[actId]
    if (!emoji) return
    const ok = await rex.submitResponse(actId, { answer: emoji })
    if (ok) markResponded(actId)
  }

  return {
    respondedIds, expandedId,
    textInputs, wordInputs, ratingInputs, sondageInputs, humeurInputs,
    prioriteInputs, matriceInputs,
    expand, initInputs,
    submitText, submitWords, submitRating, submitSondage, submitHumeur,
  }
}
