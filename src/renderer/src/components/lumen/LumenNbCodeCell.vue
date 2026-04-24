<script setup lang="ts">
/**
 * Cellule de code d'un notebook Jupyter avec CodeMirror + exécution Pyodide.
 *
 * Isolee dans un composant dedie pour contourner les problemes de refs dans
 * les v-for : chaque cellule a son propre EditorView instantie en onMounted,
 * proprement detruit en onBeforeUnmount. Les outputs sont passes en prop
 * reactive depuis le runner parent (pas de state output local).
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { python } from '@codemirror/lang-python'
import { Play, Loader2 } from 'lucide-vue-next'

export interface NbOutput {
  kind: 'stdout' | 'stderr' | 'result' | 'image' | 'error'
  content: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  executionCount: number | null
  outputs: readonly NbOutput[]
  executing?: boolean
  kernelReady?: boolean
}>(), {
  executing: false,
  kernelReady: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'run'): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
let suppressEmit = false

function run() {
  if (props.executing) return
  emit('run')
}

// Theme Cursus compact pour une cell (hauteur auto, pas de scroll interne).
const cellTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
    fontSize: '13px',
  },
  '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(var(--accent-rgb),.22)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(var(--accent-rgb),.08)',
    color: 'var(--accent)',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,.025)' },
  '&.cm-focused': { outline: 'none' },
}, { dark: true })

onMounted(() => {
  if (!containerRef.value) return
  const runKeymap = keymap.of([
    // Shift-Enter : exécute la cellule (convention Jupyter).
    // Ctrl-Enter fonctionne aussi pour les habitués d'autres IDEs.
    { key: 'Shift-Enter', preventDefault: true, run: () => { run(); return true } },
    { key: 'Mod-Enter', preventDefault: true, run: () => { run(); return true } },
  ])
  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        bracketMatching(),
        indentOnInput(),
        history(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        python(),
        runKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        cellTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || suppressEmit) return
          emit('update:modelValue', update.state.doc.toString())
        }),
      ],
    }),
    parent: containerRef.value,
  })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

// Sync prop → editor (sans boucle infinie avec l'emit).
watch(() => props.modelValue, (next) => {
  if (!view) return
  const current = view.state.doc.toString()
  if (current === next) return
  suppressEmit = true
  view.dispatch({ changes: { from: 0, to: current.length, insert: next } })
  suppressEmit = false
})
</script>

<template>
  <div class="nb-code-cell" :class="{ 'nb-code-cell--executing': executing }">
    <div class="nb-code-row">
      <span class="nb-exec-count">
        <span v-if="executing"><Loader2 :size="12" class="nb-spin" /></span>
        <template v-else>[{{ executionCount ?? ' ' }}]</template>
      </span>
      <div ref="containerRef" class="nb-code-editor" />
      <button
        type="button"
        class="nb-run-btn"
        :disabled="executing || !kernelReady"
        :title="kernelReady ? 'Exécuter (Shift+Entrée)' : 'Kernel en cours de chargement'"
        aria-label="Exécuter la cellule"
        @click="run"
      >
        <Loader2 v-if="executing" :size="14" class="nb-spin" />
        <Play v-else :size="14" />
      </button>
    </div>

    <div v-if="outputs.length" class="nb-outputs">
      <template v-for="(out, i) in outputs" :key="i">
        <pre v-if="out.kind === 'stdout'" class="nb-out nb-out--stdout">{{ out.content }}</pre>
        <pre v-else-if="out.kind === 'stderr'" class="nb-out nb-out--stderr">{{ out.content }}</pre>
        <pre v-else-if="out.kind === 'result'" class="nb-out nb-out--result">{{ out.content }}</pre>
        <pre v-else-if="out.kind === 'error'" class="nb-out nb-out--error">{{ out.content }}</pre>
        <img v-else-if="out.kind === 'image'" class="nb-out nb-out--image" :src="`data:image/png;base64,${out.content}`" alt="Sortie matplotlib" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.nb-code-cell {
  margin: 10px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-input);
  overflow: hidden;
  transition: border-color var(--motion-fast) var(--ease-out);
}
.nb-code-cell--executing {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), .12);
}
.nb-code-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
}
.nb-exec-count {
  display: flex;
  align-items: flex-start;
  padding: 10px 6px 0 10px;
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--text-muted);
  user-select: none;
  min-width: 42px;
}
.nb-code-editor {
  flex: 1;
  min-width: 0;
}
.nb-run-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  background: transparent;
  border: none;
  border-left: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out);
}
.nb-run-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.nb-run-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}
.nb-outputs {
  padding: 6px 10px 10px 52px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: color-mix(in srgb, var(--bg-elevated) 40%, transparent);
  border-top: 1px solid var(--border);
}
.nb-out {
  margin: 0;
  padding: 6px 10px;
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
  border-radius: 4px;
  color: var(--text-primary);
}
.nb-out--stderr {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.nb-out--result {
  color: var(--text-secondary);
  font-style: italic;
}
.nb-out--error {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}
.nb-out--image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  background: #fff;
  padding: 6px;
}
.nb-spin {
  animation: nb-spin-kf .9s linear infinite;
}
@keyframes nb-spin-kf {
  from { transform: rotate(0); }
  to   { transform: rotate(360deg); }
}
</style>
