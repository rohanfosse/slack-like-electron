<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NotebookPen, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { relativeTime } from '@/utils/date'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

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
  <UiWidgetCard :icon="NotebookPen" label="Mes notes">
    <template #header-extra>
      <button type="button" class="wln-more" @click="openLumen">
        Ouvrir <ChevronRight :size="12" />
      </button>
    </template>

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
  </UiWidgetCard>
</template>

<style scoped>
.wln-more {
  background: none;
  border: none;
  color: var(--accent);
  font-size: var(--text-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px var(--space-xs);
  border-radius: var(--radius-xs);
  font-family: inherit;
}
.wln-more:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.wln-empty {
  font-size: var(--text-sm);
  color: var(--text-muted);
  padding: var(--space-md) 0;
  text-align: center;
}

.wln-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  overflow-y: auto;
}

.wln-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
  text-align: left;
  padding: var(--space-sm) var(--space-sm);
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  transition: background var(--motion-fast) var(--ease-out);
}
.wln-item:hover { background: var(--bg-hover); }
.wln-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.wln-item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-sm);
}

.wln-item-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wln-item-time {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

.wln-item-preview {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
