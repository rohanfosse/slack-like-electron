<script setup lang="ts">
/**
 * Mode execution d'un notebook .ipynb dans Lumen (phase 2).
 *
 * Parse le JSON du notebook et rend un vrai environnement interactif :
 * chaque cellule code est editable (CodeMirror) et executable via Pyodide
 * (Python dans le navigateur). Les variables sont partagees entre cellules
 * (comportement kernel Jupyter).
 *
 * Pyodide est charge lazy a la premiere interaction avec le kernel (click
 * "Démarrer" ou "Exécuter") — ~10Mo compressed depuis le CDN jsDelivr.
 */
import { computed, ref } from 'vue'
import { Play, RefreshCw, Download, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { renderMarkdown } from '@/utils/markdown'
import { usePyodide } from '@/composables/usePyodide'
import LumenNbCodeCell, { type NbOutput } from './LumenNbCodeCell.vue'

const props = defineProps<{
  source: string
  chapterPath: string
}>()

// ─── Parsing du notebook ─────────────────────────────────────────────────
interface RawCell {
  cell_type: string
  source?: string[] | string
  execution_count?: number | null
}

interface NbCell {
  id: string
  type: 'code' | 'markdown' | 'raw'
  code: string
  executionCount: number | null
  outputs: NbOutput[]
  executing: boolean
}

function joinSource(source: string[] | string | undefined): string {
  if (!source) return ''
  return Array.isArray(source) ? source.join('') : source
}

const parseError = ref<string | null>(null)
const cells = ref<NbCell[]>(parseCells())

function parseCells(): NbCell[] {
  try {
    const nb = JSON.parse(props.source) as { cells?: RawCell[] }
    if (!nb.cells || !Array.isArray(nb.cells)) {
      parseError.value = 'Aucune cellule trouvee dans le notebook'
      return []
    }
    parseError.value = null
    return nb.cells.map((c, idx): NbCell => ({
      id: `cell-${idx}`,
      type: (c.cell_type === 'markdown' || c.cell_type === 'raw' || c.cell_type === 'code')
        ? c.cell_type
        : 'raw',
      code: joinSource(c.source),
      executionCount: c.cell_type === 'code' ? (c.execution_count ?? null) : null,
      outputs: [],
      executing: false,
    }))
  } catch {
    parseError.value = 'Format .ipynb invalide'
    return []
  }
}

// ─── Kernel Pyodide ──────────────────────────────────────────────────────
const { state: pyState, progressMessage, errorMessage, isReady, isLoading, load, run, reset } = usePyodide()

const bootError = ref<string | null>(null)

async function ensureKernel(): Promise<boolean> {
  if (isReady.value) return true
  try {
    bootError.value = null
    await load()
    return true
  } catch (err) {
    bootError.value = err instanceof Error ? err.message : String(err)
    return false
  }
}

async function runCell(cell: NbCell) {
  if (cell.type !== 'code') return
  if (!await ensureKernel()) return
  cell.executing = true
  cell.outputs = []
  try {
    const res = await run(cell.code)
    const outs: NbOutput[] = []
    if (res.stdout) outs.push({ kind: 'stdout', content: res.stdout })
    if (res.stderr) outs.push({ kind: 'stderr', content: res.stderr })
    for (const fig of res.figures) outs.push({ kind: 'image', content: fig })
    if (res.result) outs.push({ kind: 'result', content: res.result })
    if (res.error) outs.push({ kind: 'error', content: res.error.traceback || `${res.error.name}: ${res.error.message}` })
    cell.outputs = outs
    cell.executionCount = res.executionCount
  } finally {
    cell.executing = false
  }
}

async function runAll() {
  if (!await ensureKernel()) return
  for (const cell of cells.value) {
    if (cell.type !== 'code') continue
    await runCell(cell)
    // Stop cascade si une cellule echoue — comportement "Restart & Run All"
    // de Jupyter : erreur = on arrete pour eviter les cascades incoherentes.
    if (cell.outputs.some(o => o.kind === 'error')) break
  }
}

async function resetKernel() {
  try {
    await reset()
    // Clear aussi les outputs affiches, comme "Restart Kernel & Clear Outputs".
    for (const cell of cells.value) {
      cell.outputs = []
      cell.executionCount = null
    }
  } catch (err) {
    bootError.value = err instanceof Error ? err.message : String(err)
  }
}

// Export du notebook avec les outputs actuels (comportement "Download as .ipynb").
function downloadNotebook() {
  try {
    const nb = JSON.parse(props.source) as { cells?: RawCell[]; [k: string]: unknown }
    const rawCells = nb.cells ?? []
    const enriched = rawCells.map((raw, idx) => {
      const live = cells.value[idx]
      if (!live || live.type !== 'code') return raw
      return {
        ...raw,
        execution_count: live.executionCount,
        outputs: live.outputs.map(o => outputToNbformat(o, live.executionCount)).filter(Boolean),
      }
    })
    const exported = { ...nb, cells: enriched }
    const blob = new Blob([JSON.stringify(exported, null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = (props.chapterPath.split('/').pop() ?? 'notebook.ipynb').replace(/\.ipynb$/, '') + '-executed.ipynb'
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    bootError.value = err instanceof Error ? err.message : String(err)
  }
}

function outputToNbformat(out: NbOutput, executionCount: number | null): object | null {
  if (out.kind === 'stdout' || out.kind === 'stderr') {
    return { output_type: 'stream', name: out.kind, text: out.content }
  }
  if (out.kind === 'result') {
    return {
      output_type: 'execute_result',
      execution_count: executionCount,
      data: { 'text/plain': out.content },
      metadata: {},
    }
  }
  if (out.kind === 'image') {
    return {
      output_type: 'display_data',
      data: { 'image/png': out.content },
      metadata: {},
    }
  }
  if (out.kind === 'error') {
    const lines = out.content.split('\n')
    return {
      output_type: 'error',
      ename: 'Error',
      evalue: lines[0] ?? '',
      traceback: lines,
    }
  }
  return null
}

// ─── Rendu markdown des cells non-code ───────────────────────────────────
function renderMd(source: string): string {
  return renderMarkdown(source, { chapterPath: props.chapterPath })
}

const kernelStatusLabel = computed(() => {
  if (pyState.value === 'ready')   return 'Kernel prêt'
  if (pyState.value === 'loading') return progressMessage.value || 'Chargement...'
  if (pyState.value === 'error')   return 'Erreur kernel'
  return 'Kernel non démarré'
})
</script>

<template>
  <div class="nb-runner">
    <!-- Barre d'outils kernel -->
    <header class="nb-runner-toolbar">
      <div class="nb-runner-toolbar-left">
        <span class="nb-kernel-dot" :class="`nb-kernel-dot--${pyState}`" aria-hidden="true" />
        <span class="nb-kernel-status">{{ kernelStatusLabel }}</span>
      </div>
      <div class="nb-runner-toolbar-right">
        <button
          type="button"
          class="nb-tb-btn"
          :disabled="isLoading || !cells.length"
          @click="runAll"
        >
          <Play :size="13" />
          <span>Tout exécuter</span>
        </button>
        <button
          type="button"
          class="nb-tb-btn"
          :disabled="!isReady || isLoading"
          :title="isReady ? 'Réinitialiser le kernel (efface variables et sorties)' : 'Kernel non démarré'"
          @click="resetKernel"
        >
          <RefreshCw :size="13" />
          <span>Réinitialiser</span>
        </button>
        <button
          type="button"
          class="nb-tb-btn"
          :disabled="!cells.length"
          title="Télécharger le notebook avec les sorties actuelles"
          @click="downloadNotebook"
        >
          <Download :size="13" />
          <span>Télécharger</span>
        </button>
      </div>
    </header>

    <!-- Message d'erreur chargement kernel -->
    <div v-if="bootError || errorMessage" class="nb-kernel-error" role="alert">
      <AlertTriangle :size="14" />
      <span>{{ bootError || errorMessage }}</span>
    </div>

    <!-- Banner chargement pyodide -->
    <div v-else-if="isLoading" class="nb-kernel-loading">
      <Loader2 :size="14" class="nb-spin" />
      <span>{{ progressMessage || 'Chargement du runtime Python...' }}</span>
    </div>

    <!-- Erreur de parsing .ipynb -->
    <div v-if="parseError" class="nb-parse-error" role="alert">
      <AlertTriangle :size="14" />
      <span>{{ parseError }}</span>
    </div>

    <!-- Cellules -->
    <div v-else class="nb-cells">
      <template v-for="cell in cells" :key="cell.id">
        <!-- Cellule markdown : rendu statique -->
        <div
          v-if="cell.type === 'markdown'"
          class="nb-md-cell markdown-body"
          v-html="renderMd(cell.code)"
        />
        <!-- Cellule raw : texte preformate -->
        <pre v-else-if="cell.type === 'raw'" class="nb-raw-cell">{{ cell.code }}</pre>
        <!-- Cellule code : editeur + exécution -->
        <LumenNbCodeCell
          v-else
          v-model="cell.code"
          :execution-count="cell.executionCount"
          :outputs="cell.outputs"
          :executing="cell.executing"
          :kernel-ready="isReady"
          @run="runCell(cell)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.nb-runner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 20px;
}

/* ── Barre d'outils ──────────────────────────────────────────────────── */
.nb-runner-toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.nb-runner-toolbar-left,
.nb-runner-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nb-kernel-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--bg-elevated) 80%, transparent);
}
.nb-kernel-dot--ready    { background: var(--color-success); }
.nb-kernel-dot--loading  { background: var(--accent); animation: nb-pulse 1.4s ease-in-out infinite; }
.nb-kernel-dot--error    { background: var(--color-danger); }
.nb-kernel-status {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}
.nb-tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition:
    background var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out);
}
.nb-tb-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
}
.nb-tb-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

/* ── Loading / errors ────────────────────────────────────────────────── */
.nb-kernel-loading,
.nb-kernel-error,
.nb-parse-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12.5px;
}
.nb-kernel-loading {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}
.nb-kernel-error,
.nb-parse-error {
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
}

/* ── Cells ───────────────────────────────────────────────────────────── */
.nb-cells {
  display: flex;
  flex-direction: column;
}
.nb-md-cell {
  padding: 6px 8px;
  margin: 6px 0;
}
.nb-raw-cell {
  padding: 10px 14px;
  margin: 10px 0;
  background: var(--bg-input);
  border: 1px dashed var(--border);
  border-radius: 8px;
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  white-space: pre-wrap;
  color: var(--text-secondary);
}

.nb-spin { animation: nb-spin-kf .9s linear infinite; }
@keyframes nb-spin-kf {
  from { transform: rotate(0); }
  to   { transform: rotate(360deg); }
}
@keyframes nb-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: .5; }
}
</style>
