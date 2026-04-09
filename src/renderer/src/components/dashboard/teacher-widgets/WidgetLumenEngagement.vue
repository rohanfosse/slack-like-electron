/**
 * WidgetLumenEngagement.vue — Stats d'engagement teacher sur les cours
 * Lumen publies : total lectures, moyenne par cours, top 3 des cours
 * les plus lus. Cliquable pour ouvrir la vue Lumen teacher.
 */
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Lightbulb, ChevronRight, Users } from 'lucide-vue-next'
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

const stats = computed(() => {
  const published = lumenStore.courses.filter(c => c.status === 'published')
  if (published.length === 0) return null
  let total = 0
  for (const c of published) total += lumenStore.readCounts.get(c.id) ?? 0
  const avg = Math.round(total / published.length)
  // Top 3 cours les plus lus
  const top = [...published]
    .map(c => ({ course: c, reads: lumenStore.readCounts.get(c.id) ?? 0 }))
    .filter(x => x.reads > 0)
    .sort((a, b) => b.reads - a.reads)
    .slice(0, 3)
  return {
    publishedCount: published.length,
    totalReads: total,
    avgReads: avg,
    top,
  }
})

function openCourse(courseId: number) {
  router.push({ name: 'lumen', query: { course: String(courseId) } })
}

function goToLumen() { router.push('/lumen') }
</script>

<template>
  <div
    class="dashboard-card sa-card wle-card"
    :class="{ 'wle-card--empty': !stats || stats.publishedCount === 0 }"
    role="button"
    tabindex="0"
    aria-label="Voir l'engagement Lumen"
    @click="goToLumen"
    @keydown.enter="goToLumen"
    @keydown.space.prevent="goToLumen"
  >
    <div class="sa-card-header">
      <Lightbulb :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Engagement Lumen</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <template v-if="stats && stats.publishedCount > 0">
      <div class="wle-stats-row">
        <div class="wle-stat">
          <span class="wle-stat-value">{{ stats.totalReads }}</span>
          <span class="wle-stat-label">Lectures</span>
        </div>
        <div class="wle-stat">
          <span class="wle-stat-value">{{ stats.avgReads }}</span>
          <span class="wle-stat-label">Moyenne</span>
        </div>
        <div class="wle-stat">
          <span class="wle-stat-value">{{ stats.publishedCount }}</span>
          <span class="wle-stat-label">Publies</span>
        </div>
      </div>

      <div v-if="stats.top.length > 0" class="wle-top">
        <div class="wle-top-title">Top cours lus</div>
        <ul class="wle-top-list">
          <li
            v-for="(item, i) in stats.top"
            :key="item.course.id"
            class="wle-top-item"
            tabindex="0"
            role="button"
            @click.stop="openCourse(item.course.id)"
            @keydown.enter.stop="openCourse(item.course.id)"
          >
            <span class="wle-top-rank">{{ i + 1 }}</span>
            <span class="wle-top-name">{{ item.course.title }}</span>
            <span class="wle-top-count">
              <Users :size="10" /> {{ item.reads }}
            </span>
          </li>
        </ul>
      </div>
    </template>

    <p v-else class="wle-empty">Aucun cours publie pour cette promo.</p>
  </div>
</template>

<style scoped>
.wle-card { cursor: pointer; }
.wle-card--empty { cursor: default; }

.wle-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}
.wle-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
}
.wle-stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.wle-stat-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.wle-top { margin-top: 10px; }
.wle-top-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.wle-top-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.wle-top-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 120ms ease;
  font-size: 12px;
}
.wle-top-item:hover { background: var(--bg-hover); }
.wle-top-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.wle-top-rank {
  font-size: 10px;
  font-weight: 800;
  color: var(--accent);
  width: 14px;
  text-align: center;
}
.wle-top-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wle-top-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.wle-empty {
  font-size: 11px;
  color: var(--text-muted);
  margin: 10px 4px 0;
  font-style: italic;
}
</style>
