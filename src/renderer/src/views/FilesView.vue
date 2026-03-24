/** Vue "Fichiers partagés" — accessible uniquement par le professeur. */
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Paperclip, Image, FileText, FileArchive, FileCode, Download, ExternalLink, Search, X, Filter } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useApi }      from '@/composables/useApi'
import { relativeTime } from '@/utils/date'

const appStore = useAppStore()
const router   = useRouter()
const { api }  = useApi()

if (!appStore.isTeacher) router.replace('/dashboard')

interface DmFile {
  message_id:   number
  student_id:   number
  student_name: string
  file_name:    string
  file_url:     string
  is_image:     boolean
  sent_at:      string
}

const files       = ref<DmFile[]>([])
const loading     = ref(true)
const search      = ref('')
const filterType  = ref<'all' | 'images' | 'docs'>('all')
const filterStudent = ref<number | null>(null)
const lightboxUrl = ref<string | null>(null)

onMounted(async () => {
  const res = await api(() => window.api.getDmFiles())
  files.value = Array.isArray(res) ? (res as DmFile[]) : []
  loading.value = false
})

const students = computed(() => {
  const map = new Map<number, string>()
  for (const f of files.value) map.set(f.student_id, f.student_name)
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
})

const filtered = computed(() => {
  let list = files.value
  if (filterType.value === 'images') list = list.filter(f => f.is_image)
  if (filterType.value === 'docs')   list = list.filter(f => !f.is_image)
  if (filterStudent.value !== null)  list = list.filter(f => f.student_id === filterStudent.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(f => f.file_name.toLowerCase().includes(q) || f.student_name.toLowerCase().includes(q))
  }
  return list
})

function extOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function fileIcon(f: DmFile) {
  if (f.is_image) return Image
  const ext = extOf(f.file_name)
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'odt'].includes(ext)) return FileText
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))           return FileArchive
  if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'xml'].includes(ext)) return FileCode
  return Paperclip
}

function fileColor(f: DmFile) {
  if (f.is_image) return '#06b6d4'
  const ext = extOf(f.file_name)
  if (['pdf'].includes(ext))                return '#ef4444'
  if (['doc', 'docx', 'odt'].includes(ext)) return '#4a90d9'
  if (['zip', 'rar', '7z'].includes(ext))   return '#f59e0b'
  if (['js', 'ts', 'py', 'java', 'c', 'cpp'].includes(ext)) return '#22c55e'
  return '#8b8d91'
}

function avatarColor(name: string) {
  const colors = ['#4a90d9','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function open(f: DmFile) {
  if (f.is_image) { lightboxUrl.value = f.file_url; return }
  window.api.openPath(f.file_url)
}

function download(f: DmFile) {
  window.api.openPath(f.file_url)
}

function downloadLightbox() {
  if (lightboxUrl.value) window.api.openPath(lightboxUrl.value)
}
</script>

<template>
  <div class="fv-root">
    <!-- Header -->
    <div class="fv-header">
      <div class="fv-header-left">
        <Paperclip :size="18" class="fv-header-icon" />
        <h1 class="fv-title">Fichiers partagés</h1>
        <span v-if="!loading" class="fv-badge">{{ filtered.length }}</span>
      </div>

      <!-- Barre de filtres -->
      <div class="fv-filters">
        <!-- Recherche -->
        <div class="fv-search-wrap">
          <Search :size="13" class="fv-search-icon" />
          <input v-model="search" class="fv-search" placeholder="Rechercher un fichier ou un étudiant…" />
          <button v-if="search" class="fv-search-clear" @click="search = ''"><X :size="12" /></button>
        </div>

        <!-- Type -->
        <div class="fv-type-pills">
          <button :class="['fv-pill', { active: filterType === 'all' }]"    @click="filterType = 'all'">Tous</button>
          <button :class="['fv-pill', { active: filterType === 'images' }]" @click="filterType = 'images'">Images</button>
          <button :class="['fv-pill', { active: filterType === 'docs' }]"   @click="filterType = 'docs'">Documents</button>
        </div>

        <!-- Étudiant -->
        <select v-if="students.length" v-model="filterStudent" class="fv-select">
          <option :value="null">Tous les étudiants</option>
          <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="fv-empty">
      <div class="fv-spinner" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!filtered.length" class="fv-empty">
      <Paperclip :size="40" class="fv-empty-icon" />
      <p class="fv-empty-title">{{ files.length ? 'Aucun fichier ne correspond' : 'Aucun fichier partagé' }}</p>
      <p class="fv-empty-sub">{{ files.length ? 'Modifiez vos filtres' : 'Les fichiers envoyés par vos étudiants en conversation privée apparaîtront ici.' }}</p>
    </div>

    <!-- Grille de fichiers -->
    <div v-else class="fv-grid">
      <div
        v-for="f in filtered"
        :key="f.message_id + f.file_url"
        class="fv-card"
        @click="open(f)"
      >
        <!-- Preview image ou icône -->
        <div class="fv-card-thumb" :style="{ background: fileColor(f) + '18' }">
          <img v-if="f.is_image" :src="f.file_url" class="fv-card-img" @error="($el as HTMLImageElement).style.display = 'none'" />
          <component v-else :is="fileIcon(f)" :size="28" :style="{ color: fileColor(f) }" />
        </div>

        <!-- Infos -->
        <div class="fv-card-body">
          <span class="fv-card-name" :title="f.file_name">{{ f.file_name }}</span>
          <div class="fv-card-meta">
            <span class="fv-card-avatar" :style="{ background: avatarColor(f.student_name) }">{{ initials(f.student_name) }}</span>
            <span class="fv-card-student">{{ f.student_name }}</span>
            <span class="fv-card-dot">·</span>
            <span class="fv-card-date">{{ relativeTime(f.sent_at) }}</span>
          </div>
        </div>

        <!-- Actions au hover -->
        <div class="fv-card-actions" @click.stop>
          <button class="fv-card-btn" title="Télécharger" @click="download(f)"><Download :size="14" /></button>
          <button class="fv-card-btn" title="Ouvrir" @click="open(f)"><ExternalLink :size="14" /></button>
        </div>
      </div>
    </div>

    <!-- Lightbox image -->
    <div v-if="lightboxUrl" class="fv-lightbox" @click="lightboxUrl = null">
      <img :src="lightboxUrl" class="fv-lightbox-img" @click.stop />
      <button class="fv-lightbox-close" @click="lightboxUrl = null"><X :size="18" /></button>
      <button class="fv-lightbox-dl" @click.stop="downloadLightbox"><Download :size="16" /> Télécharger</button>
    </div>
  </div>
</template>

<style scoped>
.fv-root {
  display: flex; flex-direction: column;
  height: 100%; padding: 20px 24px; gap: 16px;
  background: var(--bg-base); overflow: hidden;
}

/* ── Header ── */
.fv-header {
  display: flex; flex-direction: column; gap: 12px;
}
.fv-header-left {
  display: flex; align-items: center; gap: 10px;
}
.fv-header-icon { color: var(--accent); opacity: .8; }
.fv-title {
  font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0;
}
.fv-badge {
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 10px; padding: 1px 7px;
}

/* ── Filtres ── */
.fv-filters {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.fv-search-wrap {
  position: relative; display: flex; align-items: center;
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 8px; padding: 0 8px; gap: 6px;
  min-width: 220px;
}
.fv-search-icon { color: var(--text-muted); flex-shrink: 0; }
.fv-search {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 12px; color: var(--text-primary);
  padding: 6px 0;
}
.fv-search-clear {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); padding: 2px; display: flex; align-items: center;
}
.fv-type-pills { display: flex; gap: 4px; }
.fv-pill {
  font-size: 11.5px; font-weight: 500; padding: 4px 10px;
  border-radius: 20px; border: 1px solid var(--border);
  background: var(--bg-elevated); color: var(--text-secondary);
  cursor: pointer; transition: all .15s;
}
.fv-pill.active {
  background: var(--accent); color: #fff; border-color: var(--accent);
}
.fv-select {
  font-size: 12px; padding: 5px 8px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-elevated); color: var(--text-primary);
  cursor: pointer; outline: none;
}

