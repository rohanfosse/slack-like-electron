<script setup lang="ts">
import { computed } from 'vue'
import { ListTree } from 'lucide-vue-next'

interface Props {
  content: string
}
interface Emits {
  (e: 'navigate', line: number): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// Parse le markdown ligne par ligne pour extraire les headers.
// Ignore les headers dans les blocs de code (entre ```).
interface Heading {
  level: number
  text: string
  line: number  // 1-indexed
}

const headings = computed<Heading[]>(() => {
  const out: Heading[] = []
  const lines = props.content.split('\n')
  let inCode = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    const match = /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line)
    if (match) {
      out.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      })
    }
  }
  return out
})
</script>

<template>
  <aside class="lumen-outline">
    <header class="lumen-outline-head">
      <ListTree :size="13" />
      <span>Plan du cours</span>
    </header>
    <nav v-if="headings.length > 0" class="lumen-outline-nav">
      <button
        v-for="h in headings"
        :key="`${h.line}-${h.text}`"
        class="lumen-outline-item"
        :class="`lumen-outline-item--h${h.level}`"
        :title="h.text"
        @click="$emit('navigate', h.line)"
      >
        {{ h.text }}
      </button>
    </nav>
    <p v-else class="lumen-outline-empty">
      Ajoute des titres (# Titre) pour générer le plan.
    </p>
  </aside>
</template>

<style scoped>
.lumen-outline {
  width: 240px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lumen-outline-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.lumen-outline-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.lumen-outline-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  padding: 5px 16px;
  border-left: 2px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all var(--t-fast) ease;
}

.lumen-outline-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-left-color: var(--accent);
}
.lumen-outline-item:focus-visible {
  outline: var(--focus-ring);
  outline-offset: -2px;
}

.lumen-outline-item--h1 { font-weight: 700; color: var(--text-primary); }
.lumen-outline-item--h2 { padding-left: 26px; }
.lumen-outline-item--h3 { padding-left: 36px; font-size: 12px; }
.lumen-outline-item--h4 { padding-left: 46px; font-size: 12px; }
.lumen-outline-item--h5 { padding-left: 56px; font-size: 12px; color: var(--text-muted); }
.lumen-outline-item--h6 { padding-left: 66px; font-size: 12px; color: var(--text-muted); }

.lumen-outline-empty {
  padding: 24px 16px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-align: center;
  line-height: 1.5;
}
</style>
