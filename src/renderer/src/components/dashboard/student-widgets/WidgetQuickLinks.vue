/**
 * WidgetQuickLinks.vue - Liens rapides personnalisables.
 */
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Bookmark, Plus, X, Pencil } from 'lucide-vue-next'

interface QuickLink { name: string; url: string }

const STORAGE_KEY = 'cc_student_quicklinks'
const DEFAULT_LINKS: QuickLink[] = [
  { name: 'Moodle', url: 'https://moodle.cesi.fr' },
  { name: 'Teams', url: 'https://teams.microsoft.com' },
]

const links = ref<QuickLink[]>([])
const editing = ref(false)
const newName = ref('')
const newUrl = ref('')

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    links.value = raw ? JSON.parse(raw) : [...DEFAULT_LINKS]
  } catch {
    links.value = [...DEFAULT_LINKS]
  }
})

watch(links, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

function openLink(url: string) {
  if (!url.startsWith('https://') && !url.startsWith('http://')) return
  if (window.api?.openExternal) {
    window.api.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

function addLink() {
  const name = newName.value.trim()
  const url = newUrl.value.trim()
  if (!name || !url || links.value.length >= 6) return
  links.value.push({ name, url })
  newName.value = ''
  newUrl.value = ''
}

function removeLink(idx: number) {
  links.value.splice(idx, 1)
}
</script>

<template>
  <div class="dashboard-card sa-card sa-quicklinks">
    <div class="sa-card-header">
      <Bookmark :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Liens rapides</span>
      <button class="sa-ql-edit-btn" :title="editing ? 'Terminer' : 'Modifier'" @click="editing = !editing">
        <Pencil :size="12" />
      </button>
    </div>

    <div class="sa-ql-pills">
      <span
        v-for="(link, i) in links"
        :key="i"
        class="sa-ql-pill"
        role="button"
        tabindex="0"
        @click="!editing && openLink(link.url)"
        @keydown.enter="!editing && openLink(link.url)"
      >
        {{ link.name }}
        <button v-if="editing" class="sa-ql-remove" title="Supprimer" @click.stop="removeLink(i)">
          <X :size="10" />
        </button>
      </span>
    </div>

    <div v-if="editing && links.length < 6" class="sa-ql-add">
      <input v-model="newName" class="sa-ql-input" placeholder="Nom" maxlength="20" @keydown.enter="addLink" />
      <input v-model="newUrl" class="sa-ql-input sa-ql-input--url" placeholder="URL" @keydown.enter="addLink" />
      <button class="sa-ql-add-btn" title="Ajouter" @click="addLink">
        <Plus :size="12" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.sa-ql-edit-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.sa-ql-edit-btn:hover { color: var(--accent); }

.sa-ql-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sa-ql-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(74, 144, 217, .1);
  color: var(--accent);
  cursor: pointer;
  transition: background .15s;
  user-select: none;
}
.sa-ql-pill:hover { background: rgba(74, 144, 217, .18); }

.sa-ql-remove {
  background: none;
  border: none;
  color: var(--color-danger, #e74c3c);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.sa-ql-add {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.sa-ql-input {
  flex: 1;
  font-size: 11px;
  padding: 3px 6px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary);
  font-family: inherit;
  min-width: 0;
}
.sa-ql-input--url { flex: 2; }

.sa-ql-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  font-family: inherit;
}
</style>
