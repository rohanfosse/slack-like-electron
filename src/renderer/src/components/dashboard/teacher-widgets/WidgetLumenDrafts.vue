/**
 * WidgetLumenDrafts.vue — Rappel des cours Lumen en brouillon avec
 * du contenu (pour eviter que des cours tombent dans l'oubli).
 * Cliquable : ouvre l'editeur sur le draft.
 */
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { FileText, ChevronRight, AlertCircle } from 'lucide-vue-next'
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
})

/**
 * Drafts triees par updated_at decroissant. On n'exclut pas les drafts
 * vides (titre "Sans titre") : le prof a pu en creer un et l'oublier,
 * c'est precisement ce qu'on veut rappeler.
 */
const drafts = computed(() => {
  return lumenStore.courses
    .filter(c => c.status === 'draft')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4)
})

// Detecte les drafts "stagnants" (pas modifies depuis > 7 jours)
const staleThresholdMs = 7 * 24 * 3600 * 1000
function isStale(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > staleThresholdMs
}

function openDraft(courseId: number) {
  router.push({ name: 'lumen', query: { course: String(courseId) } })
}

function goToLumen() { router.push('/lumen') }
</script>

<template>
  <div
    v-if="drafts.length > 0"
    class="dashboard-card sa-card wld-card"
    role="button"
    tabindex="0"
    aria-label="Voir mes brouillons Lumen"
    @click="goToLumen"
    @keydown.enter="goToLumen"
    @keydown.space.prevent="goToLumen"
  >
    <div class="sa-card-header">
      <FileText :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Brouillons Lumen</span>
      <span class="wld-count">{{ drafts.length }}</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <ul class="wld-list">
      <li
        v-for="draft in drafts"
        :key="draft.id"
        class="wld-item"
        :class="{ 'wld-item--stale': isStale(draft.updated_at) }"
        tabindex="0"
        role="button"
        @click.stop="openDraft(draft.id)"
        @keydown.enter.stop="openDraft(draft.id)"
      >
        <AlertCircle v-if="isStale(draft.updated_at)" :size="10" class="wld-stale-icon" />
        <span class="wld-title">{{ draft.title || 'Sans titre' }}</span>
        <span class="wld-date">{{ relativeTime(draft.updated_at) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wld-card { cursor: pointer; }

.wld-count {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-xl);
  background: var(--bg-hover);
  color: var(--text-secondary);
  margin-left: auto;
  margin-right: 4px;
}

.wld-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wld-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-input);
  border-left: 2px solid var(--text-muted);
  border-radius: 3px;
  cursor: pointer;
  transition: all 120ms ease;
}
.wld-item:hover {
  background: var(--bg-hover);
  border-left-color: var(--accent);
}
.wld-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.wld-item--stale {
  border-left-color: #e6a700;
}

.wld-stale-icon { color: #e6a700; flex-shrink: 0; }

.wld-title {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wld-date {
  font-size: 10px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
</style>
