<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Lightbulb, Plus, Eye, Edit3, Trash2, ArrowLeft, CheckCircle2, Clock,
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Code, Link2, Quote, Image, Save,
  Columns, BookOpen,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useLumenStore } from '@/stores/lumen'
import { useToast } from '@/composables/useToast'
import { renderMarkdown } from '@/utils/markdown'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import type { LumenCourse } from '@/types'

const appStore = useAppStore()
const lumenStore = useLumenStore()
const { showToast } = useToast()

type Mode = 'list' | 'editor' | 'reader'
const mode = ref<Mode>('list')

// ── Editor state ────────────────────────────────────────────────────────────
const editorTitle    = ref('')
const editorSummary  = ref('')
const editorContent  = ref('')
const editorCourseId = ref<number | null>(null)
const splitView      = ref(true)   // true = split, false = focus
const previewOnly    = ref(false)  // mobile-friendly toggle
const saving         = ref(false)
const savedAt        = ref<string | null>(null)
const dirty          = ref(false)
const textareaRef    = ref<HTMLTextAreaElement | null>(null)
const previewRef     = ref<HTMLDivElement | null>(null)
const editorPaneRef  = ref<HTMLDivElement | null>(null)

const isTeacher = computed(() => appStore.isTeacher)
const promoId   = computed(() => appStore.activePromoId)

// ── Markdown rendering reactif ──────────────────────────────────────────────
const previewHtml = computed(() => renderMarkdown(editorContent.value))
const readerHtml  = computed(() => renderMarkdown(lumenStore.currentCourse?.content ?? ''))

// ── Stats : mots + temps de lecture ─────────────────────────────────────────
const wordCount = computed(() => {
  const text = editorContent.value.trim()
  if (!text) return 0
  return text.split(/\s+/).length
})
const readingMinutes = computed(() => Math.max(1, Math.ceil(wordCount.value / 200)))
const charCount = computed(() => editorContent.value.length)

// ── Data loading ────────────────────────────────────────────────────────────
async function loadCourses() {
  if (!promoId.value) return
  await lumenStore.fetchCoursesForPromo(promoId.value)
}

watch(promoId, () => { loadCourses() })
onMounted(() => { loadCourses() })

// ── Navigation ──────────────────────────────────────────────────────────────
function goToList() {
  if (dirty.value && !confirm('Modifications non sauvegardées. Quitter sans sauvegarder ?')) return
  mode.value = 'list'
  lumenStore.clearCurrentCourse()
  resetEditor()
}

async function openReader(course: LumenCourse) {
  mode.value = 'reader'
  await lumenStore.fetchCourse(course.id)
}

function openEditorNew() {
  resetEditor()
  mode.value = 'editor'
  nextTick(() => textareaRef.value?.focus())
}

async function openEditorEdit(course: LumenCourse) {
  if (dirty.value && editorCourseId.value !== course.id && !confirm('Modifications non sauvegardées. Changer de cours ?')) return
  const full = await lumenStore.fetchCourse(course.id)
  if (!full) return
  editorCourseId.value = full.id
  editorTitle.value    = full.title
  editorSummary.value  = full.summary
  editorContent.value  = full.content
  dirty.value          = false
  savedAt.value        = full.updated_at
  mode.value = 'editor'
  nextTick(() => textareaRef.value?.focus())
}

function resetEditor() {
  editorCourseId.value = null
  editorTitle.value    = ''
  editorSummary.value  = ''
  editorContent.value  = ''
  dirty.value          = false
  savedAt.value        = null
}

// ── Dirty tracking ──────────────────────────────────────────────────────────
watch([editorTitle, editorSummary, editorContent], () => {
  if (mode.value === 'editor') dirty.value = true
})

// ── Auto-save (5s apres derniere edition) ───────────────────────────────────
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
watch([editorTitle, editorSummary, editorContent], () => {
  if (mode.value !== 'editor' || !editorCourseId.value) return
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => { saveCourse(true) }, 5000)
})

