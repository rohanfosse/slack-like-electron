/**
 * WidgetDailyGoal.vue — Objectif du jour personnalisable par
 * l'etudiant. Stocke en localStorage par date : chaque nouveau jour
 * reset le texte (incite a formuler un objectif frais chaque matin).
 * Case a cocher pour marquer l'objectif comme accompli.
 */
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Target, Check } from 'lucide-vue-next'

const STORAGE_KEY = 'student_daily_goal'
const MAX_CHARS = 200

interface DailyGoal {
  date: string   // YYYY-MM-DD
  text: string
  done: boolean
}

const todayKey = (): string => new Date().toISOString().slice(0, 10)
const goal = ref<DailyGoal>({ date: todayKey(), text: '', done: false })
const initialized = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as DailyGoal
      // Reset si la date a change (nouveau jour)
      if (parsed.date === todayKey()) {
        goal.value = parsed
      }
    }
  } catch { /* ignore */ }
  initialized.value = true
})

// Debounce 500ms pour ne pas thrash localStorage pendant la saisie
let persistTimer: ReturnType<typeof setTimeout> | null = null
watch(goal, (newVal) => {
  if (!initialized.value) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    } catch { /* quota */ }
  }, 500)
}, { deep: true })

function toggleDone() {
  goal.value = { ...goal.value, done: !goal.value.done }
}

const hasText = computed(() => goal.value.text.trim().length > 0)
</script>

<template>
  <div class="dashboard-card sa-card wdg-card" :class="{ 'wdg-card--done': goal.done }">
    <div class="sa-card-header">
      <Target :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Objectif du jour</span>
      <button
        v-if="hasText"
        type="button"
        class="wdg-check"
        :class="{ 'wdg-check--done': goal.done }"
        :title="goal.done ? 'Annuler' : 'Marquer comme fait'"
        :aria-label="goal.done ? 'Annuler l objectif' : 'Marquer l objectif comme accompli'"
        :aria-pressed="goal.done"
        @click="toggleDone"
      >
        <Check :size="12" />
      </button>
    </div>

    <textarea
      v-model="goal.text"
      class="wdg-textarea"
      :class="{ 'wdg-textarea--done': goal.done }"
      :maxlength="MAX_CHARS"
      placeholder="Quel est ton objectif aujourd'hui ?"
      aria-label="Objectif du jour"
      rows="3"
    />
  </div>
</template>

<style scoped>
.wdg-card {
  transition: background 200ms ease;
}
.wdg-card--done {
  background: linear-gradient(135deg, rgba(63, 183, 111, 0.05) 0%, rgba(63, 183, 111, 0.02) 100%);
}

.wdg-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  margin-top: 6px;
  padding: 6px;
  box-sizing: border-box;
  min-height: 60px;
  transition: opacity 200ms ease;
}
.wdg-textarea::placeholder {
  color: var(--text-muted);
  font-style: italic;
}
.wdg-textarea:focus {
  background: var(--bg-input);
  border-radius: var(--radius-sm);
}
.wdg-textarea--done {
  text-decoration: line-through;
  opacity: 0.55;
}

.wdg-check {
  margin-left: auto;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--text-muted);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition: all 150ms ease;
}
.wdg-check:hover { border-color: var(--accent); }
.wdg-check--done {
  background: #3fb76f;
  border-color: #3fb76f;
  color: white;
}
.wdg-check:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
