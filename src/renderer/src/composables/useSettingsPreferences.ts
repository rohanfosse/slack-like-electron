/**
 * Preferences settings composable - notification toggles, input behavior,
 * accessibility, and document opening defaults.
 * Used by SettingsModal.vue
 */
import { ref, watch } from 'vue'
import { usePrefs } from '@/composables/usePrefs'

export function useSettingsPreferences() {
  const { getPref, setPref } = usePrefs()

  const docsDefault  = ref(getPref('docsOpenByDefault'))
  const notifSound   = ref(getPref('notifSound') ?? true)
  const notifDesktop = ref(getPref('notifDesktop') ?? true)
  const enterToSend  = ref(getPref('enterToSend') ?? true)
  const reduceMotion = ref(getPref('reduceMotion') ?? false)
  const autoMarkRead = ref(getPref('autoMarkRead') ?? true)
  const spellCheck   = ref(getPref('spellCheck') ?? true)

  watch(docsDefault,  (v) => setPref('docsOpenByDefault', v))
  watch(notifSound,   (v) => setPref('notifSound', v))
  watch(notifDesktop, (v) => setPref('notifDesktop', v))
  watch(enterToSend,  (v) => setPref('enterToSend', v))
  watch(reduceMotion, (v) => {
    setPref('reduceMotion', v)
    document.documentElement.classList.toggle('reduce-motion', v)
  })
  watch(autoMarkRead, (v) => setPref('autoMarkRead', v))
  watch(spellCheck,   (v) => setPref('spellCheck', v))

  return {
    docsDefault,
    notifSound,
    notifDesktop,
    enterToSend,
    reduceMotion,
    autoMarkRead,
    spellCheck,
  }
}
