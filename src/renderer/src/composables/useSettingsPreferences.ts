/**
 * Preferences settings composable - notification toggles, input behavior,
 * document opening defaults, granular notifications, and Do Not Disturb.
 */
import { ref, computed, watch } from 'vue'
import { usePrefs } from '@/composables/usePrefs'

export function useSettingsPreferences() {
  const { getPref, setPref } = usePrefs()

  // ── Existants ──────────────────────────────────────────────────────────────
  const docsDefault  = ref(getPref('docsOpenByDefault'))
  const notifSound   = ref(getPref('notifSound') ?? true)
  const notifDesktop = ref(getPref('notifDesktop') ?? true)
  const enterToSend  = ref(getPref('enterToSend') ?? true)

  watch(docsDefault,  (v) => setPref('docsOpenByDefault', v))
  watch(notifSound,   (v) => setPref('notifSound', v))
  watch(notifDesktop, (v) => setPref('notifDesktop', v))
  watch(enterToSend,  (v) => setPref('enterToSend', v))

  // ── Notifications granulaires ──────────────────────────────────────────────
  const notifMentions = ref(getPref('notifMentions') ?? true)
  const notifDms      = ref(getPref('notifDms') ?? true)
  const notifDevoirs  = ref(getPref('notifDevoirs') ?? true)
  const notifAnnonces = ref(getPref('notifAnnonces') ?? true)

  watch(notifMentions, (v) => setPref('notifMentions', v))
  watch(notifDms,      (v) => setPref('notifDms', v))
  watch(notifDevoirs,  (v) => setPref('notifDevoirs', v))
  watch(notifAnnonces, (v) => setPref('notifAnnonces', v))

  // ── Mode Ne Pas Deranger ───────────────────────────────────────────────────
  const dndEnabled = ref(getPref('dndEnabled') ?? false)
  const dndStart   = ref(getPref('dndStart') ?? '22:00')
  const dndEnd     = ref(getPref('dndEnd') ?? '08:00')

  watch(dndEnabled, (v) => setPref('dndEnabled', v))
  watch(dndStart,   (v) => setPref('dndStart', v))
  watch(dndEnd,     (v) => setPref('dndEnd', v))

  /** Verifie si on est actuellement en periode DND. */
  const isDndActive = computed(() => {
    if (!dndEnabled.value) return false
    const now = new Date()
    const hh = now.getHours()
    const mm = now.getMinutes()
    const current = hh * 60 + mm

    const [sh, sm] = dndStart.value.split(':').map(Number)
    const [eh, em] = dndEnd.value.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em

    // Si start > end, la plage traverse minuit (ex: 22:00 → 08:00)
    if (start > end) return current >= start || current < end
    return current >= start && current < end
  })

  return {
    docsDefault, notifSound, notifDesktop, enterToSend,
    notifMentions, notifDms, notifDevoirs, notifAnnonces,
    dndEnabled, dndStart, dndEnd, isDndActive,
  }
}