// ── Save / publish ──────────────────────────────────────────────────────────
async function saveCourse(silent = false): Promise<boolean> {
  if (!editorTitle.value.trim()) {
    if (!silent) showToast('Le titre est requis', 'error')
    return false
  }
  if (!promoId.value) {
    if (!silent) showToast('Aucune promotion active', 'error')
    return false
  }
  saving.value = true
  try {
    if (editorCourseId.value) {
      const updated = await lumenStore.updateCourse(editorCourseId.value, {
        title: editorTitle.value, summary: editorSummary.value, content: editorContent.value,
      })
      if (updated) {
        savedAt.value = updated.updated_at
        dirty.value = false
        if (!silent) showToast('Cours enregistré', 'success')
        return true
      }
    } else {
      const created = await lumenStore.createCourse({
        promoId: promoId.value,
        title: editorTitle.value,
        summary: editorSummary.value,
        content: editorContent.value,
      })
      if (created) {
        editorCourseId.value = created.id
        savedAt.value = created.updated_at
        dirty.value = false
        if (!silent) showToast('Cours créé', 'success')
        return true
      }
    }
    return false
  } finally {
    saving.value = false
  }
}

async function saveAndPublish() {
  const ok = await saveCourse(false)
  if (!ok || !editorCourseId.value) return
  const published = await lumenStore.publishCourse(editorCourseId.value)
  if (published) showToast('Cours publié', 'success')
}

async function unpublishFromEditor() {
  if (!editorCourseId.value) return
  const ok = await lumenStore.unpublishCourse(editorCourseId.value)
  if (ok) showToast('Cours repassé en brouillon', 'info')
}

async function deleteFromEditor() {
  if (!editorCourseId.value) return
  if (!confirm('Supprimer définitivement ce cours ?')) return
  const ok = await lumenStore.deleteCourse(editorCourseId.value)
  if (ok) {
    showToast('Cours supprimé', 'success')
    resetEditor()
    mode.value = 'list'
  }
}

// ── Markdown insertion helpers (toolbar) ────────────────────────────────────
function wrapSelection(prefix: string, suffix: string = prefix, placeholder = '') {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = editorContent.value.slice(0, start)
  const selected = editorContent.value.slice(start, end) || placeholder
  const after = editorContent.value.slice(end)
  editorContent.value = before + prefix + selected + suffix + after
  nextTick(() => {
    ta.focus()
    const newStart = start + prefix.length
    const newEnd = newStart + selected.length
    ta.setSelectionRange(newStart, newEnd)
  })
}

function insertLinePrefix(prefix: string) {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const before = editorContent.value.slice(0, start)
  const lineStart = before.lastIndexOf('\n') + 1
  editorContent.value =
    editorContent.value.slice(0, lineStart) + prefix + editorContent.value.slice(lineStart)
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(start + prefix.length, start + prefix.length)
  })
}

function insertBold()       { wrapSelection('**', '**', 'texte en gras') }
function insertItalic()     { wrapSelection('*',  '*',  'texte en italique') }
function insertCode()       { wrapSelection('`',  '`',  'code') }
function insertCodeBlock()  { wrapSelection('\n```\n', '\n```\n', 'code') }
function insertH1()         { insertLinePrefix('# ') }
function insertH2()         { insertLinePrefix('## ') }
function insertUl()         { insertLinePrefix('- ') }
function insertOl()         { insertLinePrefix('1. ') }
function insertQuote()      { insertLinePrefix('> ') }
function insertLink() {
  const ta = textareaRef.value
  if (!ta) return
  const sel = editorContent.value.slice(ta.selectionStart, ta.selectionEnd) || 'texte du lien'
  wrapSelection(`[${sel}](`, ')', 'https://')
}
function insertImage() {
  wrapSelection('![', '](https://)', 'description')
}

