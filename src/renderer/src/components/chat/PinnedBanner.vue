<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Pin, ChevronDown } from 'lucide-vue-next'
  import { useMessagesStore } from '@/stores/messages'
  import { renderMessageContent } from '@/utils/html'

  const store    = useMessagesStore()
  const expanded = ref(false)

  const hasPinned = computed(() => store.pinned.length > 0)
</script>

<template>
  <div v-if="hasPinned" class="pinned-messages-banner">
    <button class="pinned-header" :aria-expanded="expanded" @click="expanded = !expanded">
      <Pin :size="13" />
      <span>
        {{ store.pinned.length }} message{{ store.pinned.length > 1 ? 's' : '' }}
        épinglé{{ store.pinned.length > 1 ? 's' : '' }}
      </span>
      <!--
        Un seul chevron avec rotation CSS au lieu de v-if/v-else.
        Cela permet une transition fluide via transform.
      -->
      <ChevronDown :size="14" class="pinned-chevron" :class="{ rotated: expanded }" />
    </button>

    <Transition name="pinned-expand">
      <ul v-if="expanded" class="pinned-list">
        <li v-for="m in store.pinned" :key="m.id" class="pinned-item">
          <strong class="pinned-author">{{ m.author_name }}</strong>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="pinned-text" v-html="renderMessageContent(m.content)" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
/* Chevron rotatif (0° → 180° quand expanded) */
.pinned-chevron {
  margin-left: auto;
  flex-shrink: 0;
  transition: transform .2s cubic-bezier(.34,1.56,.64,1);
}
.pinned-chevron.rotated { transform: rotate(-180deg); }

/* Override : le header doit se comporter comme un bouton full-width */
.pinned-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  border: none;
  font-family: var(--font);
  font-size: 13px;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  padding: 8px 20px;
  transition: color var(--t-fast), background var(--t-fast);
}
.pinned-header:hover        { color: var(--text-primary); background: rgba(74,144,217,.05); }
.pinned-header:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 2px; }

/* Transition de dépliage (max-height trick) */
.pinned-expand-enter-active,
.pinned-expand-leave-active {
  transition: max-height var(--t-base) ease, opacity var(--t-fast);
  overflow: hidden;
}
.pinned-expand-enter-from,
.pinned-expand-leave-to   { max-height: 0;    opacity: 0; }
.pinned-expand-enter-to,
.pinned-expand-leave-from { max-height: 200px; opacity: 1; }
</style>
