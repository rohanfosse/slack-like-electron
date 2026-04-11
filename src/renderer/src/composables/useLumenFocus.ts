/**
 * Mode focus Lumen : masque la sidebar globale Cursus quand on est dans
 * /lumen pour offrir une experience plein-ecran de lecture. Preference
 * persistee en localStorage.
 *
 * v2.48 : default = TRUE (focus ON par defaut). Le mode plein-ecran est
 * l'experience attendue dans Lumen — l'utilisateur peut le desactiver
 * via le bouton focus (panel) dans la topbar et la pref est persistee.
 * Le bouton "Cursus" (home) reste toujours present pour ressortir du
 * module independamment du focus mode.
 */
import { ref, watch } from 'vue'

const STORAGE_KEY = 'cursus.lumen.focusMode'

function readInitial(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Si jamais set explicitement, default = ON (true)
    if (stored === null) return true
    return stored === '1'
  } catch {
    return true
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
