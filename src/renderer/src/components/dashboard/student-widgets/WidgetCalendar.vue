/**
 * WidgetCalendar.vue - Mini calendrier mensuel avec points de deadline.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays } from 'lucide-vue-next'

const props = defineProps<{
  deadlines: { date: string; title: string }[]
}>()

const DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth()
const today = now.getDate()

const headerLabel = computed(() => `${MONTHS[month]} ${year}`)

interface CalendarCell { day: number; inMonth: boolean; hasDeadline: boolean; isToday: boolean }

const cells = computed<CalendarCell[]>(() => {
  const first = new Date(year, month, 1)
  // Monday-based: 0=Mon … 6=Sun
  const startDay = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const deadlineDays = new Set(
    props.deadlines
      .map((d) => {
        const dt = new Date(d.date)
        return dt.getFullYear() === year && dt.getMonth() === month ? dt.getDate() : -1
      })
      .filter((d) => d > 0),
  )

  const result: CalendarCell[] = []

  // Leading blanks
  for (let i = 0; i < startDay; i++) {
    result.push({ day: 0, inMonth: false, hasDeadline: false, isToday: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    result.push({
      day: d,
      inMonth: true,
      hasDeadline: deadlineDays.has(d),
      isToday: d === today,
    })
  }

  return result
})
</script>

<template>
  <div class="dashboard-card sa-card sa-calendar" aria-label="Calendrier des echeances">
    <div class="sa-card-header">
      <CalendarDays :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Calendrier</span>
      <span class="sa-cal-month">{{ headerLabel }}</span>
    </div>
    <div class="sa-cal-grid">
      <span v-for="d in DAYS_SHORT" :key="d" class="sa-cal-head">{{ d }}</span>
      <span
        v-for="(cell, i) in cells"
        :key="i"
        class="sa-cal-cell"
        :class="{
          'sa-cal-today': cell.isToday,
          'sa-cal-blank': !cell.inMonth,
        }"
        :title="cell.hasDeadline ? 'Échéance ce jour' : undefined"
      >
        <template v-if="cell.inMonth">{{ cell.day }}</template>
        <span v-if="cell.hasDeadline" class="sa-cal-dot" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.sa-cal-month {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.sa-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  text-align: center;
  font-size: 10px;
}

.sa-cal-head {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted);
  padding: 2px 0;
  text-transform: uppercase;
}

.sa-cal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 22px;
  border-radius: 4px;
  color: var(--text-primary);
  font-weight: 500;
}

.sa-cal-blank { visibility: hidden; }

.sa-cal-today {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
}

.sa-cal-dot {
  position: absolute;
  bottom: 1px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-danger, #e74c3c);
}
</style>
