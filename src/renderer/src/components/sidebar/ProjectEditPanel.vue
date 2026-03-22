/**
 * ProjectEditPanel - inline expandable panel for editing a project's metadata
 * (color, icon, name, date range). Appears below a project item in the sidebar.
 */
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { CATEGORY_ICONS } from '@/utils/categoryIcon'
import { PROJECT_COLORS, STORAGE_KEYS } from '@/constants'
import { useAppStore } from '@/stores/app'
import { Check, X } from 'lucide-vue-next'
import type { ProjectMeta } from '@/components/modals/NewProjectModal.vue'

const props = defineProps<{
  projectKey: string
  meta: ProjectMeta | null
  color: string
}>()

const emit = defineEmits<{
  save: [meta: ProjectMeta]
  cancel: []
}>()

const appStore = useAppStore()

const selectedColor = ref(props.color)
const selectedIcon  = ref('')
const nameVal       = ref('')
const startDate     = ref('')
const endDate       = ref('')
const wholeYear     = ref(false)

onMounted(() => {
  // Parse existing icon key from the project key (format: "iconKey Label")
  const spaceIdx = props.projectKey.indexOf(' ')
  if (spaceIdx > 0) {
    selectedIcon.value = props.projectKey.slice(0, spaceIdx)
    nameVal.value = props.meta?.name
      ? props.projectKey.slice(spaceIdx + 1)
      : props.projectKey.slice(spaceIdx + 1)
  } else {
    nameVal.value = props.projectKey
  }

  if (props.meta) {
    if (props.meta.emoji) selectedIcon.value = props.meta.emoji
    nameVal.value = props.meta.name
      ? props.projectKey.slice(props.projectKey.indexOf(' ') + 1) || props.meta.name
      : nameVal.value
    startDate.value = props.meta.startDate ?? ''
    endDate.value   = props.meta.endDate ?? ''
    wholeYear.value = props.meta.wholeYear ?? false
    if (props.meta.color) selectedColor.value = props.meta.color
  }
})

function save() {
  const iconKey = selectedIcon.value || ''
  const label = nameVal.value.trim()
  if (!label) return

  const fullName = iconKey ? `${iconKey} ${label}` : label
  const meta: ProjectMeta = {
    emoji:       iconKey,
    name:        fullName,
    description: props.meta?.description ?? '',
    startDate:   wholeYear.value ? '' : startDate.value,
    endDate:     wholeYear.value ? '' : endDate.value,
    wholeYear:   wholeYear.value,
    color:       selectedColor.value,
  }
  emit('save', meta)
}
</script>

<template>
  <div class="project-edit-panel">
    <!-- Color picker -->
    <div class="pep-section">
      <label class="pep-label">Couleur</label>
      <div class="pep-color-grid">
        <button
          v-for="c in PROJECT_COLORS"
          :key="c"
          class="pep-color-swatch"
          :class="{ active: selectedColor === c }"
          :style="{ background: c }"
          :title="c"
          @click="selectedColor = c"
        >
          <Check v-if="selectedColor === c" :size="10" style="color:#fff" />
        </button>
      </div>
    </div>

    <!-- Icon picker -->
    <div class="pep-section">
      <label class="pep-label">Icône</label>
      <div class="pep-icon-grid">
        <button
          v-for="ic in CATEGORY_ICONS"
          :key="ic.key"
          class="pep-icon-btn"
          :class="{ active: selectedIcon === ic.key }"
          :title="ic.label"
          @click="selectedIcon = ic.key"
        >
          <component :is="ic.component" :size="14" />
        </button>
      </div>
    </div>

    <!-- Name input -->
    <div class="pep-section">
      <label class="pep-label">Nom</label>
      <input
        v-model="nameVal"
        class="pep-input"
        placeholder="Nom du projet"
        @keydown.enter.prevent="save"
        @keydown.escape.prevent="emit('cancel')"
      />
    </div>

    <!-- Date range -->
    <div class="pep-section">
      <label class="pep-label">
        Période
        <label class="pep-checkbox-label">
          <input v-model="wholeYear" type="checkbox" class="pep-checkbox" />
          Toute l'année
        </label>
      </label>
      <div v-if="!wholeYear" class="pep-date-row">
        <input v-model="startDate" type="date" class="pep-input pep-date" />
        <span class="pep-date-sep">→</span>
        <input v-model="endDate" type="date" class="pep-input pep-date" />
      </div>
    </div>

    <!-- Actions -->
    <div class="pep-actions">
      <button class="pep-btn pep-btn-cancel" @click="emit('cancel')">
        <X :size="12" /> Annuler
      </button>
      <button class="pep-btn pep-btn-save" @click="save">
        <Check :size="12" /> Enregistrer
      </button>
    </div>
  </div>
</template>

<style scoped>
.project-edit-panel {
  background: var(--bg-secondary, rgba(0,0,0,.15));
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 4px 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pep-section { display: flex; flex-direction: column; gap: 3px; }

.pep-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pep-color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pep-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color .12s, transform .1s;
}
.pep-color-swatch:hover { transform: scale(1.15); }
.pep-color-swatch.active { border-color: #fff; }

.pep-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.pep-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background .12s, color .12s, border-color .12s;
}
.pep-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.pep-icon-btn.active {
  background: rgba(155,135,245,.15);
  color: var(--color-cctl, #9B87F5);
  border-color: var(--color-cctl, #9B87F5);
}

.pep-input {
  background: var(--bg-input, rgba(255,255,255,.07));
  border: 1px solid var(--border-input, var(--border));
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  font-family: var(--font);
  padding: 4px 7px;
  outline: none;
}
.pep-input:focus { border-color: var(--color-cctl, #9B87F5); box-shadow: 0 0 0 2px rgba(155,135,245,.2); }

.pep-date-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pep-date { flex: 1; min-width: 0; }
.pep-date-sep { color: var(--text-muted); font-size: 11px; }

.pep-checkbox-label {
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  color: var(--text-secondary);
}
.pep-checkbox { width: 12px; height: 12px; accent-color: var(--color-cctl, #9B87F5); }

.pep-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 2px;
}

.pep-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  font-size: 11px;
  font-family: var(--font);
  font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}

.pep-btn-cancel {
  background: transparent;
  color: var(--text-muted);
}
.pep-btn-cancel:hover { color: var(--text-primary); background: var(--bg-hover); }

.pep-btn-save {
  background: var(--color-cctl, #9B87F5);
  color: #fff;
}
.pep-btn-save:hover { filter: brightness(1.1); }
</style>
