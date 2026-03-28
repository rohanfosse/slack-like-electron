/**
 * WidgetCountdown.vue - Compte à rebours vers la prochaine échéance.
 */
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Hourglass } from 'lucide-vue-next'

export interface NextDeadline {
  title: string
  deadline: string
}

const props = defineProps<{ nextDeadline: NextDeadline | null }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  stopTimer()
  now.value = Date.now()
  timer = setInterval(() => { now.value = Date.now() }, 60_000)
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

onMounted(() => { if (props.nextDeadline) startTimer() })
onUnmounted(stopTimer)

watch(() => props.nextDeadline, (v) => { v ? startTimer() : stopTimer() })

const remaining = computed(() => {
  if (!props.nextDeadline) return null
  const diff = new Date(props.nextDeadline.deadline).getTime() - now.value
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, total: 0 }
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, minutes, total: diff }
})

const colorClass = computed(() => {
  if (!remaining.value) return ''
  const ms = remaining.value.total
  if (ms > 7 * 86_400_000) return 'cd--green'
  if (ms > 86_400_000) return 'cd--orange'
  return 'cd--red'
})
</script>

<template>
  <div class="dashboard-card sa-card sa-countdown" aria-label="Compte a rebours">
    <div class="sa-card-header">
      <Hourglass :size="14" class="sa-card-icon sa-icon--countdown" />
      <span class="sa-section-label">Prochaine échéance</span>
    </div>
    <template v-if="nextDeadline && remaining">
      <div class="sa-cd-value" :class="colorClass">
        {{ remaining.days }}j {{ remaining.hours }}h {{ remaining.minutes }}m
      </div>
      <p class="sa-cd-title">{{ nextDeadline.title }}</p>
    </template>
    <p v-else class="sa-empty">Aucune échéance à venir</p>
  </div>
</template>

<style scoped>
.sa-countdown { border-left: 3px solid var(--color-countdown, #6366f1); }
.sa-icon--countdown { color: var(--color-countdown, #6366f1); }

.sa-cd-value {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.cd--green  { color: #22c55e; }
.cd--orange { color: #f59e0b; }
.cd--red    { color: #ef4444; }

.sa-cd-title {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* .sa-empty in devoirs-shared.css */
</style>
