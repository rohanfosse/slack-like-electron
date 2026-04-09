/**
 * WidgetLumenNotes.vue — Dernieres notes prises sur des cours Lumen.
 * Affiche jusqu'a 3 notes avec titre du cours, debut du contenu, date
 * relative, cliquable pour ouvrir le cours.
 */
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NotebookPen, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'
import { relativeTime } from '@/utils/date'

const router = useRouter()
const lumenStore = useLumenStore()
const appStore = useAppStore()

interface NotePreview {
  courseId: number
  courseTitle: string
  content: string
  updatedAt: string
}

const recentNotes = ref<NotePreview[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const promoId = appStore.activePromoId ?? appStore.currentUser?.promo_id
    if (!promoId) { loading.value = false; return }
    // S'assure que la liste des cours + les IDs annotes sont disponibles
    if (lumenStore.courses.length === 0) {
      await lumenStore.fetchCoursesForPromo(promoId)
    }
    if (lumenStore.notedCourseIds.size === 0) {
      await lumenStore.fetchNotedCourseIds()
    }
    // Pour chaque cours annote, fetch la note complete (max 3 pour perf)
    const noted = [...lumenStore.notedCourseIds].slice(0, 3)
    const previews: NotePreview[] = []
    for (const courseId of noted) {
      const course = lumenStore.courses.find(c => c.id === courseId)
      if (!course) continue
      const note = await lumenStore.fetchCourseNote(courseId)
      if (note && note.content.trim()) {
        previews.push({
          courseId,
          courseTitle: course.title,
          content: note.content,
          updatedAt: note.updated_at,
        })
      }
    }
    // Trie par date de maj decroissante
    previews.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    recentNotes.value = previews
  } catch {
    recentNotes.value = []
  } finally {
    loading.value = false
  }
})

const totalNotes = computed(() => lumenStore.notedCourseIds.size)

function openCourse(courseId: number) {
  router.push({ name: 'lumen', query: { course: String(courseId) } })
}

function goToLumen() { router.push('/lumen') }

function snippet(content: string): string {
  const cleaned = content.trim().replace(/\s+/g, ' ')
  return cleaned.length > 60 ? cleaned.slice(0, 60) + '…' : cleaned
}
</script>

<template>
  <div
    class="dashboard-card sa-card sa-lumen-notes"
    :class="{ 'sa-lumen-notes--empty': recentNotes.length === 0 }"
    role="button"
    tabindex="0"
    aria-label="Voir mes notes Lumen"
    @click="goToLumen"
    @keydown.enter="goToLumen"
    @keydown.space.prevent="goToLumen"
  >
    <div class="sa-card-header">
      <NotebookPen :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Mes notes</span>
      <span v-if="totalNotes > 0" class="sa-lumen-notes-count">{{ totalNotes }}</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <p v-if="loading" class="sa-lumen-notes-empty">Chargement…</p>

    <ul v-else-if="recentNotes.length > 0" class="sa-lumen-notes-list">
      <li
        v-for="note in recentNotes"
        :key="note.courseId"
        class="sa-lumen-notes-item"
        tabindex="0"
        role="button"
        @click.stop="openCourse(note.courseId)"
        @keydown.enter.stop="openCourse(note.courseId)"
      >
        <span class="sa-lumen-notes-title">{{ note.courseTitle }}</span>
        <span class="sa-lumen-notes-snippet">{{ snippet(note.content) }}</span>
        <span class="sa-lumen-notes-date">{{ relativeTime(note.updatedAt) }}</span>
      </li>
    </ul>

    <p v-else class="sa-lumen-notes-empty">
      Aucune note pour le moment.<br>
      Prends des notes sur tes cours pour les retrouver ici.
    </p>
  </div>
</template>

<style scoped>
.sa-lumen-notes { cursor: pointer; }
.sa-lumen-notes--empty { cursor: default; }

.sa-lumen-notes-count {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-xl);
  background: rgba(230, 167, 0, 0.15);
  color: #e6a700;
  margin-left: auto;
  margin-right: 4px;
}

.sa-lumen-notes-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sa-lumen-notes-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 120ms ease;
  border-left: 2px solid rgba(230, 167, 0, 0.4);
  background: var(--bg-input);
}
.sa-lumen-notes-item:hover {
  background: var(--bg-hover);
  border-left-color: #e6a700;
}
.sa-lumen-notes-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sa-lumen-notes-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sa-lumen-notes-snippet {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}
.sa-lumen-notes-date {
  font-size: 10px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.sa-lumen-notes-empty {
  font-size: 11px;
  color: var(--text-muted);
  margin: 8px 4px 0;
  font-style: italic;
  line-height: 1.5;
}
</style>
