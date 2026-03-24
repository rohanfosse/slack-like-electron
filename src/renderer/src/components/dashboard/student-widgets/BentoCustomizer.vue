/**
 * BentoCustomizer.vue - Widget picker style Android.
 * Grille de widgets avec drag & drop pour reordonner et toggle pour activer/desactiver.
 */
<script setup lang="ts">
import { ref, watch } from 'vue'
import { GripVertical, RotateCcw, Plus, Minus, X } from 'lucide-vue-next'
import { useDraggable } from 'vue-draggable-plus'
import type { WidgetDef } from './registry'

const props = defineProps<{
  allWidgets: WidgetDef[]
  isVisible: (id: string) => boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  move: [id: string, direction: 'up' | 'down']
  reorder: [widgets: WidgetDef[]]
  reset: []
  close: []
}>()

const localWidgets = ref([...props.allWidgets])
watch(() => props.allWidgets, (v) => { localWidgets.value = [...v] }, { deep: true })

const listRef = ref<HTMLElement | null>(null)

useDraggable(listRef, localWidgets, {
  handle: '.wpc-drag-handle',
  animation: 200,
  ghostClass: 'wpc-ghost',
  onEnd: () => emit('reorder', [...localWidgets.value]),
})
</script>

<template>
  <div class="wpc-panel" tabindex="-1">
    <!-- Header -->
    <div class="wpc-header">
      <h3 class="wpc-title">Widgets</h3>
      <div class="wpc-header-actions">
        <button class="wpc-btn-reset" @click="emit('reset')">
          <RotateCcw :size="11" /> Réinitialiser
        </button>
        <button class="wpc-btn-close" @click="emit('close')">
          <X :size="14" />
        </button>
      </div>
    </div>

    <p class="wpc-hint">Glissez pour réordonner. Activez/désactivez les widgets.</p>

    <!-- Widget grid -->
    <div ref="listRef" class="wpc-grid">
      <div
        v-for="w in localWidgets"
        :key="w.id"
        class="wpc-card"
        :class="{ 'wpc-card--disabled': !isVisible(w.id) }"
      >
        <div class="wpc-drag-handle" title="Glisser pour réordonner">
          <GripVertical :size="14" />
        </div>

        <div class="wpc-card-icon">
          <component :is="w.icon" :size="18" />
        </div>

        <div class="wpc-card-info">
          <span class="wpc-card-label">{{ w.label }}</span>
          <span class="wpc-card-desc">{{ w.description }}</span>
        </div>

        <button
          class="wpc-toggle-btn"
          :class="{ active: isVisible(w.id) }"
          :title="isVisible(w.id) ? 'Masquer' : 'Afficher'"
          @click="emit('toggle', w.id)"
        >
          <Minus v-if="isVisible(w.id)" :size="14" />
          <Plus v-else :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wpc-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.15);
}

/* Header */
.wpc-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.wpc-title {
  font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;
}
.wpc-header-actions { display: flex; gap: 6px; }
.wpc-btn-reset {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; color: var(--accent);
  background: none; border: none; cursor: pointer; font-family: var(--font);
  padding: 4px 8px; border-radius: 6px; transition: background .15s;
}
.wpc-btn-reset:hover { background: rgba(74,144,217,.08); }
.wpc-btn-close {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; transition: all .15s;
}
.wpc-btn-close:hover { background: var(--bg-hover); color: var(--text-primary); }

.wpc-hint {
  font-size: 11px; color: var(--text-muted); margin: 0 0 10px;
}

/* Grid */
.wpc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

/* Card */
.wpc-card {
  display: flex; align-items: center; gap: 8px;
  padding: 10px; border-radius: 10px;
  background: var(--bg-main);
  border: 1px solid var(--border);
  transition: all .2s;
}
.wpc-card:hover { border-color: rgba(74,144,217,.2); }
.wpc-card--disabled { opacity: .4; }

.wpc-drag-handle {
  color: var(--text-muted); cursor: grab;
  display: flex; align-items: center;
  opacity: .3; transition: opacity .15s;
}
.wpc-drag-handle:active { cursor: grabbing; }
.wpc-card:hover .wpc-drag-handle { opacity: .7; }

.wpc-card-icon {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(74,144,217,.08); color: var(--accent);
  flex-shrink: 0;
}
.wpc-card--disabled .wpc-card-icon { background: rgba(255,255,255,.04); color: var(--text-muted); }

.wpc-card-info { flex: 1; min-width: 0; }
.wpc-card-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
.wpc-card-desc { display: block; font-size: 10px; color: var(--text-muted); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.wpc-toggle-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.wpc-toggle-btn.active {
  background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.2); color: #ef4444;
}
.wpc-toggle-btn:not(.active) {
  background: rgba(74,144,217,.1); border-color: rgba(74,144,217,.2); color: var(--accent);
}
.wpc-toggle-btn:hover { transform: scale(1.1); }

/* Ghost */
.wpc-ghost { opacity: .3; border: 1px dashed var(--accent); }

/* Mobile */
@media (max-width: 600px) {
  .wpc-grid { grid-template-columns: 1fr; }
}
</style>
