<!-- StudentLiveView.vue - Vue étudiant pour le Live Quiz interactif -->
<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { Radio, CheckCircle2, Send, LogOut } from 'lucide-vue-next'
  import { useAppStore }  from '@/stores/app'
  import { useLiveStore } from '@/stores/live'
  import QcmResults  from './QcmResults.vue'
  import PollResults from './PollResults.vue'
  import WordCloud   from './WordCloud.vue'

  const appStore  = useAppStore()
  const liveStore = useLiveStore()

  const joinCode  = ref('')
  const joining   = ref(false)
  const textInput = ref('')
  const wordInputs = ref<string[]>([])

  // Selected QCM answers (indices)
  const selectedAnswers = ref<number[]>([])

  const promoId = computed(() => appStore.currentUser?.promo_id ?? 0)
  const session = computed(() => liveStore.currentSession)
  const activity = computed(() => liveStore.currentActivity)

  // Initialize word inputs when activity changes
  watch(activity, (act) => {
    if (act?.type === 'nuage') {
      wordInputs.value = Array.from({ length: act.max_words || 2 }, () => '')
    }
    selectedAnswers.value = []
    textInput.value = ''
    liveStore.hasResponded = false
  })

  onMounted(async () => {
    liveStore.initSocketListeners()
    // Auto-detect active session for promo
    if (!session.value && promoId.value) {
      await liveStore.fetchActiveForPromo(promoId.value)
    }
  })
  onUnmounted(() => {
    liveStore.disposeSocketListeners()
  })

  async function joinSession() {
    if (!joinCode.value.trim()) return
    joining.value = true
    await liveStore.joinByCode(joinCode.value.trim().toUpperCase())
    joining.value = false
  }

  function toggleAnswer(index: number) {
    const idx = selectedAnswers.value.indexOf(index)
    if (activity.value?.multi) {
      if (idx >= 0) selectedAnswers.value.splice(idx, 1)
      else selectedAnswers.value.push(index)
    } else {
      selectedAnswers.value = idx >= 0 ? [] : [index]
    }
  }

  async function submitQcm() {
    if (!activity.value || selectedAnswers.value.length === 0) return
    await liveStore.submitResponse(activity.value.id, { answers: selectedAnswers.value })
  }

  async function submitText() {
    if (!activity.value || !textInput.value.trim()) return
    await liveStore.submitResponse(activity.value.id, { text: textInput.value.trim() })
  }

  async function submitWords() {
    if (!activity.value) return
    const filtered = wordInputs.value.map(w => w.trim()).filter(Boolean)
    if (filtered.length === 0) return
    await liveStore.submitResponse(activity.value.id, { words: filtered })
  }

  function leave() {
    liveStore.leaveSession()
  }
</script>

