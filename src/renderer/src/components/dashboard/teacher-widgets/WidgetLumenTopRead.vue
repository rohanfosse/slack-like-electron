/**
 * WidgetLumenTopRead.vue — Top 3 des cours Lumen les plus lus par la
 * promo (barres horizontales comparatives). Donne une vue rapide de
 * ce qui marche pedagogiquement.
 */
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BarChart3, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()
const lumenStore = useLumenStore()

onMounted(async () => {
  const promoId = appStore.activePromoId ?? appStore.currentUser?.promo_id
  if (!promoId) return
  if (lumenStore.courses.length === 0) {
    await lumenStore.fetchCoursesForPromo(promoId)
  }
  if (lumenStore.readCounts.size === 0) {
    await lumenStore.fetchReadCounts(promoId)
  }
})

interface TopCourse {
  id: number
  title: string
  reads: number
  pct: number  // relative to max
}

const topCourses = computed<TopCourse[]>(() => {
  const published = lumenStore.courses.filter(c => c.status === 'published')
  const scored = published
    .map(c => ({ id: c.id, title: c.title, reads: lumenStore.readCounts.get(c.id) ?? 0 }))
    .filter(x => x.reads > 0)
    .sort((a, b) => b.reads - a.reads)
    .slice(0, 3)
  const max = scored[0]?.reads ?? 1
  return scored.map(s => ({ ...s, pct: Math.round((s.reads / max) * 100) }))
})

function openCourse(courseId: number) {
  router.push({ name: 'lumen', query: { course: String(courseId) } })
}

function goToLumen() { router.push('/lumen') }
</script>

<template>
  <div
    v-if="topCourses.length > 0"
    class="dashboard-card sa-card wltr-card"
    role="button"
    tabindex="0"
    aria-label="Voir les cours les plus lus"
    @click="goToLumen"
    @keydown.enter="goToLumen"
    @keydown.space.prevent="goToLumen"
  >
    <div class="sa-card-header">
      <BarChart3 :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Top cours lus</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <ul class="wltr-list">
      <li
        v-for="(c, i) in topCourses"
        :key="c.id"
        class="wltr-item"
        tabindex="0"
        role="button"
        @click.stop="openCourse(c.id)"
        @keydown.enter.stop="openCourse(c.id)"
      >
        <div class="wltr-row">
          <span class="wltr-rank">{{ i + 1 }}</span>
          <span class="wltr-title">{{ c.title }}</span>
          <span class="wltr-reads">{{ c.reads }}</span>
        </div>
        <div class="wltr-bar">
          <div class="wltr-bar-fill" :style="{ width: `${c.pct}%` }" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wltr-card { cursor: pointer; }

.wltr-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wltr-item {
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 120ms ease;
}
.wltr-item:hover { background: var(--bg-hover); }
.wltr-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.wltr-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.wltr-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-subtle);
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  flex-shrink: 0;
}
.wltr-title {
  flex: 1;
  font-size: 11px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.wltr-reads {
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.wltr-bar {
  height: 4px;
  background: var(--bg-input);
  border-radius: 2px;
  overflow: hidden;
  margin-left: 24px;
}
.wltr-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover, var(--accent)));
  border-radius: 2px;
  transition: width 400ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .wltr-bar-fill { transition: none; }
}
</style>
