/**
 * useLumenEditor — Composable CodeMirror 6 pour Lumen.
 *
 * Encapsule l'instance EditorView, expose une API minimale :
 *  - mount / destroy
 *  - getText / setText
 *  - insertions markdown (wrap selection, line prefix, block)
 *  - signals reactifs (cursor, selection, stats)
 *  - hooks scroll & focus
 */
import { ref, shallowRef, type Ref } from 'vue'
import { EditorState, Compartment, EditorSelection, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, placeholder as placeholderExt } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { tags as t } from '@lezer/highlight'

// ── Theme Lumen : aligne sur les tokens de l'app (accent bleu, neutres) ────
const lumenHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.5em', fontWeight: 'bold', color: 'var(--text-primary)' },
  { tag: t.heading2, fontSize: '1.3em', fontWeight: 'bold', color: 'var(--text-primary)' },
  { tag: t.heading3, fontSize: '1.15em', fontWeight: '700', color: 'var(--text-primary)' },
  { tag: t.heading4, fontWeight: '700', color: 'var(--text-primary)' },
  { tag: [t.heading5, t.heading6], fontWeight: '700', color: 'var(--text-primary)' },
  { tag: t.strong, fontWeight: 'bold', color: 'var(--text-primary)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--text-secondary)' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--text-muted)' },
  { tag: t.link, color: 'var(--accent-light)', textDecoration: 'underline' },
  { tag: t.url,  color: 'var(--accent-light)' },
  { tag: t.monospace, fontFamily: "'JetBrains Mono', ui-monospace, monospace", backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-light)' },
  { tag: t.quote, color: 'var(--text-secondary)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--text-secondary)' },
  { tag: t.meta, color: 'var(--text-muted)' },
  { tag: t.comment, color: 'var(--text-muted)', fontStyle: 'italic' },
])

// Theme CSS de l'editeur (fond, padding, typographie)
const lumenEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14.5px',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-primary)',
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
    lineHeight: '1.75',
    padding: '24px 36px 300px 36px',
  },
  '.cm-content': {
    caretColor: 'var(--accent)',
    maxWidth: '780px',
    margin: '0 auto',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused': {
    outline: 'none',
    boxShadow: 'inset 3px 0 0 var(--accent)',
  },
  '&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground': {
    background: 'var(--bg-active)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--bg-hover)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-sidebar)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRight: '1px solid var(--border)',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '12px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--accent-light)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'var(--bg-active)',
    outline: '1px solid var(--accent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--accent-subtle)',
  },
  '.cm-placeholder': {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
})

export interface LumenEditorOptions {
  initial?: string
  placeholder?: string
  onChange?: (doc: string) => void
  onCursor?: (info: CursorInfo) => void
  showLineNumbers?: boolean
}

export interface CursorInfo {
  line: number
  col: number
  selectionLength: number
}

