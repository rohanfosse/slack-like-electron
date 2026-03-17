<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import type { Component } from 'vue'

export interface ContextMenuItem {
  label:      string
  icon?:      Component
  action?:    () => void
  danger?:    boolean
  separator?: boolean   // si true, affiche un séparateur avant cet item
  disabled?:  boolean
}

const props = defineProps<{
  x:     number
  y:     number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{ close: [] }>()

const menuEl = ref<HTMLElement | null>(null)
// Position ajustée pour rester dans le viewport
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)

onMounted(async () => {
  await nextTick()
  if (!menuEl.value) return
  const rect = menuEl.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  adjustedX.value = props.x + rect.width  > vw ? props.x - rect.width  : props.x
  adjustedY.value = props.y + rect.height > vh ? props.y - rect.height  : props.y

  document.addEventListener('mousedown', onOutside, { capture: true })
  document.addEventListener('keydown',   onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside, { capture: true })
  document.removeEventListener('keydown',   onKey)
})

function onOutside(e: MouseEvent) {
  if (menuEl.value && !menuEl.value.contains(e.target as Node)) emit('close')
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function run(item: ContextMenuItem) {
  if (item.disabled) return
  item.action?.()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuEl"
      class="ctx-menu"
      :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
      role="menu"
    >
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.separator" class="ctx-separator" />
        <button
          class="ctx-item"
          :class="{ 'ctx-item--danger': item.danger, 'ctx-item--disabled': item.disabled }"
          role="menuitem"
          :tabindex="item.disabled ? -1 : 0"
          @click.stop="run(item)"
          @keydown.enter.stop="run(item)"
        >
          <component v-if="item.icon" :is="item.icon" :size="13" class="ctx-icon" />
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: var(--bg-secondary, #1e2025);
  border: 1px solid var(--border, rgba(255,255,255,.1));
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.3);
  display: flex;
  flex-direction: column;
  gap: 1px;
  animation: ctx-in .1s ease;
}

@keyframes ctx-in {
  from { opacity: 0; transform: scale(.96) translateY(-4px); }
  to   { opacity: 1; transform: none; }
}

.ctx-separator {
  height: 1px;
  background: var(--border, rgba(255,255,255,.08));
  margin: 3px 4px;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary, #ccc);
  font-family: var(--font, sans-serif);
  font-size: 13px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  transition: background .1s, color .1s;
  white-space: nowrap;
}
.ctx-item:hover:not(.ctx-item--disabled) {
  background: var(--bg-hover, rgba(255,255,255,.07));
  color: var(--text-primary, #fff);
}
.ctx-item--danger       { color: var(--color-danger, #e74c3c); }
.ctx-item--danger:hover { background: rgba(231,76,60,.12); }
.ctx-item--disabled     { opacity: .4; cursor: not-allowed; }

.ctx-icon { flex-shrink: 0; }
</style>
