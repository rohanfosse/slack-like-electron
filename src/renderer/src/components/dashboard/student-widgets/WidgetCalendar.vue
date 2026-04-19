<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

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
  <UiWidgetCard
    :icon="CalendarDays"
    label="Calendrier"
    aria-label="Calendrier des échéances"
  >
    <template #header-extra>
      <span class="wcal-month">{{ headerLabel }}</span>
    </template>

    <div class="wcal-grid">
      <span v-for="d in DAYS_SHORT" :key="d" class="wcal-head">{{ d }}</span>
      <span
        v-for="(cell, i) in cells"
        :key="i"
        class="wcal-cell"
        :class="{
          'wcal-today': cell.isToday,
          'wcal-blank': !cell.inMonth,
        }"
        :title="cell.hasDeadline ? 'Échéance ce jour' : undefined"
      >
        <template v-if="cell.inMonth">{{ cell.day }}</template>
        <span v-if="cell.hasDeadline" class="wcal-dot" />
      </span>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wcal-month {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 600;
}

.wcal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  text-align: center;
  font-size: var(--text-2xs);
}

.wcal-head {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted);
  padding: 2px 0;
  text-transform: uppercase;
}

.wcal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 22px;
  border-radius: var(--radius-xs);
  color: var(--text-primary);
  font-weight: 500;
}

.wcal-blank { visibility: hidden; }

.wcal-today {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  border-radius: var(--radius-full);
}

.wcal-dot {
  position: absolute;
  bottom: 1px;
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
}
</style>
