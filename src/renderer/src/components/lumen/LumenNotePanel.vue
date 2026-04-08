<script setup lang="ts">
/**
 * Panneau "Mes notes" prive a un etudiant pour un cours Lumen.
 * Persiste automatiquement le contenu (debounce 1.5s) dans la table
 * lumen_course_notes. Affiche "Modifie il y a ..." avec le relativeTime.
 *
 * Un seul etudiant voit sa propre note (aucune visibilite prof / pair).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { NotebookPen, Trash2, Check, Loader2 } from 'lucide-vue-next'
import { useLumenStore } from '@/stores/lumen'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { relativeTime } from '@/utils/date'

interface Props {
  courseId: number
}
const props = defineProps<Props>()

const lumenStore = useLumenStore()
const { showToast } = useToast()
const { confirm: confirmDialog } = useConfirm()

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const draft       = ref<string>('')
const saveState   = ref<SaveState>('idle')
const lastSavedAt = ref<string | null>(null)
const initialized = ref(false)
const expanded    = ref(false)

// ── Chargement initial au montage / changement de cours ─────────────────
async function loadNote() {
  initialized.value = false
  const note = await lumenStore.fetchCourseNote(props.courseId)
  draft.value = note?.content ?? ''
  lastSavedAt.value = note?.updated_at ?? null
  initialized.value = true
}
onMounted(loadNote)
watch(() => props.courseId, loadNote)

// ── Auto-save debounce 1.5s ──────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const MAX_CHARS = 10_000

watch(draft, (newVal) => {
  if (!initialized.value) return
  if (newVal.length > MAX_CHARS) return  // bloque au-dela (textarea maxlength)
  if (debounceTimer) clearTimeout(debounceTimer)
  saveState.value = 'saving'
  debounceTimer = setTimeout(async () => {
    try {
      const saved = await lumenStore.saveCourseNote(props.courseId, newVal)
      if (saved) {
        lastSavedAt.value = saved.updated_at
        saveState.value = 'saved'
        // Revient a idle apres 1s pour ne pas garder "sauve" indefiniment
        setTimeout(() => {
          if (saveState.value === 'saved') saveState.value = 'idle'
        }, 1200)
      } else {
        saveState.value = 'error'
      }
    } catch {
      saveState.value = 'error'
    }
  }, 1500)
})

async function handleDelete() {
  if (!draft.value.trim() && !lastSavedAt.value) return
  if (!(await confirmDialog('Supprimer definitivement cette note ?', 'danger', 'Supprimer'))) return
  const ok = await lumenStore.deleteCourseNote(props.courseId)
  if (ok) {
    draft.value = ''
    lastSavedAt.value = null
    saveState.value = 'idle'
    showToast('Note supprimee', 'info')
  }
}

const charCount = computed(() => draft.value.length)
const charCountWarn = computed(() => charCount.value > MAX_CHARS * 0.9)

const hasContent = computed(() => draft.value.trim().length > 0 || lastSavedAt.value !== null)
</script>

<template>
  <details
    class="notes-panel"
    :open="expanded || hasContent"
    @toggle="(e) => expanded = (e.target as HTMLDetailsElement).open"
  >
    <summary class="notes-summary">
      <NotebookPen :size="14" />
      <span class="notes-summary-title">Mes notes</span>
      <span v-if="lastSavedAt" class="notes-summary-meta">
        Modifie {{ relativeTime(lastSavedAt) }}
      </span>
      <span v-else-if="!initialized" class="notes-summary-meta">Chargement…</span>
      <span v-else class="notes-summary-meta">Prive — visible uniquement par toi</span>
    </summary>

    <div class="notes-body">
      <textarea
        v-model="draft"
        class="notes-textarea"
        placeholder="Prends des notes sur ce cours… (auto-sauvegarde)"
        :maxlength="MAX_CHARS"
        :disabled="!initialized"
        rows="8"
        aria-label="Notes personnelles pour ce cours"
      />

      <footer class="notes-footer">
        <div class="notes-status">
          <template v-if="saveState === 'saving'">
            <Loader2 :size="12" class="notes-spinner" />
            <span>Sauvegarde…</span>
          </template>
          <template v-else-if="saveState === 'saved'">
            <Check :size="12" />
            <span>Sauve</span>
          </template>
          <template v-else-if="saveState === 'error'">
            <span class="notes-error">Echec de sauvegarde</span>
          </template>
        </div>
        <span class="notes-count" :class="{ 'notes-count--warn': charCountWarn }">
          {{ charCount }} / {{ MAX_CHARS }}
        </span>
        <button
          v-if="hasContent"
          type="button"
          class="notes-delete"
          title="Supprimer la note"
          aria-label="Supprimer la note"
          @click="handleDelete"
        >
          <Trash2 :size="13" />
        </button>
      </footer>
    </div>
  </details>
</template>

<style scoped>
.notes-panel {
  margin-top: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  overflow: hidden;
}

.notes-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  list-style: none;
  background: var(--bg-sidebar, var(--bg-elevated));
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  transition: background 120ms ease;
}
.notes-summary:hover { background: var(--bg-hover); }
.notes-summary::-webkit-details-marker { display: none; }
.notes-summary::before {
  content: '\25B6';
  font-size: 9px;
  color: var(--text-muted);
  transition: transform 150ms ease;
  margin-right: 2px;
}
.notes-panel[open] > .notes-summary::before { transform: rotate(90deg); }

.notes-summary-title {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}
.notes-summary-meta {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
}

.notes-body { padding: 14px 16px 12px; }

.notes-textarea {
  width: 100%;
  min-height: 140px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
}
.notes-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-subtle);
}
.notes-textarea:disabled { opacity: 0.5; }

.notes-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
}
.notes-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 100px;
}
.notes-error { color: var(--color-danger, #d9534f); }
.notes-count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.notes-count--warn { color: var(--color-warning, #e6a700); }
.notes-delete {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 120ms ease, background 120ms ease;
}
.notes-delete:hover {
  color: var(--color-danger, #d9534f);
  background: var(--bg-hover);
}

.notes-spinner { animation: notes-spin 0.8s linear infinite; }
@keyframes notes-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .notes-spinner { animation: none; }
}
</style>
