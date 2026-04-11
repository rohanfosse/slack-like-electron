/**
 * Mode focus Lumen : masque la sidebar globale Cursus quand on est dans
 * /lumen pour offrir une experience plein-ecran de lecture. Toggle depuis
 * la topbar Lumen, preference persistee en localStorage.
 *
 * Pattern Notion/Obsidian : on garde un raccourci visible (bouton avec icone
 * panel) pour ressortir, et on auto-masque seulement si l'utilisateur a
 * explicitement active le mode (default off pour ne pas surprendre).
 */
import { ref, watch } from 'vue'

const STORAGE_KEY = 'cursus.lumen.focusMode'

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// Singleton module-level — partage entre App.vue et LumenView.vue sans Pinia.
const lumenFocusMode = ref<boolean>(readInitial())

watch(lumenFocusMode, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch { /* quota / safari private mode */ }
})

export function useLumenFocus() {
  function toggle() {
    lumenFocusMode.value = !lumenFocusMode.value
  }
  return { lumenFocusMode, toggle }
}
