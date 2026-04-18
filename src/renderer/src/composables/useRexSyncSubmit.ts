/**
 * useRexSyncSubmit : state + submit handlers pour le mode "sync" (live) de
 * l'etudiant sur une session Rex. Un seul jeu d'inputs, partage entre tous
 * les types d'activite (text / words / rating / sondage / humeur /
 * priorite / matrice).
 *
 * Le watch sur `activity` reset les inputs et initialise les tableaux
 * dependants (wordInputs pour nuage, prioriteOrder, matriceRatings).
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useRexStore } from '@/stores/rex'
import type { RexActivity } from '@/types'

export function useRexSyncSubmit(activity: Ref<RexActivity | null>) {
  const rex = useRexStore()

  const textInput = ref('')
  const wordInputs = ref<string[]>([])
  const ratingInput = ref(0)
  const sondageSelected = ref<number | null>(null)
  const humeurSelected = ref<string | null>(null)
  const prioriteOrder = ref<number[]>([])
  const matriceRatings = ref<Record<string, number>>({})

  function initPriorite(act: { options?: string | null }) {
    try {
      const items = JSON.parse(act.options as string || '[]')
      prioriteOrder.value = Array.from({ length: items.length }, (_, i) => i)
    } catch {
      prioriteOrder.value = []
    }
  }

  function initMatrice(act: { options?: string | null; max_rating?: number }) {
    try {
      const criteria = JSON.parse(act.options as string || '[]')
      const ratings: Record<string, number> = {}
      for (const c of criteria) ratings[c] = 0
      matriceRatings.value = ratings
    } catch {
      matriceRatings.value = {}
    }
  }

  function movePriorite(from: number, to: number) {
    const arr = [...prioriteOrder.value]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    prioriteOrder.value = arr
  }

  // Reset inputs + re-init quand l'activite change
  watch(activity, (act) => {
    if (act?.type === 'nuage') {
      wordInputs.value = Array.from({ length: act.max_words || 2 }, () => '')
    }
    if (act?.type === 'priorite') initPriorite(act)
    if (act?.type === 'matrice') initMatrice(act)
    textInput.value = ''
    ratingInput.value = 0
    sondageSelected.value = null
    humeurSelected.value = null
    rex.hasResponded = false
  })

  async function submitText() {
    if (!activity.value || !textInput.value.trim()) return
    await rex.submitResponse(activity.value.id, { text: textInput.value.trim() })
  }

  async function submitWords() {
    if (!activity.value) return
    const filtered = wordInputs.value.map((w) => w.trim()).filter(Boolean)
    if (filtered.length === 0) return
    await rex.submitResponse(activity.value.id, { words: filtered })
  }

  async function submitRating() {
    if (!activity.value || ratingInput.value <= 0) return
    await rex.submitResponse(activity.value.id, { rating: ratingInput.value })
  }

  async function submitSondage() {
    if (!activity.value || sondageSelected.value === null) return
    await rex.submitResponse(activity.value.id, { answer: String(sondageSelected.value) })
  }

  async function submitHumeur() {
    if (!activity.value || !humeurSelected.value) return
    await rex.submitResponse(activity.value.id, { answer: humeurSelected.value })
  }

  async function submitPriorite() {
    if (!activity.value || prioriteOrder.value.length === 0) return
    await rex.submitResponse(activity.value.id, { answer: prioriteOrder.value.join(',') })
  }

  async function submitMatrice() {
    if (!activity.value) return
    await rex.submitResponse(activity.value.id, { answer: JSON.stringify(matriceRatings.value) })
  }

  return {
    textInput, wordInputs, ratingInput, sondageSelected, humeurSelected,
    prioriteOrder, matriceRatings,
    movePriorite,
    submitText, submitWords, submitRating, submitSondage,
    submitHumeur, submitPriorite, submitMatrice,
  }
}
