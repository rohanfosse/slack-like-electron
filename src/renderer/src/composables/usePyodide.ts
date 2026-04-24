// ─── Pyodide runtime (singleton, lazy) ──────────────────────────────────────
//
// Pyodide est un runtime Python complet compile en WebAssembly (~10 Mo
// compresse, decompresse a la volee par le navigateur). On le charge
// uniquement quand l'utilisateur active le mode execution d'un notebook
// (phase 2 Lumen — ouvrir un .ipynb et cliquer "Exécuter").
//
// Le module JS est chargé via <script> depuis le CDN jsDelivr — on ne bundle
// pas le runtime dans l'app (trop gros, jamais utilise par la majorite des
// users). Apres le premier load, le service worker du navigateur cache tout.
//
// Les etats sont partages entre tous les composants qui appellent
// usePyodide() : une seule instance Python pour toute la session, donc les
// variables definies dans la cellule 1 sont visibles en cellule 2, etc.
// (comportement kernel Jupyter classique).
import { ref, computed } from 'vue'

export type PyodideState = 'idle' | 'loading' | 'ready' | 'error'

export interface PyRunResult {
  stdout: string
  stderr: string
  /** repr() de la derniere expression, si expression (pas statement). */
  result: string | null
  /** Figures matplotlib capturees durant ce run (base64 PNG). */
  figures: string[]
  /** Erreur Python (traceback complet). */
  error: { name: string; message: string; traceback: string } | null
  /** Numero d'execution incremental (comme Jupyter [1], [2], ...). */
  executionCount: number
}

// Types minimaux — on evite d'importer @types/pyodide (~30Ko) pour garder
// les chunks legers. L'interface runPythonAsync + globals.set/get suffit.
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>
  globals: { get: (name: string) => unknown; set: (name: string, value: unknown) => void }
  setStdout: (options: { batched?: (s: string) => void }) => void
  setStderr: (options: { batched?: (s: string) => void }) => void
  loadPackagesFromImports: (code: string) => Promise<void>
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>
  }
}

const PYODIDE_VERSION = '0.29.3'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

// Bootstrap Python execute une fois apres chargement : prepare matplotlib
// (backend AGG non-interactif obligatoire en WASM — pas de fenetre native)
// et monkey-patch plt.show() pour capturer les figures en base64 sans
// popup. Les figures sont stashees dans `_cursus_figures` relu par le JS
// apres chaque run.
const BOOTSTRAP_PY = `
import sys, io, base64, os

_cursus_figures = []

def _cursus_reset_figures():
    global _cursus_figures
    _cursus_figures = []

def _cursus_capture_pending_figures():
    """Capture toutes les figures matplotlib ouvertes (appele apres chaque run)."""
    try:
        import matplotlib.pyplot as plt
        for num in plt.get_fignums():
            fig = plt.figure(num)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=80)
            _cursus_figures.append(base64.b64encode(buf.getvalue()).decode('ascii'))
            plt.close(fig)
    except Exception:
        pass  # matplotlib pas encore importe, ok

def _cursus_install_mpl_hook():
    """Fait en sorte que plt.show() capture au lieu d'ouvrir une fenetre."""
    try:
        import matplotlib
        matplotlib.use('AGG')
        import matplotlib.pyplot as plt
        _orig_show = plt.show
        def _cursus_show(*args, **kwargs):
            _cursus_capture_pending_figures()
        plt.show = _cursus_show
    except Exception:
        pass

_cursus_install_mpl_hook()
`

// ── État reactif global (singleton) ─────────────────────────────────────────
const state = ref<PyodideState>('idle')
const errorMessage = ref<string | null>(null)
const progressMessage = ref<string>('')
let executionCounter = 0
let pyodideInstance: PyodideInterface | null = null
let loadPromise: Promise<void> | null = null

async function injectPyodideScript(): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Pyodide requiert un navigateur')
  if (window.loadPyodide) return
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${PYODIDE_CDN}pyodide.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Echec chargement pyodide.js depuis le CDN'))
    document.head.appendChild(script)
  })
}

