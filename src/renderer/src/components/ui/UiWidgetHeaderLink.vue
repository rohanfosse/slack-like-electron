<script setup lang="ts">
  // Petit lien d'action ("Ouvrir", "Voir tout"…) destine au slot
  // `header-extra` de UiWidgetCard. Eradique le pattern duplique
  // .wlc-more / .wln-more / .wlmc-more / .wdf-chevron / etc.
  import { ChevronRight } from 'lucide-vue-next'

  withDefaults(defineProps<{
    label?: string
    ariaLabel?: string
  }>(), {
    label: 'Ouvrir',
  })

  const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
</script>

<template>
  <button
    type="button"
    class="uwhl"
    :aria-label="ariaLabel ?? label"
    @click="(ev) => emit('click', ev)"
  >
    {{ label }}<ChevronRight :size="12" />
  </button>
</template>

<style scoped>
.uwhl {
  background: none;
  border: none;
  color: var(--accent);
  font-family: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px var(--space-xs);
  border-radius: var(--radius-xs);
  transition: background var(--motion-fast) var(--ease-out);
}
.uwhl:hover { background: var(--bg-hover); }
.uwhl:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
