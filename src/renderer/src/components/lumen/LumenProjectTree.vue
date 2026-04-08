<script setup lang="ts">
/**
 * Arborescence expandable d'un projet d'exemple. Construit un arbre
 * hierarchique a partir d'une liste plate de paths (style GitHub tree).
 * Navigation clavier : fleches + Enter. Emet `select(path)` quand un
 * fichier est choisi.
 */
import { computed, ref } from 'vue'
import {
  ChevronRight, File, FileCode, FileText, FileJson, Folder, FolderOpen, Image as ImageIcon,
} from 'lucide-vue-next'

interface TreeFile { path: string; size: number }
interface Props {
  files: TreeFile[]
  activePath: string | null
}
const props = defineProps<Props>()
const emit = defineEmits<(e: 'select', path: string) => void>()

// ── Construction de l'arbre ───────────────────────────────────────────────
interface TreeNode {
  name: string
  path: string
  isFile: boolean
  size: number
  children: TreeNode[]
}

const root = computed<TreeNode[]>(() => {
  const rootNodes: TreeNode[] = []
  for (const file of props.files) {
    const segments = file.path.split('/').filter(Boolean)
    let cursor = rootNodes
    for (let i = 0; i < segments.length; i++) {
      const name = segments[i]
      const isFile = i === segments.length - 1
      const fullPath = segments.slice(0, i + 1).join('/')
      let node = cursor.find(n => n.name === name)
      if (!node) {
        node = { name, path: fullPath, isFile, size: isFile ? file.size : 0, children: [] }
        cursor.push(node)
      }
      cursor = node.children
    }
  }
  sortTree(rootNodes)
  return rootNodes
})

// Dossiers en premier, puis fichiers, chacun par ordre alphabetique.
function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
    return a.name.localeCompare(b.name)
  })
  for (const n of nodes) if (!n.isFile) sortTree(n.children)
}

// Etat d'expansion par path de dossier. Dossiers de premier niveau
// ouverts par defaut pour que l'etudiant voie tout de suite le projet.
const expanded = ref<Set<string>>(new Set())
function initDefaultExpanded(nodes: TreeNode[], depth = 0) {
  for (const n of nodes) {
    if (!n.isFile && depth === 0) expanded.value.add(n.path)
  }
}
initDefaultExpanded(root.value)

function toggle(path: string) {
  const next = new Set(expanded.value)
  if (next.has(path)) next.delete(path); else next.add(path)
  expanded.value = next
}

// ── Flatten pour navigation clavier ───────────────────────────────────────
interface FlatEntry {
  node: TreeNode
  depth: number
}
const flatList = computed<FlatEntry[]>(() => {
  const out: FlatEntry[] = []
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const node of nodes) {
      out.push({ node, depth })
      if (!node.isFile && expanded.value.has(node.path)) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(root.value, 0)
  return out
})

function focusIndex(idx: number) {
  const entry = flatList.value[idx]
  if (!entry) return
  const el = rootRef.value?.querySelector<HTMLButtonElement>(`[data-tree-path="${CSS.escape(entry.node.path)}"]`)
  el?.focus()
}

const rootRef = ref<HTMLDivElement | null>(null)

function onKey(e: KeyboardEvent, entry: FlatEntry, idx: number) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusIndex(Math.min(flatList.value.length - 1, idx + 1))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusIndex(Math.max(0, idx - 1))
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (!entry.node.isFile) {
      if (!expanded.value.has(entry.node.path)) toggle(entry.node.path)
      else if (entry.node.children.length > 0) focusIndex(idx + 1)
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (!entry.node.isFile && expanded.value.has(entry.node.path)) {
      toggle(entry.node.path)
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (entry.node.isFile) emit('select', entry.node.path)
    else toggle(entry.node.path)
  }
}

function onItemClick(node: TreeNode) {
  if (node.isFile) emit('select', node.path)
  else toggle(node.path)
}

// ── Icones par extension ──────────────────────────────────────────────────
const CODE_EXTS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'go', 'rs', 'php', 'kt', 'swift', 'scala', 'sh', 'bash', 'zsh',
  'lua', 'r', 'dart', 'vue', 'svelte',
])
const DOC_EXTS  = new Set(['md', 'markdown', 'txt', 'rst', 'adoc'])
const JSON_EXTS = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'env'])
const IMG_EXTS  = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'])

function iconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (CODE_EXTS.has(ext)) return FileCode
  if (DOC_EXTS.has(ext))  return FileText
  if (JSON_EXTS.has(ext)) return FileJson
  if (IMG_EXTS.has(ext))  return ImageIcon
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<template>
  <div ref="rootRef" class="tree" role="tree" :aria-label="`Arborescence du projet d'exemple (${files.length} fichiers)`">
    <div v-if="flatList.length === 0" class="tree-empty">Projet vide.</div>
    <button
      v-for="(entry, idx) in flatList"
      :key="entry.node.path"
      type="button"
      class="tree-item"
      :class="{
        'tree-item--file': entry.node.isFile,
        'tree-item--folder': !entry.node.isFile,
        'tree-item--active': entry.node.isFile && activePath === entry.node.path,
      }"
      :style="{ paddingLeft: `${8 + entry.depth * 14}px` }"
      :role="entry.node.isFile ? 'treeitem' : 'treeitem'"
      :aria-expanded="entry.node.isFile ? undefined : expanded.has(entry.node.path)"
      :aria-selected="entry.node.isFile && activePath === entry.node.path"
      :aria-level="entry.depth + 1"
      :data-tree-path="entry.node.path"
      tabindex="0"
      :title="entry.node.path"
      @click="onItemClick(entry.node)"
      @keydown="(e) => onKey(e, entry, idx)"
    >
      <span class="tree-item-chevron">
        <ChevronRight
          v-if="!entry.node.isFile"
          :size="12"
          :class="{ 'tree-item-chevron--open': expanded.has(entry.node.path) }"
        />
      </span>
      <span class="tree-item-icon">
        <template v-if="entry.node.isFile">
          <component :is="iconFor(entry.node.name)" :size="13" />
        </template>
        <template v-else>
          <FolderOpen v-if="expanded.has(entry.node.path)" :size="13" />
          <Folder v-else :size="13" />
        </template>
      </span>
      <span class="tree-item-name">{{ entry.node.name }}</span>
      <span v-if="entry.node.isFile" class="tree-item-size">{{ formatSize(entry.node.size) }}</span>
    </button>
  </div>
</template>

<style scoped>
.tree {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  font-size: 13px;
  padding: 4px 0;
}

.tree-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 4px 8px 4px 8px;
  background: none;
  border: none;
  border-left: 2px solid transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  transition: background 120ms ease, color 120ms ease;
}
.tree-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.tree-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.tree-item--folder { font-weight: 600; color: var(--text-primary); }
.tree-item--active {
  background: var(--accent-subtle);
  color: var(--accent);
  border-left-color: var(--accent);
  font-weight: 600;
}

.tree-item-chevron {
  width: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 120ms ease;
}
.tree-item-chevron--open { transform: rotate(90deg); }

.tree-item-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
}
.tree-item--folder .tree-item-icon { color: var(--accent); }

.tree-item-name {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tree-item-size {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  padding-left: 6px;
  font-variant-numeric: tabular-nums;
}
</style>
