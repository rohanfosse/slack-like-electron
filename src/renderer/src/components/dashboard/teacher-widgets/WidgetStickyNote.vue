/**
 * WidgetStickyNote.vue — Bloc-notes jaune perso du prof. Contenu
 * stocke en localStorage (jamais envoye au backend, jamais partage).
 * Debounce 1s pour eviter les ecritures excessives.
 */
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { StickyNote } from 'lucide-vue-next'

const STORAGE_KEY = 'teacher_sticky_note'
const MAX_CHARS = 2000

const content = ref<string>('')
const initialized = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) content.value = saved
  } catch { /* storage disabled */ }
  initialized.value = true
})

// Debounce 1s pour ne pas thrash localStorage
let persistTimer: ReturnType<typeof setTimeout> | null = null
watch(content, (newVal) => {
  if (!initialized.value) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, newVal.slice(0, MAX_CHARS))
    } catch { /* quota full */ }
  }, 1000)
})
</script>

<template>
  <div class="dashboard-card sa-card wsn-card">
    <div class="sa-card-header">
      <StickyNote :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Bloc-notes</span>
    </div>
    <textarea
      v-model="content"
      class="wsn-textarea"
      :maxlength="MAX_CHARS"
      placeholder="Note perso rapide… (sauvegarde auto, prive)"
      aria-label="Bloc-notes personnel"
      rows="6"
    />
  </div>
</template>

<style scoped>
.wsn-card {
  background: linear-gradient(135deg, rgba(255, 232, 141, 0.08) 0%, rgba(255, 214, 51, 0.04) 100%);
}

.wsn-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: 'Caveat', 'Comic Sans MS', cursive, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  margin-top: 8px;
  padding: 4px;
  box-sizing: border-box;
  min-height: 110px;
}
.wsn-textarea::placeholder {
  color: var(--text-muted);
  font-style: italic;
  font-family: inherit;
}
.wsn-textarea:focus {
  outline: none;
  background: rgba(255, 232, 141, 0.05);
  border-radius: 4px;
}
</style>
