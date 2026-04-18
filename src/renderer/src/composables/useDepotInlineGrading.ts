/**
 * useDepotInlineGrading : edition inline des notes (A/B/C/D/NA) et des
 * commentaires (feedback) par depot. Un seul depot peut etre en cours
 * d'edition a la fois, les deux modes sont mutuellement exclusifs.
 */
import { ref } from 'vue'
import { useTravauxStore } from '@/stores/travaux'
import { useToast } from '@/composables/useToast'
import type { Depot } from '@/types'

export const DEPOT_NOTES = ['A', 'B', 'C', 'D', 'NA'] as const

export function useDepotInlineGrading() {
  const travauxStore = useTravauxStore()
  const { showToast } = useToast()

  const editingNoteId = ref<number | null>(null)
  const noteInput = ref('')
  const editingFeedbackId = ref<number | null>(null)
  const feedbackInput = ref('')
  const saving = ref(false)

  function startNote(d: Depot) {
    editingNoteId.value = d.id
    noteInput.value = d.note ?? ''
    editingFeedbackId.value = null
  }

  async function saveNote(d: Depot) {
    saving.value = true
    try {
      await travauxStore.setNote({ depotId: d.id, note: noteInput.value })
      editingNoteId.value = null
      showToast('Note enregistree', 'success')
    } finally {
      saving.value = false
    }
  }

  function startFeedback(d: Depot) {
    editingFeedbackId.value = d.id
    feedbackInput.value = d.feedback ?? ''
    editingNoteId.value = null
  }

  async function saveFeedback(d: Depot) {
    saving.value = true
    try {
      await travauxStore.setFeedback({ depotId: d.id, feedback: feedbackInput.value })
      editingFeedbackId.value = null
      showToast('Commentaire enregistre', 'success')
    } finally {
      saving.value = false
    }
  }

  return {
    editingNoteId, noteInput,
    editingFeedbackId, feedbackInput,
    saving,
    startNote, saveNote,
    startFeedback, saveFeedback,
  }
}