export function useLumenEditor(opts: LumenEditorOptions = {}) {
  const view = shallowRef<EditorView | null>(null)
  const lineNumbersCompartment = new Compartment()
  const docText: Ref<string> = ref(opts.initial ?? '')

  // ── Extensions ─────────────────────────────────────────────────────────────
  function buildExtensions(): Extension[] {
    return [
      lineNumbersCompartment.of(opts.showLineNumbers ? lineNumbers() : []),
      highlightActiveLine(),
      drawSelection(),
      history(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ defaultKeymap: false }),
      highlightSelectionMatches(),
      markdown({ base: markdownLanguage, addKeymap: true }),
      syntaxHighlighting(lumenHighlightStyle),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      EditorView.lineWrapping,
      placeholderExt(opts.placeholder ?? 'Écris ton cours en Markdown…'),
      lumenEditorTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          docText.value = update.state.doc.toString()
          opts.onChange?.(docText.value)
        }
        if (update.selectionSet || update.docChanged) {
          opts.onCursor?.(computeCursor(update.view))
        }
      }),
    ]
  }

  function computeCursor(v: EditorView): CursorInfo {
    const range = v.state.selection.main
    const line = v.state.doc.lineAt(range.head)
    return {
      line: line.number,
      col: range.head - line.from + 1,
      selectionLength: range.to - range.from,
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  function mount(parent: HTMLElement) {
    if (view.value) view.value.destroy()
    const state = EditorState.create({
      doc: opts.initial ?? '',
      extensions: buildExtensions(),
    })
    view.value = new EditorView({ state, parent })
    docText.value = state.doc.toString()
  }

  function destroy() {
    if (view.value) {
      view.value.destroy()
      view.value = null
    }
  }

  // ── Text access ────────────────────────────────────────────────────────────
  function getText(): string {
    return view.value?.state.doc.toString() ?? docText.value
  }

  function setText(text: string) {
    const v = view.value
    if (!v) { docText.value = text; return }
    v.dispatch({
      changes: { from: 0, to: v.state.doc.length, insert: text },
    })
  }

  function focus() { view.value?.focus() }

  // ── Toolbar actions : wrap selection / insert at line / replace ───────────
  function wrapSelection(prefix: string, suffix: string = prefix, placeholder = '') {
    const v = view.value
    if (!v) return
    const range = v.state.selection.main
    const selected = v.state.sliceDoc(range.from, range.to) || placeholder
    const insert = prefix + selected + suffix
    v.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.range(range.from + prefix.length, range.from + prefix.length + selected.length),
      scrollIntoView: true,
    })
    v.focus()
  }

  function prefixLine(prefix: string) {
    const v = view.value
    if (!v) return
    const range = v.state.selection.main
    const line = v.state.doc.lineAt(range.head)
    // Si le prefixe existe deja, le retirer (toggle)
    const current = v.state.sliceDoc(line.from, line.from + prefix.length)
    if (current === prefix) {
      v.dispatch({
        changes: { from: line.from, to: line.from + prefix.length, insert: '' },
        selection: EditorSelection.cursor(Math.max(line.from, range.head - prefix.length)),
      })
    } else {
      v.dispatch({
        changes: { from: line.from, to: line.from, insert: prefix },
        selection: EditorSelection.cursor(range.head + prefix.length),
        scrollIntoView: true,
      })
    }
    v.focus()
  }

  function insertBlock(block: string, selectAfter = false) {
    const v = view.value
    if (!v) return
    const range = v.state.selection.main
    // Inserer sur une nouvelle ligne si la courante n'est pas vide
    const line = v.state.doc.lineAt(range.head)
    const prefix = line.text.trim() === '' ? '' : '\n\n'
    const insert = prefix + block
    const insertFrom = range.from
    v.dispatch({
      changes: { from: insertFrom, to: range.to, insert },
      selection: selectAfter
        ? EditorSelection.range(insertFrom + prefix.length, insertFrom + prefix.length + block.length)
        : EditorSelection.cursor(insertFrom + insert.length),
      scrollIntoView: true,
    })
    v.focus()
  }

  function insertAtCursor(text: string) {
    const v = view.value
    if (!v) return
    const range = v.state.selection.main
    v.dispatch({
      changes: { from: range.from, to: range.to, insert: text },
      selection: EditorSelection.cursor(range.from + text.length),
      scrollIntoView: true,
    })
    v.focus()
  }

  // ── Scroll sync : renvoie ratio 0..1 du scroll actuel ─────────────────────
  function getScrollRatio(): number {
    const v = view.value
    if (!v) return 0
    const el = v.scrollDOM
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return 0
    return el.scrollTop / max
  }

  function setScrollRatio(ratio: number) {
    const v = view.value
    if (!v) return
    const el = v.scrollDOM
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    el.scrollTop = ratio * max
  }

  function setLineNumbers(enabled: boolean) {
    view.value?.dispatch({
      effects: lineNumbersCompartment.reconfigure(enabled ? lineNumbers() : []),
    })
  }

  /** Scroll l'editeur a une ligne precise (1-indexe) et y place le curseur. */
  function scrollToLine(lineNum: number) {
    const v = view.value
    if (!v) return
    const totalLines = v.state.doc.lines
    const safeLine = Math.max(1, Math.min(lineNum, totalLines))
    const line = v.state.doc.line(safeLine)
    v.dispatch({
      selection: EditorSelection.cursor(line.from),
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 40 }),
    })
    v.focus()
  }

  return {
    view,
    docText,
    mount, destroy, focus,
    getText, setText,
    wrapSelection, prefixLine, insertBlock, insertAtCursor,
    getScrollRatio, setScrollRatio,
    setLineNumbers, scrollToLine,
  }
}
