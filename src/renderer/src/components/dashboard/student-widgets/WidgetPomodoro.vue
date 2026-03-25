/**
 * WidgetPomodoro.vue - Minuteur Pomodoro simple.
 */
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Timer, Play, Pause, RotateCcw } from 'lucide-vue-next'

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
  if (running.value) {
    stopTimer()
  } else {
    startTimer()
  }
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
  <div class="dashboard-card sa-card sa-pomodoro" :class="`sa-pomodoro--${state}`">
    <div class="sa-card-header">
      <Timer :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Pomodoro</span>
      <span class="sa-pomo-state">{{ stateLabel }}</span>
    </div>
    <div class="sa-pomo-body">
      <span class="sa-pomo-time sa-mono">{{ display }}</span>
      <div class="sa-pomo-actions">
        <button class="sa-pomo-btn" :title="running ? 'Pause' : 'Démarrer'" @click="toggleTimer">
          <Pause v-if="running" :size="14" />
          <Play v-else :size="14" />
        </button>
        <button class="sa-pomo-btn sa-pomo-btn--reset" title="Réinitialiser" @click="resetTimer">
          <RotateCcw :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sa-mono { font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace; }

.sa-pomo-state {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sa-pomodoro--work { border-left: 3px solid var(--accent); }
.sa-pomodoro--work .sa-pomo-state { color: var(--accent); }
.sa-pomodoro--work .sa-pomo-time { color: var(--accent); }

.sa-pomodoro--break { border-left: 3px solid var(--color-success, #27ae60); }
.sa-pomodoro--break .sa-pomo-state { color: var(--color-success, #27ae60); }
.sa-pomodoro--break .sa-pomo-time { color: var(--color-success, #27ae60); }

.sa-pomo-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 0 2px;
}

.sa-pomo-time {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 2px;
}

.sa-pomo-actions {
  display: flex;
  gap: 8px;
}

.sa-pomo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: opacity .15s;
}
.sa-pomo-btn:hover { opacity: .85; }

.sa-pomo-btn--reset {
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-muted);
}
.sa-pomo-btn--reset:hover { color: var(--text-primary); }
</style>
