<script setup lang="ts">
/**
 * WidgetLumenNotes.vue — Dernieres notes prises par l'etudiant sur des chapitres Lumen.
 * Affiche les 3 dernieres notes (titre chapitre extrait du manifest).
 */
import { ref, onMounted, computed } from 'vue'
import { NotebookPen, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { relativeTime } from '@/utils/date'

interface NoteRow {
  owner: string
  repo: string
  path: string
  content: string
  updated_at: string
  manifest_json: string | null
}

const router = useRouter()
const notes = ref<NoteRow[]>([])
const loading = ref(false)

function titleFromManifest(manifestJson: string | null, path: string): string {
  if (!manifestJson) return path
  try {
    const m = JSON.parse(manifestJson) as { chapters?: Array<{ path: string; title: string }> }
    const ch = m.chapters?.find((c) => c.path === path)
    return ch?.title ?? path
  } catch { return path }
}

onMounted(async () => {
  loading.value = true
  try {
    const resp = await window.api.getLumenMyNotes() as { ok: boolean; data?: { notes: NoteRow[] } }
    if (resp.ok && resp.data) {
      notes.value = resp.data.notes
        .slice()
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 3)
    }
  } finally {
    loading.value = false
  }
})

const recent = computed(() => notes.value)

function openLumen() {
  router.push('/lumen')
}
</script>

<template>
  <div class="wln-card">
    <header class="wln-head">
      <div class="wln-title">
        <NotebookPen :size="14" />
        <span>Mes notes</span>
      </div>
      <button type="button" class="wln-more" @click="openLumen">
        Ouvrir <ChevronRight :size="12" />
      </button>
    </header>

    <div v-if="loading" class="wln-empty">Chargement...</div>
    <div v-else-if="recent.length === 0" class="wln-empty">
      Aucune note encore prise.
    </div>
    <ul v-else class="wln-list">
      <li v-for="n in recent" :key="`${n.owner}/${n.repo}/${n.path}`">
        <button type="button" class="wln-item" @click="openLumen">
          <div class="wln-item-head">
            <span class="wln-item-title">{{ titleFromManifest(n.manifest_json, n.path) }}</span>
            <span class="wln-item-time">{{ relativeTime(n.updated_at) }}</span>
          </div>
          <p class="wln-item-preview">{{ n.content.slice(0, 120) }}</p>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wln-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wln-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wln-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wln-more {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
}
.wln-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 12px 0;
  text-align: center;
}
.wln-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}
.wln-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--t-fast) ease;
}
.wln-item:hover { background: var(--bg-hover); }
.wln-item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.wln-item-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wln-item-time {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.wln-item-preview {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
