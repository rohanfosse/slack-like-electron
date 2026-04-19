<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Clock } from 'lucide-vue-next'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

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
  <UiWidgetCard :icon="Clock" label="Horloge">
    <div class="wc-body">
      <span class="wc-time">{{ time }}</span>
      <span class="wc-date">{{ dateStr }}</span>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wc-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 2px;
}

.wc-time {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.wc-date {
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-transform: capitalize;
}
</style>
