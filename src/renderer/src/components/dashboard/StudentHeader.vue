/**
 * StudentHeader.vue
 * Header section of the student dashboard: greeting, date, hamburger,
 * timeline and devoirs action buttons.
 */
<script setup lang="ts">
import { LayoutDashboard, CalendarDays, BookOpen, Menu } from 'lucide-vue-next'

defineProps<{
  toggleSidebar?: () => void
  greetingName: string
  today: string
}>()

const emit = defineEmits<{
  openStudentTimeline: []
  navigateDevoirs: []
}>()
</script>

<template>
  <div class="db-header">
    <div class="db-header-left">
      <button v-if="toggleSidebar" class="mobile-hamburger" aria-label="Ouvrir le menu" @click="toggleSidebar">
        <Menu :size="22" />
      </button>
      <LayoutDashboard :size="20" class="db-header-icon" />
      <div>
        <h1 class="db-title">Bonjour, {{ greetingName }}</h1>
        <p class="db-date">{{ today }}</p>
      </div>
    </div>
    <div class="db-header-actions">
      <button class="btn-ghost db-echeancier-btn" @click="emit('openStudentTimeline')">
        <CalendarDays :size="14" /> Ma timeline
      </button>
      <button class="btn-ghost db-echeancier-btn" @click="emit('navigateDevoirs')">
        <BookOpen :size="14" /> Tous mes devoirs
      </button>
    </div>
  </div>
</template>

<style scoped>
.db-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.db-header-left { display: flex; align-items: center; gap: 12px; }
.db-header-icon { color: var(--accent); }
.db-title { font-size: 20px; font-weight: 800; color: var(--text-primary); line-height: 1.2; }
.db-date  { font-size: 12px; color: var(--text-muted); margin-top: 2px; text-transform: capitalize; }
.db-echeancier-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 12px; flex-shrink: 0; }
.db-header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
</style>
