/**
 * WidgetLumenMyCourses.vue — Liste des cours Lumen publies par le prof
 * avec leurs metriques de lectures (nombre distinct d'etudiants).
 * Cliquable : ouvre le cours dans l'editeur.
 */
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Lightbulb, ChevronRight, Users, Package } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'
import { relativeTime } from '@/utils/date'

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

const myPublishedCourses = computed(() => {
  return lumenStore.courses
    .filter(c => c.status === 'published')
    .map(c => ({
      course: c,
      reads: lumenStore.readCounts.get(c.id) ?? 0,
      hasProject: c.repo_snapshot_at != null,
    }))
    .sort((a, b) => {
      // Tri par date de publication decroissante
      const ta = a.course.published_at ? new Date(a.course.published_at).getTime() : 0
      const tb = b.course.published_at ? new Date(b.course.published_at).getTime() : 0
      return tb - ta
    })
    .slice(0, 4)
})

function openCourse(courseId: number) {
  router.push({ name: 'lumen', query: { course: String(courseId) } })
}

function goToLumen() { router.push('/lumen') }
</script>

<template>
  <div
    class="dashboard-card sa-card wlmc-card"
    :class="{ 'wlmc-card--empty': myPublishedCourses.length === 0 }"
    role="button"
    tabindex="0"
    aria-label="Voir mes cours Lumen"
    @click="goToLumen"
    @keydown.enter="goToLumen"
    @keydown.space.prevent="goToLumen"
  >
    <div class="sa-card-header">
      <Lightbulb :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Mes cours publies</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <ul v-if="myPublishedCourses.length > 0" class="wlmc-list">
      <li
        v-for="item in myPublishedCourses"
        :key="item.course.id"
        class="wlmc-item"
        tabindex="0"
        role="button"
        @click.stop="openCourse(item.course.id)"
        @keydown.enter.stop="openCourse(item.course.id)"
      >
        <div class="wlmc-item-main">
          <span class="wlmc-title">{{ item.course.title }}</span>
          <div class="wlmc-meta">
            <span v-if="item.course.published_at" class="wlmc-date">
              {{ relativeTime(item.course.published_at) }}
            </span>
            <span v-if="item.hasProject" class="wlmc-project" title="Projet d'exemple attache">
              <Package :size="9" />
            </span>
          </div>
        </div>
        <span class="wlmc-reads" :title="`${item.reads} etudiant(s)`">
          <Users :size="10" />
          {{ item.reads }}
        </span>
      </li>
    </ul>

    <p v-else class="wlmc-empty">Aucun cours publie.</p>
  </div>
</template>

<style scoped>
.wlmc-card { cursor: pointer; }
.wlmc-card--empty { cursor: default; }

.wlmc-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wlmc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 120ms ease;
}
.wlmc-item:hover {
  background: var(--bg-hover);
  border-left-color: var(--accent);
}
.wlmc-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.wlmc-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wlmc-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wlmc-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--text-muted);
}
.wlmc-date { font-variant-numeric: tabular-nums; }
.wlmc-project {
  display: inline-flex;
  align-items: center;
  color: var(--accent);
  opacity: 0.8;
}

.wlmc-reads {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  background: var(--accent-subtle);
  color: var(--accent);
  border-radius: var(--radius-xl);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.wlmc-empty {
  font-size: 11px;
  color: var(--text-muted);
  margin: 10px 4px 0;
  font-style: italic;
}
</style>
