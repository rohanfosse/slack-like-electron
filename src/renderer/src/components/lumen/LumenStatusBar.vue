<script setup lang="ts">
import { computed } from 'vue'
import type { CursorInfo } from '@/composables/useLumenEditor'

interface Props {
  cursor: CursorInfo | null
  content: string
  saveState: 'saved' | 'saving' | 'dirty' | 'idle'
  savedAt?: string | null
  showLineNumbers: boolean
}
interface Emits {
  (e: 'toggleLineNumbers'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const words = computed(() => {
  const text = props.content.trim()
  return text ? text.split(/\s+/).length : 0
})

const chars = computed(() => props.content.length)

const readingMinutes = computed(() => Math.max(1, Math.ceil(words.value / 200)))

// Compteur de structure : nombre de titres par niveau + nombre de paragraphes
// non vides. Calcule en parcourant les lignes une seule fois.
const structure = computed(() => {
  let h1 = 0, h2 = 0, h3 = 0
  let paragraphs = 0
  let inCode = false
  let lastLineWasEmpty = true
  for (const line of props.content.split('\n')) {
    const t = line.trim()
    if (t.startsWith('```') || t.startsWith('~~~')) { inCode = !inCode; continue }
    if (inCode) continue
    if (t === '') { lastLineWasEmpty = true; continue }
    if (t.startsWith('### ')) h3++
    else if (t.startsWith('## ')) h2++
    else if (t.startsWith('# ')) h1++
    else if (lastLineWasEmpty && !t.startsWith('>') && !t.match(/^[-*+]\s/) && !t.match(/^\d+\.\s/)) {
      paragraphs++
    }
    lastLineWasEmpty = false
  }
  return { h1, h2, h3, paragraphs }
})

const structureLabel = computed(() => {
  const s = structure.value
  const parts: string[] = []
  if (s.h1) parts.push(`${s.h1} H1`)
  if (s.h2) parts.push(`${s.h2} H2`)
  if (s.h3) parts.push(`${s.h3} H3`)
  if (s.paragraphs) parts.push(`${s.paragraphs} ¶`)
  return parts.join(' · ')
})

const cursorLabel = computed(() => {
  if (!props.cursor) return 'Ln 1, Col 1'
  const { line, col, selectionLength } = props.cursor
  if (selectionLength > 0) return `Ln ${line}, Col ${col} · ${selectionLength} sel`
  return `Ln ${line}, Col ${col}`
})

const saveLabel = computed(() => {
  switch (props.saveState) {
    case 'saving': return 'Enregistrement…'
    case 'dirty':  return 'Modifications non enregistrées'
    case 'saved':  return props.savedAt ? `Enregistré · ${props.savedAt}` : 'Enregistré'
    default:       return ''
  }
})

const saveDot = computed(() => {
  switch (props.saveState) {
    case 'saving': return 'lumen-status-dot--saving'
    case 'dirty':  return 'lumen-status-dot--dirty'
    case 'saved':  return 'lumen-status-dot--saved'
    default:       return 'lumen-status-dot--idle'
  }
})
</script>

<template>
  <footer class="lumen-statusbar">
    <div class="lumen-sb-group">
      <button class="lumen-sb-item lumen-sb-item--btn" :title="showLineNumbers ? 'Masquer les numéros de ligne' : 'Afficher les numéros de ligne'" @click="$emit('toggleLineNumbers')">
        {{ showLineNumbers ? '# on' : '# off' }}
      </button>
      <span class="lumen-sb-item">{{ cursorLabel }}</span>
    </div>
    <div class="lumen-sb-group lumen-sb-center">
      <span class="lumen-sb-item">{{ words }} mots</span>
      <span class="lumen-sb-item">{{ chars }} car.</span>
      <span class="lumen-sb-item">~{{ readingMinutes }} min de lecture</span>
      <span v-if="structureLabel" class="lumen-sb-item lumen-sb-item--structure" :title="`${structure.h1} H1, ${structure.h2} H2, ${structure.h3} H3, ${structure.paragraphs} paragraphes`">
        {{ structureLabel }}
      </span>
    </div>
    <div class="lumen-sb-group lumen-sb-right">
      <span v-if="saveLabel" class="lumen-sb-save">
        <span class="lumen-status-dot" :class="saveDot" />
        {{ saveLabel }}
      </span>
      <span class="lumen-sb-item lumen-sb-item--lang">Markdown</span>
    </div>
  </footer>
</template>

<style scoped>
.lumen-statusbar {
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 3px 16px;
  background: var(--bg-sidebar);
  border-top: 1px solid var(--border);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: var(--text-xs);
  color: var(--text-muted);
  flex-shrink: 0;
  gap: 24px;
  user-select: none;
}

.lumen-sb-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lumen-sb-center {
  flex: 1;
  justify-content: center;
}

.lumen-sb-right {
  margin-left: auto;
}

.lumen-sb-item--btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  font-family: inherit;
  font-size: inherit;
  min-height: 22px;
}
.lumen-sb-item--btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.lumen-sb-item--btn:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 1px;
}

.lumen-sb-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lumen-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
}
.lumen-status-dot--saving { background: var(--accent); animation: lumen-pulse 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lumen-status-dot--saving { animation: none; }
}
.lumen-status-dot--dirty  { background: var(--color-warning); }
.lumen-status-dot--saved  { background: var(--color-success); }
.lumen-status-dot--idle   { background: var(--text-muted); }

@keyframes lumen-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.lumen-sb-item--lang {
  padding: 2px 6px;
  border-left: 1px solid var(--border);
}
.lumen-sb-item--structure {
  padding-left: 12px;
  border-left: 1px solid var(--border);
  opacity: 0.75;
}
</style>