// ── Keyboard shortcuts ──────────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (mode.value !== 'editor') return
  const isMod = e.ctrlKey || e.metaKey
  if (isMod && e.key === 's') { e.preventDefault(); saveCourse(false); return }
  if (isMod && e.key === 'b') { e.preventDefault(); insertBold(); return }
  if (isMod && e.key === 'i') { e.preventDefault(); insertItalic(); return }
  if (isMod && e.key === 'k') { e.preventDefault(); insertLink(); return }
}
onMounted(() => { window.addEventListener('keydown', handleKeydown) })
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})

// ── Editor helpers ──────────────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'))
    return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

const editorIsPublished = computed(() => {
  if (!editorCourseId.value) return false
  return lumenStore.courses.find(c => c.id === editorCourseId.value)?.status === 'published'
})

const sortedCoursesForSidebar = computed(() => {
  return [...lumenStore.courses].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'draft' ? -1 : 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
})

// ── Sync scroll editor <-> preview (simple proportional) ────────────────────
function onEditorScroll() {
  if (!splitView.value || !textareaRef.value || !previewRef.value) return
  const ta = textareaRef.value
  const pv = previewRef.value
  const ratio = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight)
  pv.scrollTop = ratio * Math.max(0, pv.scrollHeight - pv.clientHeight)
}
</script>

