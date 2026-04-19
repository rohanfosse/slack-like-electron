<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Timer, Play, Pause, RotateCcw } from 'lucide-vue-next'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

type PomodoroState = 'idle' | 'work' | 'break'

const WORK_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

const state = ref<PomodoroState>('idle')
const remaining = ref(WORK_SECONDS)
const running = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const display = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const stateLabel = computed(() => {
  if (state.value === 'work') return 'Travail'
  if (state.value === 'break') return 'Pause'
  return 'Prêt'
})

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.3
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    setTimeout(() => ctx.close(), 500)
  } catch {
    // AudioContext not available
  }
}

function tick() {
  if (remaining.value <= 0) {
    stopTimer()
    playBeep()
    if (state.value === 'work') {
      state.value = 'break'
      remaining.value = BREAK_SECONDS
      startTimer()
    } else {
      state.value = 'idle'
      remaining.value = WORK_SECONDS
    }
    return
  }
  remaining.value--
}

function startTimer() {
  if (timer) clearInterval(timer)
  if (state.value === 'idle') state.value = 'work'
  running.value = true
  timer = setInterval(tick, 1000)
}

function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
  running.value = false
}

function toggleTimer() {
  if (running.value) stopTimer()
  else startTimer()
}

function resetTimer() {
  stopTimer()
  state.value = 'idle'
  remaining.value = WORK_SECONDS
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <UiWidgetCard
    :icon="Timer"
    label="Pomodoro"
    :tone="state === 'work' ? 'accent' : state === 'break' ? 'success' : 'none'"
    aria-label="Minuteur Pomodoro"
  >
    <template #header-extra>
      <span class="wp-state">{{ stateLabel }}</span>
    </template>

    <div class="wp-body">
      <span class="wp-time" :class="`wp-time--${state}`">{{ display }}</span>
      <div class="wp-actions">
        <button class="wp-btn" :aria-label="running ? 'Pause' : 'Démarrer'" @click="toggleTimer">
          <Pause v-if="running" :size="14" />
          <Play v-else :size="14" />
        </button>
        <button class="wp-btn wp-btn--reset" aria-label="Réinitialiser" @click="resetTimer">
          <RotateCcw :size="14" />
        </button>
      </div>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wp-state {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.wp-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 0 2px;
}

.wp-time {
  font-family: var(--font-mono);
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  transition: color var(--motion-fast) var(--ease-out);
}
.wp-time--work  { color: var(--accent); }
.wp-time--break { color: var(--color-success); }

.wp-actions {
  display: flex;
  gap: var(--space-sm);
}

.wp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: opacity var(--motion-fast) var(--ease-out);
}
.wp-btn:hover { opacity: .85; }
.wp-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.wp-btn--reset {
  background: var(--bg-input);
  color: var(--text-muted);
}
.wp-btn--reset:hover { color: var(--text-primary); opacity: 1; }
</style>