<template>
  <div class="student-live">
    <!-- ══════════ Pas de session ══════════ -->
    <div v-if="!session" class="live-join">
      <div class="join-hero">
        <Radio :size="44" class="hero-icon" />
        <h1 class="hero-title">Live Quiz</h1>
        <p class="hero-desc">Rejoignez une session avec un code</p>
      </div>

      <div class="join-card">
        <input
          v-model="joinCode"
          class="join-input"
          placeholder="Code à 6 caractères"
          maxlength="6"
          @keydown.enter="joinSession"
        />
        <button
          class="join-btn"
          :disabled="joinCode.trim().length < 4 || joining"
          @click="joinSession"
        >
          {{ joining ? 'Connexion...' : 'Rejoindre' }}
        </button>
      </div>
    </div>

    <!-- ══════════ En session ══════════ -->
    <div v-else class="live-in-session">
      <div class="session-bar">
        <span class="session-bar-title">{{ session.title }}</span>
        <button class="btn-leave" @click="leave">
          <LogOut :size="14" />
          Quitter
        </button>
      </div>

      <!-- Waiting for activity -->
      <div v-if="!activity || activity.status === 'pending'" class="waiting-state">
        <div class="waiting-dots">
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
        </div>
        <span class="waiting-text">En attente de la prochaine question...</span>
      </div>

      <!-- Activity live + not responded yet -->
      <div v-else-if="activity.status === 'live' && !liveStore.hasResponded" class="response-area">
        <h2 class="question-title">{{ activity.title }}</h2>

        <!-- QCM response -->
        <div v-if="activity.type === 'qcm' && activity.options" class="qcm-options">
          <button
            v-for="(opt, i) in activity.options"
            :key="i"
            class="qcm-option-btn"
            :class="{ selected: selectedAnswers.includes(i) }"
            @click="toggleAnswer(i)"
          >
            <span class="qcm-option-letter">{{ String.fromCharCode(65 + i) }}</span>
            <span class="qcm-option-text">{{ opt }}</span>
          </button>
          <button
            class="submit-btn"
            :disabled="selectedAnswers.length === 0"
            @click="submitQcm"
          >
            <Send :size="16" />
            Envoyer
          </button>
        </div>

        <!-- Sondage response -->
        <div v-else-if="activity.type === 'sondage'" class="text-response">
          <textarea
            v-model="textInput"
            class="text-input"
            placeholder="Votre réponse..."
            rows="3"
            maxlength="500"
          />
          <button
            class="submit-btn"
            :disabled="!textInput.trim()"
            @click="submitText"
          >
            <Send :size="16" />
            Envoyer
          </button>
        </div>

        <!-- Nuage response -->
        <div v-else-if="activity.type === 'nuage'" class="word-response">
          <div class="word-inputs">
            <input
              v-for="(_, i) in wordInputs"
              :key="i"
              v-model="wordInputs[i]"
              class="word-input"
              :placeholder="`Mot ${i + 1}`"
              maxlength="30"
            />
          </div>
          <button
            class="submit-btn"
            :disabled="wordInputs.every(w => !w.trim())"
            @click="submitWords"
          >
            <Send :size="16" />
            Envoyer
          </button>
        </div>
      </div>

      <!-- Responded -->
      <div v-else-if="liveStore.hasResponded && activity.status === 'live'" class="responded-state">
        <CheckCircle2 :size="48" class="responded-icon" />
        <span class="responded-text">Réponse envoyée</span>
        <span class="responded-sub">Les résultats apparaîtront bientôt</span>
      </div>

      <!-- Activity closed - show results -->
      <div v-else-if="activity.status === 'closed' && liveStore.results" class="results-student">
        <h3 class="results-label">Résultats</h3>
        <QcmResults v-if="activity.type === 'qcm'" :results="liveStore.results" />
        <PollResults v-else-if="activity.type === 'sondage'" :results="liveStore.results" />
        <WordCloud v-else-if="activity.type === 'nuage'" :results="liveStore.results" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-live {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-main, #111214);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Join ── */
.live-join {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  max-width: 400px;
  width: 100%;
  margin-top: 80px;
}
.join-hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.hero-icon { color: var(--accent, #4a90d9); opacity: .7; }
.hero-title { font-size: 28px; font-weight: 800; color: var(--text-primary, #fff); }
.hero-desc { font-size: 14px; color: var(--text-muted, #888); }
.join-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.join-input {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #1e1f21);
  border: 2px solid var(--border, rgba(255,255,255,.08));
  color: var(--text-primary, #fff);
  font-size: 24px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  text-align: center;
  letter-spacing: 6px;
  text-transform: uppercase;
  outline: none;
  transition: border-color .15s;
}
.join-input:focus { border-color: var(--accent, #4a90d9); }
.join-input::placeholder {
  font-size: 14px;
  letter-spacing: normal;
  text-transform: none;
  font-family: inherit;
  font-weight: 500;
}
.join-btn {
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  background: var(--accent, #4a90d9);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all .15s;
  min-height: 48px;
}
.join-btn:hover { filter: brightness(1.1); }
.join-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── In session ── */
.live-in-session {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.session-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-elevated, #1e1f21);
  border-radius: 10px;
  border: 1px solid var(--border, rgba(255,255,255,.08));
}
.session-bar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #fff);
}
.btn-leave {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
  background: rgba(239,68,68,.08); color: #f87171;
  border: 1px solid rgba(239,68,68,.15); cursor: pointer;
  transition: all .15s;
}
.btn-leave:hover { background: rgba(239,68,68,.15); }

/* ── Waiting ── */
.waiting-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 0;
}
.waiting-dots {
  display: flex;
  gap: 8px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent, #4a90d9);
  animation: dot-bounce 1.4s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: .16s; }
.dot:nth-child(3) { animation-delay: .32s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: .3; }
  40% { transform: scale(1); opacity: 1; }
}
.waiting-text {
  font-size: 16px;
  color: var(--text-muted, #888);
  font-weight: 600;
}

/* ── Response area ── */
.response-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.question-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary, #fff);
  text-align: center;
}

/* QCM */
.qcm-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.qcm-option-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--bg-elevated, #1e1f21);
  border: 2px solid rgba(255,255,255,.08);
  color: var(--text-primary, #fff);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
  text-align: left;
  min-height: 56px;
}
.qcm-option-btn:hover {
  border-color: rgba(255,255,255,.15);
  background: rgba(255,255,255,.06);
}
.qcm-option-btn.selected {
  border-color: var(--accent, #4a90d9);
  background: var(--accent-subtle, rgba(74,144,217,.12));
}
.qcm-option-letter {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
}
.qcm-option-btn.selected .qcm-option-letter {
  background: var(--accent, #4a90d9);
  color: #fff;
}
.qcm-option-text {
  flex: 1;
}

/* Text input */
.text-response {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.text-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #1e1f21);
  border: 2px solid rgba(255,255,255,.08);
  color: var(--text-primary, #fff);
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color .15s;
}
.text-input:focus { border-color: var(--accent, #4a90d9); }

/* Word inputs */
.word-response {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.word-inputs {
  display: flex;
  gap: 10px;
}
.word-input {
  flex: 1;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #1e1f21);
  border: 2px solid rgba(255,255,255,.08);
  color: var(--text-primary, #fff);
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
  min-height: 52px;
}
.word-input:focus { border-color: var(--accent, #4a90d9); }

/* Submit */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  background: var(--accent, #4a90d9);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all .15s;
  min-height: 52px;
}
.submit-btn:hover { filter: brightness(1.1); }
.submit-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── Responded ── */
.responded-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}
.responded-icon {
  color: #22c55e;
}
.responded-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #fff);
}
.responded-sub {
  font-size: 14px;
  color: var(--text-muted, #888);
}

/* ── Results student ── */
.results-student {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.results-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary, #aaa);
  text-transform: uppercase;
  letter-spacing: .5px;
}
</style>
