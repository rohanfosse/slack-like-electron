/**
 * WidgetClock.vue - Horloge en temps réel avec date.
 */
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Clock } from 'lucide-vue-next'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const time = ref('00:00:00')
const dateStr = ref('')

function tick() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  time.value = `${hh}:${mm}:${ss}`
  dateStr.value = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="dashboard-card sa-card sa-clock">
    <div class="sa-card-header">
      <Clock :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Horloge</span>
    </div>
    <div class="sa-clock-body">
      <span class="sa-clock-time sa-mono">{{ time }}</span>
      <span class="sa-clock-date">{{ dateStr }}</span>
    </div>
  </div>
</template>

<style scoped>
.sa-mono { font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace; }

.sa-clock-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 2px;
}

.sa-clock-time {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.sa-clock-date {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: capitalize;
}
</style>
