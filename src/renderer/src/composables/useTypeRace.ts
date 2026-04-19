/**
 * useTypeRace — logique du mini-jeu typing speed.
 *
 * Etats :
 *   'idle'    : phrase chargee, chrono en attente du 1er keystroke
 *   'playing' : chrono arme, WPM echantillonne toutes les 500ms
 *   'done'    : 60s ecoulees OU phrase tapee a fond
 *
 * Score : WPM (1 mot = 5 caracteres) x precision, 0-1.
 *
 * Anti-triche :
 *   - Client : paste bloque dans la view.
 *   - Serveur : coherence wpm / durationMs / word count (route POST /scores).
 *
 * Anti-rejeu : les 20 dernieres phrase_id servies sont persistees dans
 * localStorage (`typerace:seen`) et envoyees au backend en `exclude=`.
 *
 * Signaux exposes pour la view :
 *   - wpmSamples : WPM a chaque tick 500ms, pour sparkline live
 *   - errorTick  : incremente a chaque nouveau char faux (trigger shake CSS)
 *   - cursorPos  : position du curseur (= typed.length)
 */
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

const SEEN_KEY = 'typerace:seen'
const MAX_SEEN = 20
const GAME_DURATION_MS = 60_000
const SAMPLE_INTERVAL_MS = 500
const MAX_SAMPLES = 120 // 60s / 500ms
const CHARS_PER_WORD = 5

type GameState = 'idle' | 'playing' | 'done'

interface Phrase { id: number; text: string }
interface SubmitResult { id: number; score: number }

function loadSeenIds(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return []
    const ids = JSON.parse(raw)
    return Array.isArray(ids) ? ids.filter((n: unknown) => typeof n === 'number') : []
  } catch {
    return []
  }
}

function saveSeenId(id: number): void {
  try {
    const seen = loadSeenIds()
    const next = [id, ...seen.filter((x) => x !== id)].slice(0, MAX_SEEN)
    localStorage.setItem(SEEN_KEY, JSON.stringify(next))
  } catch { /* localStorage indisponible */ }
}

export function useTypeRace() {
  const { api } = useApi()

  const state      = ref<GameState>('idle')
  const phrase     = ref<Phrase | null>(null)
  const typed      = ref('')
  const startedAt  = ref<number | null>(null)
  const elapsedMs  = ref(0)
  const loading    = ref(false)
  const lastResult = ref<{ wpm: number; accuracy: number; score: number } | null>(null)

  /**
   * Curseur d'erreur ephemere : incremente quand on ajoute un char faux.
   * La view ecoute cette ref pour declencher une animation shake.
   */
  const errorTick = ref(0)

  /**
   * Echantillons WPM au fil du jeu (1 toutes les 500ms). Alimente la
   * sparkline live dans la view et le graphique de l'ecran de fin.
   */
  const wpmSamples = ref<number[]>([])

  let tickInterval: ReturnType<typeof setInterval> | null = null

  // ── Derives ────────────────────────────────────────────────────────────

  const cursorPos = computed(() => typed.value.length)

  const remainingMs = computed(() =>
    startedAt.value == null ? GAME_DURATION_MS : Math.max(0, GAME_DURATION_MS - elapsedMs.value),
  )

  const remainingSec = computed(() => Math.ceil(remainingMs.value / 1000))

  const progress = computed(() => {
    if (!phrase.value) return 0
    return Math.min(1, typed.value.length / phrase.value.text.length)
  })

  const correctChars = computed(() => {
    if (!phrase.value) return 0
    let n = 0
    const target = phrase.value.text
    const input = typed.value
    const len = Math.min(target.length, input.length)
    for (let i = 0; i < len; i++) if (input[i] === target[i]) n++
    return n
  })

  const accuracy = computed(() => {
    if (typed.value.length === 0) return 1
    return correctChars.value / typed.value.length
  })

  const wpm = computed(() => {
    if (!startedAt.value || elapsedMs.value <= 0) return 0
    const minutes = elapsedMs.value / 60_000
    return (typed.value.length / CHARS_PER_WORD) / minutes
  })

  const score = computed(() => Math.round(wpm.value * accuracy.value))

  // ── Actions ────────────────────────────────────────────────────────────

  async function loadPhrase(): Promise<void> {
    loading.value = true
    try {
      const excludeIds = loadSeenIds()
      const data = await api<Phrase>(() => window.api.typeRaceRandomPhrase(excludeIds))
      if (data) {
        phrase.value = data
        saveSeenId(data.id)
        resetGame()
      }
    } finally {
      loading.value = false
    }
  }

  function resetGame(): void {
    state.value = 'idle'
    typed.value = ''
    startedAt.value = null
    elapsedMs.value = 0
    lastResult.value = null
    wpmSamples.value = []
    errorTick.value = 0
    stopTicker()
  }

  function onInput(value: string): void {
    if (state.value === 'done' || !phrase.value) return

    // Demarrage lazy : chrono arme au 1er char
    if (state.value === 'idle' && value.length > 0) {
      state.value = 'playing'
      startedAt.value = Date.now()
      startTicker()
    }

    // Detection d'un nouveau char FAUX (pour declencher shake) : on
    // regarde si le char qu'on vient d'ajouter diverge de la cible.
    if (value.length > typed.value.length && phrase.value) {
      const lastIdx = value.length - 1
      if (value[lastIdx] !== phrase.value.text[lastIdx]) {
        errorTick.value++
      }
    }

    typed.value = value

    if (phrase.value.text === value) finish()
  }

  function startTicker(): void {
    stopTicker()
    let lastSampleAt = 0
    tickInterval = setInterval(() => {
      if (startedAt.value == null) return
      elapsedMs.value = Date.now() - startedAt.value

      // Echantillonner WPM une fois par SAMPLE_INTERVAL_MS
      if (elapsedMs.value - lastSampleAt >= SAMPLE_INTERVAL_MS) {
        lastSampleAt = elapsedMs.value
        wpmSamples.value = [...wpmSamples.value, wpm.value].slice(-MAX_SAMPLES)
      }

      if (elapsedMs.value >= GAME_DURATION_MS) finish()
    }, 100)
  }

  function stopTicker(): void {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
  }

  async function finish(): Promise<void> {
    if (state.value === 'done' || !phrase.value || startedAt.value == null) return
    state.value = 'done'
    const durationMs = Math.min(GAME_DURATION_MS, Date.now() - startedAt.value)
    elapsedMs.value = durationMs
    stopTicker()

    // Sample final pour que la sparkline se termine sur le score final
    wpmSamples.value = [...wpmSamples.value, wpm.value].slice(-MAX_SAMPLES)

    const finalWpm = wpm.value
    const finalAccuracy = accuracy.value
    const finalScore = Math.round(finalWpm * finalAccuracy)

    lastResult.value = { wpm: finalWpm, accuracy: finalAccuracy, score: finalScore }

    await api<SubmitResult>(() => window.api.typeRaceSubmitScore({
      phraseId:   phrase.value!.id,
      wpm:        Math.round(finalWpm * 10) / 10,
      accuracy:   Math.round(finalAccuracy * 1000) / 1000,
      durationMs,
    }))
  }

  function cleanup(): void {
    stopTicker()
  }

  return {
    // State
    state, phrase, typed, loading, lastResult,
    wpmSamples, errorTick,
    // Derives
    cursorPos, remainingMs, remainingSec, progress,
    correctChars, accuracy, wpm, score,
    // Actions
    loadPhrase, resetGame, onInput, finish, cleanup,
    // Constants
    GAME_DURATION_MS,
  }
}
