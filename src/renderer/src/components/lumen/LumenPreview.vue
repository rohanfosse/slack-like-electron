<script setup lang="ts">
import { ref, computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

interface Props {
  content: string
  title?: string
}

const props = defineProps<Props>()

const scrollEl = ref<HTMLDivElement | null>(null)

const html = computed(() => renderMarkdown(props.content))

// Indique si le contenu commence par un h1 markdown (# ...)
const startsWithH1 = computed(() => {
  const firstLine = props.content.split('\n').find(l => l.trim() !== '') ?? ''
  return /^#\s+/.test(firstLine.trim())
})

// Public API : sync scroll depuis l'editeur
function setScrollRatio(ratio: number) {
  const el = scrollEl.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  if (max <= 0) return
  el.scrollTop = ratio * max
}

function getScrollRatio(): number {
  const el = scrollEl.value
  if (!el) return 0
  const max = el.scrollHeight - el.clientHeight
  if (max <= 0) return 0
  return el.scrollTop / max
}

defineExpose({ setScrollRatio, getScrollRatio })
</script>

<template>
  <div ref="scrollEl" class="lumen-preview">
    <article class="lumen-preview-inner">
      <!-- Titre affiche seulement si le contenu markdown ne commence pas par un h1.
           Evite le double h1 si l'auteur met un titre + un # Titre dans le body. -->
      <p v-if="title && !startsWithH1" class="lumen-preview-title">{{ title }}</p>
      <div class="lumen-prose" v-html="html" />
      <div v-if="!content" class="lumen-preview-empty">
        <p>L'aperçu apparaîtra ici à mesure que tu écris.</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.lumen-preview {
  background: var(--bg-sidebar);
  overflow-y: auto;
  border-left: 1px solid var(--border);
  height: 100%;
}

.lumen-preview-inner {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 36px 120px;
}

.lumen-preview-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  line-height: 1.15;
  color: var(--text-primary);
}

.lumen-preview-empty {
  color: var(--text-muted);
  text-align: center;
  margin-top: 80px;
  font-size: var(--text-base);
}

/* ── Prose (markdown rendu) ─────────────────────────────────────────── */
.lumen-prose {
  font-size: var(--text-md);
  line-height: 1.7;
  color: var(--text-primary);
  font-family: var(--font);
}

.lumen-prose :deep(h1) {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 32px 0 14px;
  line-height: 1.2;
  color: var(--text-primary);
}
.lumen-prose :deep(h1):first-child { margin-top: 0; }

.lumen-prose :deep(h2) {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 28px 0 12px;
  line-height: 1.25;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}

.lumen-prose :deep(h3) {
  font-size: 17px;
  font-weight: 700;
  margin: 22px 0 10px;
  color: var(--text-primary);
}

.lumen-prose :deep(h4) {
  font-size: 15px;
  font-weight: 700;
  margin: 18px 0 8px;
  color: var(--text-secondary);
}

.lumen-prose :deep(p) { margin: 0 0 14px; }
.lumen-prose :deep(ul),
.lumen-prose :deep(ol) { margin: 0 0 14px; padding-left: 24px; }
.lumen-prose :deep(li) { margin: 4px 0; }
.lumen-prose :deep(li > ul),
.lumen-prose :deep(li > ol) { margin: 6px 0 0; }

.lumen-prose :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
.lumen-prose :deep(a:hover) { color: var(--accent-hover); }

.lumen-prose :deep(blockquote) {
  margin: 14px 0;
  padding: 8px 16px;
  border-left: 3px solid var(--accent);
  background: var(--accent-subtle);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
}
.lumen-prose :deep(blockquote p:last-child) { margin-bottom: 0; }

.lumen-prose :deep(code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.88em;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  background: var(--bg-elevated);
  border: 1px solid var(--border-input);
  color: var(--text-primary);
}

.lumen-prose :deep(pre.lumen-code) {
  margin: 14px 0;
  padding: 14px 18px;
  border-radius: var(--radius);
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-primary);
  overflow-x: auto;
  font-size: var(--text-sm);
  line-height: 1.6;
}
.lumen-prose :deep(pre.lumen-code code) {
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.lumen-prose :deep(table) {
  border-collapse: collapse;
  margin: 14px 0;
  width: 100%;
  font-size: var(--text-base);
}
.lumen-prose :deep(th),
.lumen-prose :deep(td) {
  padding: 8px 14px;
  border: 1px solid var(--border);
  text-align: left;
}
.lumen-prose :deep(th) {
  background: var(--bg-elevated);
  font-weight: 700;
  color: var(--text-primary);
}

.lumen-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 28px 0;
}

.lumen-prose :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 14px 0;
  display: block;
}
</style>