<template>
  <ErrorBoundary label="Lumen">
    <div class="lumen-app" :class="{ 'lumen-app--editor': mode === 'editor' }">
      <!-- ────────────────────── HEADER ────────────────────── -->
      <header class="lumen-topbar">
        <div class="lumen-brand">
          <div class="lumen-brand-icon">
            <Lightbulb :size="20" />
          </div>
          <div class="lumen-brand-text">
            <span class="lumen-brand-name">Lumen</span>
            <span class="lumen-brand-tag">{{ isTeacher ? 'Editeur de cours' : 'Cours de ta promo' }}</span>
          </div>
        </div>

        <!-- Status pill (mode editor uniquement) -->
        <div v-if="mode === 'editor'" class="lumen-status-pill">
          <span v-if="saving" class="lumen-status lumen-status--saving">
            <span class="lumen-spinner" />
            Enregistrement…
          </span>
          <span v-else-if="dirty" class="lumen-status lumen-status--dirty">
            <span class="lumen-status-dot" />
            Modifié
          </span>
          <span v-else-if="savedAt" class="lumen-status lumen-status--saved">
            <CheckCircle2 :size="13" />
            Enregistré · {{ formatDate(savedAt) }}
          </span>
          <span v-if="editorIsPublished" class="lumen-status lumen-status--published">
            <CheckCircle2 :size="13" />
            Publié
          </span>
        </div>

        <div class="lumen-topbar-actions">
          <!-- Mode list : new button -->
          <button v-if="mode === 'list' && isTeacher" class="lumen-btn lumen-btn--primary" @click="openEditorNew">
            <Plus :size="15" />
            Nouveau cours
          </button>

          <!-- Mode editor : split toggle + save + publish -->
          <template v-if="mode === 'editor'">
            <button
              class="lumen-icon-btn"
              :class="{ 'lumen-icon-btn--active': splitView }"
              :title="splitView ? 'Vue concentree (editeur seul)' : 'Vue cote a cote'"
              @click="splitView = !splitView"
            >
              <Columns :size="16" />
            </button>
            <button class="lumen-btn lumen-btn--ghost" :disabled="saving" @click="saveCourse(false)">
              <Save :size="14" />
              Enregistrer
            </button>
            <button v-if="editorIsPublished" class="lumen-btn lumen-btn--ghost" @click="unpublishFromEditor">
              Dépublier
            </button>
            <button class="lumen-btn lumen-btn--primary" :disabled="saving" @click="saveAndPublish">
              {{ editorIsPublished ? 'Mettre à jour' : 'Publier' }}
            </button>
            <button class="lumen-icon-btn lumen-icon-btn--danger" title="Supprimer" @click="deleteFromEditor" v-if="editorCourseId">
              <Trash2 :size="15" />
            </button>
          </template>

          <!-- Mode reader : back -->
          <button v-if="mode === 'reader'" class="lumen-btn lumen-btn--ghost" @click="goToList">
            <ArrowLeft :size="14" />
            Retour
          </button>
          <button v-if="mode === 'editor'" class="lumen-btn lumen-btn--ghost" @click="goToList">
            <ArrowLeft :size="14" />
            Liste
          </button>
        </div>
      </header>

      <!-- ────────────────────── BODY ────────────────────── -->

      <!-- LIST MODE ─────────────────────────────────────── -->
      <main v-if="mode === 'list'" class="lumen-list-main">
        <div v-if="lumenStore.loading && lumenStore.courses.length === 0" class="lumen-empty">
          Chargement…
        </div>

        <div v-else-if="lumenStore.courses.length === 0" class="lumen-empty">
          <Lightbulb :size="48" class="lumen-empty-icon" />
          <h2 v-if="isTeacher">Aucun cours pour cette promotion</h2>
          <h2 v-else>Aucun cours publié pour le moment</h2>
          <p v-if="isTeacher">Lance ton premier cours en markdown.</p>
          <p v-else>Tes enseignants n'ont pas encore publié de cours ici.</p>
          <button v-if="isTeacher" class="lumen-btn lumen-btn--primary" @click="openEditorNew">
            <Plus :size="15" />
            Créer mon premier cours
          </button>
        </div>

        <div v-else class="lumen-list-grid">
          <article
            v-for="course in lumenStore.courses"
            :key="course.id"
            class="lumen-card"
            :class="{ 'lumen-card--draft': course.status === 'draft' }"
            tabindex="0"
            @click="isTeacher ? openEditorEdit(course) : openReader(course)"
            @keydown.enter="isTeacher ? openEditorEdit(course) : openReader(course)"
          >
            <header class="lumen-card-head">
              <span class="lumen-pill" :class="course.status === 'published' ? 'lumen-pill--ok' : 'lumen-pill--draft'">
                <CheckCircle2 v-if="course.status === 'published'" :size="11" />
                <Clock v-else :size="11" />
                {{ course.status === 'published' ? 'Publié' : 'Brouillon' }}
              </span>
              <span class="lumen-card-date">{{ formatDate(course.published_at ?? course.updated_at) }}</span>
            </header>
            <h3 class="lumen-card-title">{{ course.title }}</h3>
            <p v-if="course.summary" class="lumen-card-summary">{{ course.summary }}</p>
            <footer class="lumen-card-actions">
              <button class="lumen-card-link" @click.stop="openReader(course)">
                <Eye :size="13" /> Lire
              </button>
              <button v-if="isTeacher" class="lumen-card-link" @click.stop="openEditorEdit(course)">
                <Edit3 :size="13" /> Éditer
              </button>
            </footer>
          </article>
        </div>
      </main>

      <!-- READER MODE ───────────────────────────────────── -->
      <main v-else-if="mode === 'reader'" class="lumen-reader-main">
        <article v-if="lumenStore.currentCourse" class="lumen-reader">
          <header class="lumen-reader-head">
            <h1 class="lumen-reader-title">{{ lumenStore.currentCourse.title }}</h1>
            <p v-if="lumenStore.currentCourse.summary" class="lumen-reader-summary">
              {{ lumenStore.currentCourse.summary }}
            </p>
            <div class="lumen-reader-meta">
              <span v-if="lumenStore.currentCourse.published_at">
                Publié le {{ formatDate(lumenStore.currentCourse.published_at) }}
              </span>
              <span v-else>Brouillon</span>
            </div>
          </header>
          <div class="lumen-prose" v-html="readerHtml" />
        </article>
      </main>

      <!-- EDITOR MODE (Overleaf-style) ──────────────────── -->
      <main v-else-if="mode === 'editor' && isTeacher" class="lumen-editor-main">
        <!-- Sidebar : course list -->
        <aside class="lumen-sidebar">
          <header class="lumen-sidebar-head">
            <BookOpen :size="14" />
            <span>Mes cours</span>
            <button class="lumen-sidebar-add" title="Nouveau cours" @click="resetEditor">
              <Plus :size="13" />
            </button>
          </header>
          <ul class="lumen-sidebar-list">
            <li
              v-for="course in sortedCoursesForSidebar"
              :key="course.id"
              class="lumen-sidebar-item"
              :class="{ 'lumen-sidebar-item--active': course.id === editorCourseId }"
              @click="openEditorEdit(course)"
            >
              <span class="lumen-sidebar-dot" :class="course.status === 'published' ? 'lumen-sidebar-dot--ok' : 'lumen-sidebar-dot--draft'" />
              <span class="lumen-sidebar-title">{{ course.title || 'Sans titre' }}</span>
            </li>
            <li v-if="sortedCoursesForSidebar.length === 0" class="lumen-sidebar-empty">
              Aucun cours
            </li>
          </ul>
        </aside>

        <!-- Editor + Preview pane -->
        <section class="lumen-editor-zone">
          <!-- Title + summary inputs -->
          <div class="lumen-meta-row">
            <input
              v-model="editorTitle"
              class="lumen-meta-title"
              placeholder="Titre du cours"
              maxlength="200"
            />
            <input
              v-model="editorSummary"
              class="lumen-meta-summary"
              placeholder="Résumé court (optionnel)"
              maxlength="500"
            />
          </div>

          <!-- Markdown toolbar -->
          <div class="lumen-md-toolbar">
            <button class="lumen-md-btn" title="Titre 1" @click="insertH1"><Heading1 :size="14" /></button>
            <button class="lumen-md-btn" title="Titre 2" @click="insertH2"><Heading2 :size="14" /></button>
            <span class="lumen-md-sep" />
            <button class="lumen-md-btn" title="Gras (Ctrl+B)" @click="insertBold"><Bold :size="14" /></button>
            <button class="lumen-md-btn" title="Italique (Ctrl+I)" @click="insertItalic"><Italic :size="14" /></button>
            <span class="lumen-md-sep" />
            <button class="lumen-md-btn" title="Liste à puces" @click="insertUl"><List :size="14" /></button>
            <button class="lumen-md-btn" title="Liste numérotée" @click="insertOl"><ListOrdered :size="14" /></button>
            <button class="lumen-md-btn" title="Citation" @click="insertQuote"><Quote :size="14" /></button>
            <span class="lumen-md-sep" />
            <button class="lumen-md-btn" title="Code en ligne" @click="insertCode"><Code :size="14" /></button>
            <button class="lumen-md-btn" title="Bloc de code" @click="insertCodeBlock">
              <code class="lumen-md-codeblock">{ }</code>
            </button>
            <span class="lumen-md-sep" />
            <button class="lumen-md-btn" title="Lien (Ctrl+K)" @click="insertLink"><Link2 :size="14" /></button>
            <button class="lumen-md-btn" title="Image" @click="insertImage"><Image :size="14" /></button>
            <span class="lumen-md-toolbar-spacer" />
            <span class="lumen-md-stats">
              {{ wordCount }} mots · {{ readingMinutes }} min · {{ charCount }} car.
            </span>
          </div>

          <!-- Split editor / preview -->
          <div
            ref="editorPaneRef"
            class="lumen-split"
            :class="{ 'lumen-split--solo': !splitView }"
          >
            <textarea
              ref="textareaRef"
              v-model="editorContent"
              class="lumen-textarea"
              spellcheck="true"
              placeholder="# Titre du cours&#10;&#10;Écris ton cours en Markdown ici…&#10;&#10;## Section&#10;Texte avec **gras** et *italique*.&#10;&#10;- Item 1&#10;- Item 2&#10;&#10;```js&#10;console.log('hello')&#10;```"
              @scroll="onEditorScroll"
            />
            <div
              v-if="splitView"
              ref="previewRef"
              class="lumen-preview"
            >
              <div class="lumen-prose" v-html="previewHtml" />
              <div v-if="!editorContent" class="lumen-preview-empty">
                <Eye :size="32" />
                <p>L'aperçu apparaîtra ici à mesure que tu écris.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </ErrorBoundary>