/* ── Grid ── */
.fv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  overflow-y: auto; padding-right: 4px;
  flex: 1;
}

/* ── Card ── */
.fv-card {
  display: flex; flex-direction: column;
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden; cursor: pointer;
  transition: box-shadow .15s, transform .15s;
  position: relative;
}
.fv-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  transform: translateY(-1px);
}
.fv-card-thumb {
  height: 120px; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.fv-card-img {
  width: 100%; height: 100%; object-fit: cover;
}
.fv-card-body {
  padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;
}
.fv-card-name {
  font-size: 12px; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fv-card-meta {
  display: flex; align-items: center; gap: 5px;
}
.fv-card-avatar {
  width: 16px; height: 16px; border-radius: 50%;
  font-size: 8px; font-weight: 700; color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.fv-card-student {
  font-size: 11px; color: var(--text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.fv-card-dot { font-size: 10px; color: var(--text-muted); }
.fv-card-date { font-size: 10px; color: var(--text-muted); white-space: nowrap; }

/* Actions au hover */
.fv-card-actions {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 4px;
  opacity: 0; transition: opacity .15s;
}
.fv-card:hover .fv-card-actions { opacity: 1; }
.fv-card-btn {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--bg-base); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer;
  transition: color .15s, background .15s;
}
.fv-card-btn:hover { color: var(--accent); background: var(--bg-elevated); }

/* ── Empty / loading ── */
.fv-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
}
.fv-empty-icon { color: var(--text-muted); opacity: .4; }
.fv-empty-title { font-size: 15px; font-weight: 600; color: var(--text-secondary); margin: 0; }
.fv-empty-sub   { font-size: 12.5px; color: var(--text-muted); text-align: center; max-width: 360px; margin: 0; }
.fv-spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid var(--border); border-top-color: var(--accent);
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Lightbox ── */
.fv-lightbox {
  position: fixed; inset: 0; background: rgba(0,0,0,.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.fv-lightbox-img {
  max-width: 90vw; max-height: 85vh; border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0,0,0,.4);
}
.fv-lightbox-close {
  position: absolute; top: 20px; right: 20px;
  background: rgba(255,255,255,.12); border: none; border-radius: 8px;
  color: #fff; cursor: pointer; padding: 6px 8px;
  display: flex; align-items: center;
}
.fv-lightbox-dl {
  position: absolute; bottom: 24px;
  background: var(--accent); border: none; border-radius: 8px;
  color: #fff; cursor: pointer; padding: 8px 16px;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}
</style>
