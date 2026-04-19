<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Target, Check } from 'lucide-vue-next'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

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
      if (parsed.date === todayKey()) {
        goal.value = parsed
      }
    }
  } catch { /* ignore */ }
  initialized.value = true
})

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

onUnmounted(() => {
  if (persistTimer) clearTimeout(persistTimer)
})

function toggleDone() {
  goal.value = { ...goal.value, done: !goal.value.done }
}

const hasText = computed(() => goal.value.text.trim().length > 0)
</script>

<template>
  <UiWidgetCard
    :icon="Target"
    label="Objectif du jour"
    class="wdg-card"
    :class="{ 'wdg-card--done': goal.done }"
  >
    <template v-if="hasText" #header-extra>
      <button
        type="button"
        class="wdg-check"
        :class="{ 'wdg-check--done': goal.done }"
        :aria-label="goal.done ? 'Annuler l’objectif' : 'Marquer l’objectif comme accompli'"
        :aria-pressed="goal.done"
        @click="toggleDone"
      >
        <Check :size="12" />
      </button>
    </template>

    <textarea
      v-model="goal.text"
      class="wdg-textarea"
      :class="{ 'wdg-textarea--done': goal.done }"
      :maxlength="MAX_CHARS"
      placeholder="Quel est ton objectif aujourd'hui ?"
      aria-label="Objectif du jour"
      rows="3"
    />
  </UiWidgetCard>
</template>

<style scoped>
.wdg-card {
  transition: background var(--motion-base) var(--ease-out);
}
.wdg-card--done {
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), .05) 0%, rgba(var(--color-success-rgb), .02) 100%);
}

.wdg-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.5;
  resize: none;
  padding: var(--space-xs);
  box-sizing: border-box;
  min-height: 60px;
  transition: opacity var(--motion-base) var(--ease-out);
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
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--text-muted);
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition:
    background var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out);
}
.wdg-check:hover { border-color: var(--accent); }
.wdg-check--done {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}
.wdg-check:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