async function loadRuntime(): Promise<void> {
  if (state.value === 'ready' && pyodideInstance) return
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      state.value = 'loading'
      errorMessage.value = null
      progressMessage.value = 'Chargement du runtime Python...'
      await injectPyodideScript()
      if (!window.loadPyodide) throw new Error('loadPyodide introuvable apres injection du script')
      progressMessage.value = 'Initialisation de Python...'
      pyodideInstance = await window.loadPyodide({ indexURL: PYODIDE_CDN })
      progressMessage.value = 'Preparation de l\'environnement...'
      await pyodideInstance.runPythonAsync(BOOTSTRAP_PY)
      progressMessage.value = ''
      state.value = 'ready'
    } catch (err) {
      state.value = 'error'
      errorMessage.value = err instanceof Error ? err.message : String(err)
      loadPromise = null
      throw err
    }
  })()
  return loadPromise
}

async function run(code: string): Promise<PyRunResult> {
  if (!pyodideInstance) throw new Error('Pyodide non initialise (appeler load() d\'abord)')
  executionCounter++
  const executionCount = executionCounter

  let stdout = ''
  let stderr = ''
  pyodideInstance.setStdout({ batched: (s) => { stdout += s } })
  pyodideInstance.setStderr({ batched: (s) => { stderr += s } })

  // Reset de la pile de figures capturees pour ce run uniquement.
  await pyodideInstance.runPythonAsync('_cursus_reset_figures()')

  let result: string | null = null
  let error: PyRunResult['error'] = null

  try {
    // Installe automatiquement les packages utilises (numpy, pandas,
    // matplotlib, etc) via micropip/loadPackage avant l'execution.
    await pyodideInstance.loadPackagesFromImports(code)
    const raw = await pyodideInstance.runPythonAsync(code)
    // Capture les figures matplotlib creees mais pas explicitement show()es :
    // comportement Jupyter (auto-display de la derniere fig en fin de cell).
    await pyodideInstance.runPythonAsync('_cursus_capture_pending_figures()')
    if (raw !== undefined && raw !== null) {
      // On utilise repr() via Python pour l'affichage Jupyter-like
      const reprResult = await pyodideInstance.runPythonAsync('repr(_)') as unknown
      result = typeof reprResult === 'string' ? reprResult : String(raw)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // PythonError expose .type/.message — on essaie de recuperer un nom lisible
    const firstLine = msg.split('\n').find(l => l.trim().length > 0) ?? 'Error'
    const match = firstLine.match(/^(\w+Error|\w+Exception|\w+Warning):/)
    error = {
      name: match ? match[1] : 'PythonError',
      message: msg,
      traceback: msg,
    }
  }

  // Recupere les figures capturees durant ce run.
  const figuresPy = pyodideInstance.globals.get('_cursus_figures') as { toJs?: () => string[] } | string[] | undefined
  let figures: string[] = []
  if (figuresPy && typeof (figuresPy as { toJs?: () => string[] }).toJs === 'function') {
    figures = (figuresPy as { toJs: () => string[] }).toJs()
  } else if (Array.isArray(figuresPy)) {
    figures = figuresPy
  }

  return { stdout, stderr, result, figures, error, executionCount }
}

/** Reinitialise le kernel : efface toutes les variables globales Python. */
async function reset(): Promise<void> {
  if (!pyodideInstance) return
  executionCounter = 0
  // Reimporte les modules courants, re-installe le hook matplotlib.
  await pyodideInstance.runPythonAsync(`
for _k in list(globals().keys()):
    if not _k.startswith('_') and _k not in ('sys', 'os', 'io', 'base64'):
        del globals()[_k]
`)
  await pyodideInstance.runPythonAsync(BOOTSTRAP_PY)
}

export function usePyodide() {
  return {
    state: computed(() => state.value),
    progressMessage: computed(() => progressMessage.value),
    errorMessage: computed(() => errorMessage.value),
    isReady: computed(() => state.value === 'ready'),
    isLoading: computed(() => state.value === 'loading'),
    load: loadRuntime,
    run,
    reset,
  }
}
