/**
 * Banque de commentaires rapides pour la notation (feedback bank).
 * Stockage localStorage + commentaires par defaut.
 */
import { ref, computed } from 'vue'

const DEFAULT_FEEDBACK = [
  'Excellent travail, bravo !',
  'Bonne structure et organisation',
  'Code insuffisamment commenté',
  'Rendu incomplet',
  'Hors sujet par rapport aux consignes',
  'À retravailler et soumettre à nouveau',
  'Manque de profondeur dans l\'analyse',
  'Bon effort, quelques ajustements nécessaires',
]

const CUSTOM_FB_KEY = 'cc_custom_feedback'

function loadCustomFeedback(): string[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FB_KEY) || '[]') } catch { return [] }
}

export function useDepotFeedbackBank() {
  const customFeedback = ref<string[]>(loadCustomFeedback())
  const feedbackBank = computed(() => [...customFeedback.value, ...DEFAULT_FEEDBACK])
  const newFeedbackText = ref('')
  const showAddFeedback = ref(false)

  function addCustomFeedback() {
    const text = newFeedbackText.value.trim()
    if (!text || customFeedback.value.includes(text)) return
    customFeedback.value = [text, ...customFeedback.value]
    localStorage.setItem(CUSTOM_FB_KEY, JSON.stringify(customFeedback.value))
    newFeedbackText.value = ''
    showAddFeedback.value = false
  }

  function removeCustomFeedback(text: string) {
    customFeedback.value = customFeedback.value.filter(f => f !== text)
    localStorage.setItem(CUSTOM_FB_KEY, JSON.stringify(customFeedback.value))
  }

  function insertFeedback(target: { value: string }, text: string) {
    target.value = target.value ? target.value.trimEnd() + ' ' + text : text
  }

  return {
    feedbackBank,
    customFeedback,
    newFeedbackText,
    showAddFeedback,
    addCustomFeedback,
    removeCustomFeedback,
    insertFeedback,
  }
}
