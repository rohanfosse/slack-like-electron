/**
 * BentoCustomizer.vue - Widget picker avec toggles et drag-and-drop.
 * Affiche tous les widgets (actifs et inactifs) avec une section pour chaque etat.
 */
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { GripVertical, RotateCcw, X, Check, Plus, Eye, EyeOff } from 'lucide-vue-next'
import { useDraggable } from 'vue-draggable-plus'
import type { WidgetDef } from './registry'

const props = defineProps<{
  allWidgets: WidgetDef[]
  isVisible: (id: string) => boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  reorder: [widgets: WidgetDef[]]
  reset: []
  close: []
}>()

// Widgets actifs (pour le drag-and-drop)
const activeWidgets = computed(() =>
  props.allWidgets.filter(w => props.isVisible(w.id) && w.id !== 'live' && w.id !== 'promoActivity'),
)
const inactiveWidgets = computed(() =>
  props.allWidgets.filter(w => !props.isVisible(w.id) && w.id !== 'live' && w.id !== 'promoActivity'),
)

const localActive = ref([...activeWidgets.value])
watch(activeWidgets, (v) => { localActive.value = [...v] }, { deep: true })

const listRef = ref<HTMLElement | null>(null)

useDraggable(listRef, localActive, {
  handle: '.wpc-drag-handle',
  animation: 200,
  ghostClass: 'wpc-ghost',
  onEnd: () => emit('reorder', [...localActive.value]),
})

// Animation de la derniere action
const lastToggled = ref<string | null>(null)
function onToggle(id: string) {
  lastToggled.value = id
  emit('toggle', id)
  setTimeout(() => { lastToggled.value = null }, 400)
}
</script>

<template>
  <div class="wpc-panel" tabindex="-1">
    <!-- Header -->
    <div class="wpc-header">
      <h3 class="wpc-title">Personnaliser les widgets</h3>
      <div class="wpc-header-actions">
        <button class="wpc-btn-reset" title="Reinitialiser par defaut" @click="emit('reset')">
          <RotateCcw :size="11" /> Reinitialiser
        </button>
        <button class="wpc-btn-close" aria-label="Fermer" @click="emit('close')">
          <X :size="14" />
        </button>
      </div>
    </div>

    <p class="wpc-hint">Glissez pour reordonner. Cliquez pour activer/desactiver.</p>

    <!-- Section: Widgets actifs -->
    <div class="wpc-section">
      <div class="wpc-section-header">
        <Eye :size="13" />
        <span>Actifs</span>
        <span class="wpc-section-count">{{ localActive.length }}</span>
      </div>

      <div ref="listRef" class="wpc-grid">
        <div
          v-for="w in localActive"
          :key="w.id"
          class="wpc-card wpc-card--active"
          :class="{ 'wpc-card--just-toggled': lastToggled === w.id }"
        >
          <div class="wpc-drag-handle" title="Glisser pour reordonner">
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
            class="wpc-toggle-btn wpc-toggle--remove"
            title="Masquer ce widget"
            aria-label="Masquer le widget"
            @click="onToggle(w.id)"
          >
            <X :size="14" />
          </button>
        </div>
      </div>

      <p v-if="!localActive.length" class="wpc-empty">Aucun widget actif</p>
    </div>

    <!-- Section: Widgets disponibles -->
    <div v-if="inactiveWidgets.length" class="wpc-section">
      <div class="wpc-section-header">
        <EyeOff :size="13" />
        <span>Disponibles</span>
        <span class="wpc-section-count">{{ inactiveWidgets.length }}</span>
      </div>

      <div class="wpc-grid">
        <button
          v-for="w in inactiveWidgets"
          :key="w.id"
          class="wpc-card wpc-card--inactive"
          :class="{ 'wpc-card--just-toggled': lastToggled === w.id }"
          @click="onToggle(w.id)"
        >
          <div class="wpc-card-icon">
            <component :is="w.icon" :size="18" />
          </div>

          <div class="wpc-card-info">
            <span class="wpc-card-label">{{ w.label }}</span>
            <span class="wpc-card-desc">{{ w.description }}</span>
          </div>

          <span class="wpc-toggle-btn wpc-toggle--add">
            <Plus :size="14" />
          </span>
        </button>
      </div>
    </div>

    <!-- Tous actifs -->
    <p v-if="!inactiveWidgets.length" class="wpc-all-active">
      <Check :size="14" /> Tous les widgets sont actifs
    </p>
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
  margin-bottom: 4px;
}
.wpc-title {
  font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;
}
.wpc-header-actions { display: flex; gap: 6px; align-items: center; }
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
  font-size: 11px; color: var(--text-muted); margin: 0 0 12px;
}