</template>

<style scoped>
/* ── Layout principal ─────────────────────────────────────────────────── */
.lumen-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg, #f5f3ff);
  color: var(--text, #1e293b);
  font-family: var(--font, 'Plus Jakarta Sans', sans-serif);
}

.lumen-app--editor {
  background: var(--bg-card, #fff);
}

/* ── Topbar ───────────────────────────────────────────────────────────── */
.lumen-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .08));
  background: var(--bg-card, #fff);
  flex-shrink: 0;
  min-height: 60px;
}

.lumen-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lumen-brand-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(252, 211, 77, 0.18), rgba(217, 119, 6, 0.12));
  display: flex; align-items: center; justify-content: center;
  color: #d97706;
}

.lumen-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.lumen-brand-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.lumen-brand-tag {
  font-size: 11px;
  color: var(--text-3, #94a3b8);
  font-weight: 500;
  margin-top: 2px;
}

.lumen-status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.lumen-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.lumen-status--saving {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.lumen-status--dirty {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.lumen-status--saved {
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-3, #94a3b8);
}

.lumen-status--published {
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
}

.lumen-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.lumen-spinner {
  width: 11px; height: 11px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: lumen-spin 0.7s linear infinite;
}

@keyframes lumen-spin {
  to { transform: rotate(360deg); }
}

.lumen-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ── Buttons ──────────────────────────────────────────────────────────── */
.lumen-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  background: transparent;
  color: var(--text, #1e293b);
  white-space: nowrap;
}

.lumen-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.lumen-btn--primary {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 1px 3px rgba(217, 119, 6, 0.3);
}
.lumen-btn--primary:hover:not(:disabled) {
  box-shadow: 0 3px 10px rgba(217, 119, 6, 0.35);
  transform: translateY(-1px);
}

.lumen-btn--ghost {
  background: var(--bg-card, #fff);
  border-color: var(--border, rgba(0, 0, 0, .1));
  color: var(--text-2, #64748b);
}
.lumen-btn--ghost:hover:not(:disabled) {
  background: var(--bg-glass, rgba(0, 0, 0, .03));
  color: var(--text, #1e293b);
}

.lumen-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border, rgba(0, 0, 0, .1));
  background: var(--bg-card, #fff);
  color: var(--text-2, #64748b);
  cursor: pointer;
  transition: all 200ms ease;
}
.lumen-icon-btn:hover { color: var(--text, #1e293b); background: var(--bg-glass, rgba(0, 0, 0, .03)); }
.lumen-icon-btn--active { background: rgba(245, 158, 11, 0.1); color: #d97706; border-color: rgba(245, 158, 11, 0.25); }
.lumen-icon-btn--danger:hover { color: #dc2626; background: rgba(220, 38, 38, 0.06); border-color: rgba(220, 38, 38, 0.2); }

/* ── List view ────────────────────────────────────────────────────────── */
.lumen-list-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 32px 64px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.lumen-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 100px 20px;
  gap: 12px;
  color: var(--text-2, #64748b);
}

.lumen-empty-icon {
  color: #d97706;
  opacity: 0.4;
  margin-bottom: 8px;
}

.lumen-empty h2 { margin: 0; font-size: 19px; font-weight: 700; color: var(--text, #1e293b); }
.lumen-empty p { margin: 0 0 16px; font-size: 14px; }

.lumen-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.lumen-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, .08));
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: all 200ms ease;
  text-align: left;
}

.lumen-card:hover {
  transform: translateY(-2px);
  border-color: rgba(217, 119, 6, 0.3);
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.08);
}

.lumen-card:focus-visible {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}

.lumen-card--draft {
  background:
    repeating-linear-gradient(135deg, var(--bg-card, #fff), var(--bg-card, #fff) 14px, rgba(245, 158, 11, 0.025) 14px, rgba(245, 158, 11, 0.025) 16px);
}

.lumen-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lumen-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}
.lumen-pill--ok { background: rgba(5, 150, 105, 0.1); color: #059669; }
.lumen-pill--draft { background: rgba(100, 116, 139, 0.1); color: #64748b; }

.lumen-card-date { font-size: 11px; color: var(--text-3, #94a3b8); }

.lumen-card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.lumen-card-summary {
  margin: 0;
  font-size: 13px;
  color: var(--text-2, #64748b);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lumen-card-actions {
  display: flex;
  gap: 14px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border, rgba(0, 0, 0, .06));
}

.lumen-card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2, #64748b);
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.lumen-card-link:hover { color: #d97706; }

/* ── Reader view ──────────────────────────────────────────────────────── */
.lumen-reader-main {
  flex: 1;
  overflow-y: auto;
  padding: 48px 32px 80px;
}

.lumen-reader {
  max-width: 720px;
  margin: 0 auto;
}

.lumen-reader-head {
  margin-bottom: 36px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .08));
}

.lumen-reader-title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin: 0 0 14px;
  line-height: 1.15;
}

.lumen-reader-summary {
  font-size: 18px;
  color: var(--text-2, #64748b);
  line-height: 1.5;
  margin: 0 0 14px;
}

.lumen-reader-meta {
  font-size: 13px;
  color: var(--text-3, #94a3b8);
}

/* ── Editor view (Overleaf-style) ─────────────────────────────────────── */
.lumen-editor-main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.lumen-sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--border, rgba(0, 0, 0, .08));
  background: var(--bg, #f8fafc);
  display: flex;
  flex-direction: column;
}

.lumen-sidebar-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .08));
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3, #94a3b8);
}

.lumen-sidebar-add {
  margin-left: auto;
  width: 22px; height: 22px;
  border-radius: 6px;
  border: none;
  background: var(--bg-card, #fff);
  color: var(--text-2, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;
}
.lumen-sidebar-add:hover { background: rgba(245, 158, 11, 0.1); color: #d97706; }

.lumen-sidebar-list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.lumen-sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-2, #64748b);
  border-left: 2px solid transparent;
  transition: all 200ms ease;
}

.lumen-sidebar-item:hover {
  background: var(--bg-card, #fff);
  color: var(--text, #1e293b);
}

.lumen-sidebar-item--active {
  background: var(--bg-card, #fff);
  border-left-color: #d97706;
  color: var(--text, #1e293b);
  font-weight: 600;
}

.lumen-sidebar-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lumen-sidebar-dot--ok { background: #059669; }
.lumen-sidebar-dot--draft { background: #94a3b8; }

.lumen-sidebar-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lumen-sidebar-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-3, #94a3b8);
}

/* ── Editor zone ──────────────────────────────────────────────────────── */
.lumen-editor-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.lumen-meta-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 24px 12px;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .06));
  background: var(--bg-card, #fff);
}

.lumen-meta-title,
.lumen-meta-summary {
  width: 100%;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--text, #1e293b);
  outline: none;
  padding: 4px 0;
}

.lumen-meta-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.lumen-meta-title::placeholder { color: var(--text-3, #94a3b8); }

.lumen-meta-summary {
  font-size: 14px;
  color: var(--text-2, #64748b);
}

.lumen-meta-summary::placeholder { color: var(--text-3, #94a3b8); }

/* ── Markdown toolbar ─────────────────────────────────────────────────── */
.lumen-md-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 24px;
  background: var(--bg, #f8fafc);
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .08));
  flex-shrink: 0;
}

.lumen-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-2, #64748b);
  cursor: pointer;
  transition: all 150ms ease;
}

.lumen-md-btn:hover {
  background: var(--bg-card, #fff);
  color: #d97706;
}

.lumen-md-codeblock {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
}

.lumen-md-sep {
  width: 1px;
  height: 18px;
  background: var(--border, rgba(0, 0, 0, .1));
  margin: 0 4px;
}

.lumen-md-toolbar-spacer { flex: 1; }

.lumen-md-stats {
  font-size: 11px;
  color: var(--text-3, #94a3b8);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
}

/* ── Split editor ─────────────────────────────────────────────────────── */
.lumen-split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 0;
}

.lumen-split--solo {
  grid-template-columns: 1fr;
}

.lumen-textarea {
  border: none;
  background: var(--bg-card, #fff);
  padding: 24px 36px;
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text, #1e293b);
  resize: none;
  outline: none;
  overflow-y: auto;
}

.lumen-textarea::placeholder { color: var(--text-3, #cbd5e1); }

.lumen-preview {
  background: var(--bg, #f8fafc);
  padding: 24px 36px;
  overflow-y: auto;
  border-left: 1px solid var(--border, rgba(0, 0, 0, .08));
  position: relative;
}

.lumen-preview-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-3, #cbd5e1);
}

.lumen-preview-empty p {
  margin: 0;
  font-size: 13px;
  text-align: center;
  max-width: 240px;
}

/* ── Prose (markdown rendu) ───────────────────────────────────────────── */
.lumen-prose {
  font-size: 16px;
  line-height: 1.75;
  color: var(--text, #1e293b);
}

.lumen-prose :deep(h1) {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 32px 0 14px;
  line-height: 1.2;
}
.lumen-prose :deep(h1):first-child { margin-top: 0; }

.lumen-prose :deep(h2) {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 28px 0 12px;
  line-height: 1.25;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .08));
}

.lumen-prose :deep(h3) {
  font-size: 18px;
  font-weight: 700;
  margin: 22px 0 10px;
}

.lumen-prose :deep(p) { margin: 0 0 16px; }
.lumen-prose :deep(ul),
.lumen-prose :deep(ol) { margin: 0 0 16px; padding-left: 26px; }
.lumen-prose :deep(li) { margin: 5px 0; }

.lumen-prose :deep(a) {
  color: #d97706;
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
.lumen-prose :deep(a:hover) { color: #b45309; }

.lumen-prose :deep(blockquote) {
  margin: 16px 0;
  padding: 10px 18px;
  border-left: 3px solid #f59e0b;
  background: rgba(245, 158, 11, 0.06);
  border-radius: 0 6px 6px 0;
  color: var(--text-2, #64748b);
}
.lumen-prose :deep(blockquote p:last-child) { margin-bottom: 0; }

.lumen-prose :deep(code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.88em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
}

.lumen-prose :deep(pre.lumen-code) {
  margin: 16px 0;
  padding: 16px 20px;
  border-radius: 10px;
  background: #0f172a;
  color: #e2e8f0;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
.lumen-prose :deep(pre.lumen-code code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.lumen-prose :deep(table) {
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
  font-size: 14px;
}
.lumen-prose :deep(th),
.lumen-prose :deep(td) {
  padding: 8px 14px;
  border: 1px solid var(--border, rgba(0, 0, 0, .1));
  text-align: left;
}
.lumen-prose :deep(th) {
  background: rgba(245, 158, 11, 0.06);
  font-weight: 700;
}

.lumen-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--border, rgba(0, 0, 0, .12));
  margin: 28px 0;
}

.lumen-prose :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .lumen-sidebar { display: none; }
  .lumen-split { grid-template-columns: 1fr; }
  .lumen-meta-row { padding: 12px 16px 8px; }
  .lumen-md-toolbar { padding: 6px 12px; flex-wrap: wrap; }
  .lumen-textarea, .lumen-preview { padding: 16px 20px; }
  .lumen-list-main { padding: 16px; }
  .lumen-reader-main { padding: 24px 16px; }
}
</style>