/* Sections */
.wpc-section { margin-bottom: 14px; }
.wpc-section:last-child { margin-bottom: 0; }
.wpc-section-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 8px; padding-left: 2px;
}
.wpc-section-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; border-radius: 9px;
  background: rgba(74,144,217,.1); color: var(--accent);
  font-size: 10px; font-weight: 700; padding: 0 5px;
}

/* Grid */
.wpc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

/* Card base */
.wpc-card {
  display: flex; align-items: center; gap: 8px;
  padding: 10px; border-radius: 10px;
  border: 1px solid var(--border);
  transition: all .2s; font-family: var(--font);
}

/* Active card */
.wpc-card--active {
  background: var(--bg-main);
}
.wpc-card--active:hover { border-color: rgba(74,144,217,.2); }

/* Inactive card (clickable) */
.wpc-card--inactive {
  background: transparent;
  opacity: .55;
  cursor: pointer;
}
.wpc-card--inactive:hover {
  opacity: .85;
  border-color: rgba(74,144,217,.3);
  background: rgba(74,144,217,.03);
}

/* Toggle animation */
.wpc-card--just-toggled {
  animation: wpc-pop .3s ease;
}
@keyframes wpc-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

/* Drag handle */
.wpc-drag-handle {
  color: var(--text-muted); cursor: grab;
  display: flex; align-items: center;
  opacity: .25; transition: opacity .15s;
  flex-shrink: 0;
}
.wpc-drag-handle:active { cursor: grabbing; }
.wpc-card:hover .wpc-drag-handle { opacity: .6; }

/* Card icon */
.wpc-card-icon {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(74,144,217,.08); color: var(--accent);
  flex-shrink: 0;
}
.wpc-card--inactive .wpc-card-icon {
  background: rgba(255,255,255,.04); color: var(--text-muted);
}

/* Card info */
.wpc-card-info { flex: 1; min-width: 0; }
.wpc-card-label {
  display: block; font-size: 12px; font-weight: 600;
  color: var(--text-primary); line-height: 1.2;
}
.wpc-card-desc {
  display: block; font-size: 10px; color: var(--text-muted);
  line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Toggle buttons */
.wpc-toggle-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  border: none; cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.wpc-toggle--remove {
  background: rgba(239,68,68,.08); color: rgba(239,68,68,.5);
}
.wpc-toggle--remove:hover {
  background: rgba(239,68,68,.15); color: #ef4444;
  transform: scale(1.1);
}
.wpc-toggle--add {
  background: rgba(74,144,217,.08); color: var(--accent);
  pointer-events: none; /* Parent button handles click */
}
.wpc-card--inactive:hover .wpc-toggle--add {
  background: rgba(74,144,217,.15);
}

/* Empty / All active */
.wpc-empty {
  text-align: center; color: var(--text-muted); font-size: 12px;
  padding: 12px 0; margin: 0;
}
.wpc-all-active {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  color: #10b981; font-size: 12px; font-weight: 600;
  padding: 10px 0; margin: 0;
}

/* Ghost */
.wpc-ghost { opacity: .3; border: 1px dashed var(--accent); }

/* Mobile */
@media (max-width: 600px) {
  .wpc-grid { grid-template-columns: 1fr; }
}
</style>
